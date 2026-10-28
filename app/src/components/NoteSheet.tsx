import { useEffect, useRef, useState, type ReactNode, type ComponentRef, type Ref, type RefObject } from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  View,
} from 'react-native';

import { resolveFontFamily } from '../design/fonts';
import { colors, radius, size, space, typography } from '../design/tokens';
import { useNoteDraftStore } from '../hooks/useNoteDraftStore';
import { isDraftEmpty, isNoteSubmittable, PAGE_MAX_LENGTH, type NoteDraft, type NoteKind } from '../lib/notes';
import { AppText } from './AppText';
import { BottomSheet, SLIDE_DURATION } from './BottomSheet';
import { Button } from './Button';
import { LINE_GAP, QUOTE_LINE_WIDTH } from './Quote';

type TextInputHandle = ComponentRef<typeof TextInput>;

const ERROR_SAVE = '保存できませんでした。もう一度お試しください';
const ERROR_DELETE = '削除できませんでした。もう一度お試しください';
const KIND_LABEL: Record<NoteKind, string> = { memo: 'メモ', quote: '引用' };
const KINDS: readonly NoteKind[] = ['memo', 'quote'];
const BODY_MIN_HEIGHT = 120;

const EMPTY_DRAFT: NoteDraft = { kind: 'memo', page: '', text: '', comment: '' };

export type NoteSheetProps = {
  visible: boolean;
  /** 本のタイトル（シートの見出し） */
  bookTitle: string;
  /** 下書きの保存先の記録 ID */
  recordId: string;
  /** 編集モードのときの初期値。無ければ新規 */
  editing?: NoteDraft;
  onSubmit: (draft: NoteDraft) => Promise<void>;
  /** 編集モードの削除。無ければ削除ボタンを出さない */
  onDelete?: () => Promise<void>;
  onClose: () => void;
};

export function NoteSheet({ visible, onClose, ...rest }: NoteSheetProps) {
  // 閉じる・背景タップ・スワイプのどれでも、フォームが下書きを保存してから閉じる
  const closeRef = useRef<(() => void) | null>(null);
  return (
    <BottomSheet
      visible={visible}
      onClose={() => (closeRef.current ?? onClose)()}
      title={rest.bookTitle}
      showCloseButton
      closeInTitleRow
    >
      {visible ? <Form {...rest} onClose={onClose} closeRef={closeRef} /> : null}
    </BottomSheet>
  );
}

type FormProps = Omit<NoteSheetProps, 'visible'> & { closeRef: RefObject<(() => void) | null> };

