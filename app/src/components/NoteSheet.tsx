import { useEffect, useRef, useState, type RefObject } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { resolveFontFamily } from '../design/fonts';
import { colors, radius, size, space, typography } from '../design/tokens';
import { useNoteDraftStore } from '../hooks/useNoteDraftStore';
import { isDraftEmpty, isNoteSubmittable, PAGE_MAX_LENGTH, type NoteDraft, type NoteKind } from '../lib/notes';
import { AppText } from './AppText';
import { BottomSheet } from './BottomSheet';
import { Button } from './Button';
import { LINE_GAP, QUOTE_LINE_WIDTH } from './Quote';
import { TextField } from './TextField';

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
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.form}>
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
                style={[
                  styles.tab,
                  selected
                    ? { backgroundColor: colors.accent, borderColor: colors.accent }
                    : { borderColor: colors.lineStrong },
                ]}
              >
                <AppText variant="label" style={{ color: selected ? colors.accentInk : colors.textSecondary }}>
                  {KIND_LABEL[kind]}
                </AppText>
              </Pressable>
            );
          })}
        </View>
        <TextField
          label="ページ"
          value={draft.page}
          onChangeText={(page) => patch({ page })}
          placeholder="なくても大丈夫"
          keyboardType="number-pad"
          maxLength={PAGE_MAX_LENGTH}
        />
        <View>
          <AppText variant="label" style={[styles.heading, { color: colors.textSecondary }]}>
            本文
          </AppText>
          <View style={styles.bodyRow}>
            {quote ? <View testID="quote-line" style={styles.line} /> : null}
            <TextInput
              accessibilityLabel="本文"
              multiline
              textAlignVertical="top"
              value={draft.text}
              onChangeText={(text) => patch({ text })}
              placeholderTextColor={colors.textTertiary}
              style={[
                styles.body,
                quote && styles.bodyQuote,
                {
                  fontFamily: resolveFontFamily(bodyType.fontFamily, bodyType.fontWeight),
                  fontSize: bodyType.fontSize,
                  lineHeight: bodyType.lineHeight,
                },
              ]}
            />
          </View>
        </View>
        {quote ? (
          <TextField
            label="ひとこと"
            optionalLabel
            value={draft.comment}
            onChangeText={(comment) => patch({ comment })}
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
            variant="outline"
            tone="danger"
            label="削除"
            disabled={busy}
            onPress={() => {
              setError(null);
              setConfirming(true);
            }}
          />
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  form: { gap: space[3] },
  tabs: { flexDirection: 'row', gap: space[2] },
  tab: {
    flex: 1,
    height: size.touchMin,
    borderWidth: 1,
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heading: { marginBottom: space[1] },
  bodyRow: { flexDirection: 'row' },
  line: { width: QUOTE_LINE_WIDTH, backgroundColor: colors.ribbon, marginRight: LINE_GAP },
  body: {
    flex: 1,
    minHeight: BODY_MIN_HEIGHT,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.card,
    paddingHorizontal: space[3],
    paddingTop: space[3],
    color: colors.textPrimary,
  },
  bodyQuote: { borderWidth: 0, backgroundColor: 'transparent', paddingHorizontal: 0 },
});