function Form({ recordId, editing, onSubmit, onDelete, onClose, closeRef }: FormProps) {
  const draftStore = useNoteDraftStore();
  const isEdit = editing !== undefined;
  const [ready, setReady] = useState(isEdit);
  const [draft, setDraft] = useState<NoteDraft>(editing ?? EMPTY_DRAFT);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const bodyRef = useRef<TextInputHandle>(null);
  // 編集で開いたときだけ、最初にカーソルを本文の末尾へ置く（以降はユーザーが動かせる）
  const [initialSelection, setInitialSelection] = useState<{ start: number; end: number } | undefined>(
    editing ? { start: editing.text.length, end: editing.text.length } : undefined,
  );

  // シートが出る動きのあとに本文の欄へフォーカスする（autoFocus だと動きの途中で当たる）
  useEffect(() => {
    if (!ready || confirming) return;
    const timer = setTimeout(() => bodyRef.current?.focus(), SLIDE_DURATION);
    return () => clearTimeout(timer);
  }, [ready, confirming]);

  const kind = draft.kind;
  const prevKind = useRef(kind);
  useEffect(() => {
    if (prevKind.current === kind) return;
    prevKind.current = kind;
    bodyRef.current?.focus();
  }, [kind]);

  useEffect(() => {
    if (isEdit) return;
    let active = true;
    draftStore
      .load(recordId)
      .catch(() => null)
      .then((loaded) => {
        if (!active) return;
        if (loaded) setDraft(loaded);
        setReady(true);
      });
    return () => {
      active = false;
    };
  }, [draftStore, recordId, isEdit]);

  const patch = (next: Partial<NoteDraft>) => {
    setDraft((d) => ({ ...d, ...next }));
    setError(null);
  };

  const close = () => {
    if (!isEdit && ready) {
      const save = isDraftEmpty(draft) ? draftStore.clear(recordId) : draftStore.save(recordId, draft);
      void save.catch(() => undefined);
    }
    onClose();
  };

  useEffect(() => {
    closeRef.current = close;
    return () => {
      closeRef.current = null;
    };
  });

  const submit = async () => {
    setBusy(true);
    try {
      await onSubmit({ ...draft, comment: draft.kind === 'quote' ? draft.comment : '' });
      if (!isEdit) await draftStore.clear(recordId).catch(() => undefined);
      onClose();
    } catch {
      setError(ERROR_SAVE);
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!onDelete) return;
    setBusy(true);
    try {
      await onDelete();
      onClose();
    } catch {
      setError(ERROR_DELETE);
      setConfirming(false);
      setBusy(false);
    }
  };

  if (!ready) return null;

  if (confirming) {
    return (
      <View style={styles.form}>
        <AppText variant="sectionTitle">{`この${KIND_LABEL[editing?.kind ?? draft.kind]}を削除しますか？`}</AppText>
        {error ? (
          <AppText variant="body" style={{ color: colors.danger }}>
            {error}
          </AppText>
        ) : null}
        <Button variant="outline" label="キャンセル" disabled={busy} onPress={() => setConfirming(false)} />
        <Button variant="outline" tone="danger" label="削除する" disabled={busy} onPress={() => void remove()} />
      </View>
    );
  }

  const quote = draft.kind === 'quote';
  const bodyType = quote ? typography.quote : typography.body;
  const bodyFont = {
    fontFamily: resolveFontFamily(bodyType.fontFamily, bodyType.fontWeight),
    fontSize: bodyType.fontSize,
    lineHeight: bodyType.lineHeight,
  };
  return (
    <View style={styles.form}>
      {isEdit ? <AppText variant="sectionTitle">{`${KIND_LABEL[draft.kind]}を直す`}</AppText> : null}
      <View accessibilityRole="tablist" style={styles.tabs}>
        {KINDS.map((kind) => {
          const selected = draft.kind === kind;
          return (
            <Pressable
              key={kind}
              accessibilityRole="tab"
              accessibilityLabel={KIND_LABEL[kind]}
              accessibilityState={{ selected }}
              onPress={() => patch({ kind })}
              style={[styles.tab, selected && styles.tabSelected]}
            >
              <AppText variant="button" style={{ color: selected ? colors.textPrimary : colors.textSecondary }}>
                {KIND_LABEL[kind]}
              </AppText>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.pageRow}>
        <AppText variant="value">ページ</AppText>
        <FocusInput
          accessibilityLabel="ページ"
          value={draft.page}
          onChangeText={(page) => patch({ page })}
          keyboardType="number-pad"
          maxLength={PAGE_MAX_LENGTH}
          style={[styles.pageInput, bodyFontOf(typography.body)]}
        />
        <AppText variant="label" style={{ color: colors.textTertiary }}>
          なくても大丈夫
        </AppText>
      </View>
      <FocusInput
        ref={bodyRef}
        accessibilityLabel="本文"
        selection={initialSelection}
        onSelectionChange={() => setInitialSelection(undefined)}
        wrap
        multiline
        textAlignVertical="top"
        value={draft.text}
        onChangeText={(text) => patch({ text })}
        placeholderTextColor={colors.textTertiary}
        leading={quote ? <View testID="quote-line" style={styles.line} /> : null}
        style={[styles.body, quote && styles.bodyQuote, bodyFont]}
      />
      {quote ? (
        <FocusInput
          accessibilityLabel="ひとこと"
          placeholder="ひとこと（任意）"
          value={draft.comment}
          onChangeText={(comment) => patch({ comment })}
          style={[styles.comment, bodyFontOf(typography.body)]}
        />
      ) : null}
      {error ? (
        <AppText variant="body" style={{ color: colors.danger }}>
          {error}
        </AppText>
      ) : null}
      <Button
        label={isEdit ? '保存する' : '残す'}
        disabled={busy || !isNoteSubmittable(draft)}
        onPress={() => void submit()}
      />
      {isEdit && onDelete ? (
        <Button
          variant="text"
          tone="danger"
          label="削除"
          disabled={busy}
          onPress={() => {
            setError(null);
            setConfirming(true);
          }}
        />
      ) : null}
    </View>
  );
}

function bodyFontOf(t: { fontFamily: string; fontWeight: string; fontSize: number }) {
  return { fontFamily: resolveFontFamily(t.fontFamily, t.fontWeight), fontSize: t.fontSize };
}

export type FocusInputProps = Omit<TextInputProps, 'style'> & { style: StyleProp<TextStyle>; leading?: ReactNode;
  /** true なら leading が無くても View で包み、入力欄を作り直さない */
  wrap?: boolean;
  ref?: Ref<TextInputHandle>;
};

/** フォーカス中は枠が墨色になる入力欄。leading は枠の内側の左に置く（引用の朱の線） */
export function FocusInput({ style, leading, wrap, ref, onFocus, onBlur, ...props }: FocusInputProps) {
  const [focused, setFocused] = useState(false);
  const input = (
    <TextInput
      placeholderTextColor={colors.textTertiary}
      {...props}
      ref={ref}
      onFocus={(e) => {
        setFocused(true);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        onBlur?.(e);
      }}
      style={[styles.field, style, { borderColor: focused ? colors.textPrimary : colors.line }]}
    />
  );
  if (!leading && !wrap) return input;
  return (
    <View>
      {input}
      {leading ? (
        <View pointerEvents="none" style={styles.leading}>
          {leading}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: space[3] },
  tabs: { flexDirection: 'row', padding: space[1], backgroundColor: colors.surface2, borderRadius: radius.card },
  tab: {
    flex: 1,
    height: size.touchMin,
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabSelected: { backgroundColor: colors.surface1 },
  pageRow: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  pageInput: { minWidth: size.touchMin * 2, height: size.touchMin, paddingHorizontal: space[3] },
  field: {
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderRadius: radius.card,
    color: colors.textPrimary,
  },
  body: { minHeight: BODY_MIN_HEIGHT, paddingHorizontal: space[3], paddingTop: space[3] },
  bodyQuote: { paddingLeft: space[3] + QUOTE_LINE_WIDTH + LINE_GAP },
  comment: { minHeight: size.buttonHeight, paddingHorizontal: space[3] },
  leading: { position: 'absolute', left: space[3], top: space[3], bottom: space[3], width: QUOTE_LINE_WIDTH },
  line: { flex: 1, width: QUOTE_LINE_WIDTH, backgroundColor: colors.ribbon },
});
