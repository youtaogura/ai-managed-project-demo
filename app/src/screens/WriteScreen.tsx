import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type ComponentRef } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { Hint } from '../components/Hint';
import { resolveFontFamily } from '../design/fonts';
import { colors, radius, size, space, typography } from '../design/tokens';
import { useBottomInset } from '../hooks/useBottomInset';
import { useKeyboardVisible } from '../hooks/useKeyboardVisible';
import { useRecordRepository } from '../hooks/useRecordRepository';
import { useTopInset } from '../hooks/useTopInset';
import { useWriteDraftStore } from '../hooks/useWriteDraftStore';
import { formatMonthDay } from '../lib/date';
import { pickOtherHints } from '../lib/hints';
import { appendHint, buildWriteInput, isUnchanged, restoreHints, type WriteDraft } from '../lib/writeSession';
import type { MediaRecord } from '../types/record';

const ERROR_SAVE = '保存できませんでした。もう一度お試しください';
const ONE_LINER_LABEL = 'この本をひとことで';
const MEMO_LABEL = '読後メモ';
const MEMO_NOTE = '思ったことを、そのまま';
const HINT_HEADING = 'ヒント（押すと、最後に改行して入ります）';
const BAR_PADDING = space[4];
// 読後メモの入力欄は 10 行ぶん（write.png の大きな欄）
const MEMO_MIN_LINES = 10;

function serif(variant: 'reading' | 'oneLine') {
  const t = typography[variant];
  return {
    fontFamily: resolveFontFamily(t.fontFamily, t.fontWeight),
    fontSize: t.fontSize,
    lineHeight: t.lineHeight,
  };
}

type WriteScreenProps = {
  recordId: string;
  onSaved?: (id: string) => void;
  onLater?: () => void;
  onBack?: () => void;
};

type HintRowProps = {
  hints: readonly string[];
  usedHints: readonly string[];
  onInsert: (hint: string) => void;
  onSwap: () => void;
  /** キーボードの上に出すとき。ヒントを横に並べてスクロールする */
  docked?: boolean;
};

function HintRow({ hints, usedHints, onInsert, onSwap, docked = false }: HintRowProps) {
  const chips = hints.map((hint) => (
    <Hint key={hint} text={hint} used={usedHints.includes(hint)} onPress={() => onInsert(hint)} />
  ));
  return (
    <View style={styles.hintSection} testID={docked ? 'write-hints-docked' : 'write-hints'}>
      <View style={styles.hintHeader}>
        <AppText variant="value" style={styles.hintHeading}>
          {HINT_HEADING}
        </AppText>
        <Pressable accessibilityRole="button" accessibilityLabel="ほかのヒント" style={styles.swap} onPress={onSwap}>
          <AppText variant="label" style={styles.secondary}>
            ↻ ほかのヒント
          </AppText>
        </Pressable>
      </View>
      {docked ? (
        <ScrollView
          horizontal
          keyboardShouldPersistTaps="always"
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.hintScroll}
        >
          {chips}
        </ScrollView>
      ) : (
        <View style={styles.hintStack}>{chips}</View>
      )}
    </View>
  );
}

export function WriteScreen({ recordId, onSaved, onLater, onBack }: WriteScreenProps) {
  const bottomInset = useBottomInset();
  const topInset = useTopInset();
  const keyboardVisible = useKeyboardVisible();
  const repository = useRecordRepository();
  const draftStore = useWriteDraftStore();
  const [record, setRecord] = useState<MediaRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [oneLiner, setOneLiner] = useState('');
  const [text, setText] = useState('');
  const [hints, setHints] = useState<string[]>([]);
  const [usedHints, setUsedHints] = useState<string[]>([]);
  const [memoFocused, setMemoFocused] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initialized = useRef(false);
  const memoInput = useRef<ComponentRef<typeof TextInput>>(null);
  const moveCursorToEnd = useRef(false);

  // 開いたときに 1 回だけ、記録と下書きを読んで初期状態を作る
  useFocusEffect(
    useCallback(() => {
      if (initialized.current) return;
      let active = true;
      const load = async () => {
        const all = await repository.getAll().catch(() => [] as MediaRecord[]);
        const found = all.find((r) => r.id === recordId) ?? null;
        const draft = found ? await draftStore.load(recordId).catch(() => null) : null;
        if (!active) return;
        initialized.current = true;
        setRecord(found);
        if (found) {
          setOneLiner(draft ? draft.oneLiner : (found.oneLiner ?? ''));
          setText(draft ? draft.text : '');
          setHints(restoreHints(draft?.hints ?? [], found.rating));
          setUsedHints(draft?.usedHints ?? []);
        }
        setLoading(false);
        setReady(true);
      };
      void load();
      return () => {
        active = false;
      };
    }, [repository, draftStore, recordId]),
  );

  // ヒントを入れたあと、文章が画面に反映されてからカーソルを最後へ動かす
  useEffect(() => {
    if (!moveCursorToEnd.current) return;
    moveCursorToEnd.current = false;
    const input = memoInput.current;
    input?.focus();
    if (typeof input?.setSelection === 'function') input.setSelection(text.length, text.length);
  }, [text]);

  const insertHint = (hint: string) => {
    moveCursorToEnd.current = true;
    setText((current) => appendHint(current, hint));
    setUsedHints((current) => (current.includes(hint) ? current : [...current, hint]));
    setError(null);
  };

  const swapHints = () => {
    if (!record) return;
    setHints((current) => pickOtherHints(current, record.rating));
  };

  const leave = useCallback(() => {
    if (ready && record) {
      const draft: WriteDraft = { oneLiner, text, hints, usedHints };
      const store = isUnchanged(record, draft) ? draftStore.clear(recordId) : draftStore.save(recordId, draft);
      void store.catch(() => undefined);
    }
    onLater?.();
  }, [ready, record, oneLiner, text, hints, usedHints, draftStore, recordId, onLater]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      leave();
      return true;
    });
    return () => sub.remove();
  }, [leave]);

  const submit = async () => {
    if (!record) return;
    setSaving(true);
    setError(null);
    try {
      if (!isUnchanged(record, { oneLiner, text })) {
        const updated = await repository.update(recordId, buildWriteInput(record, { oneLiner, text }));
        if (!updated) throw new Error('not found');
      }
      await draftStore.clear(recordId).catch(() => undefined);
      onSaved?.(recordId);
    } catch {
      setError(ERROR_SAVE);
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center} accessibilityLabel="読み込み中">
        <ActivityIndicator />
      </View>
    );
  }

  if (!record) {
    return (
      <View style={styles.center}>
        <AppText variant="sectionTitle">本が見つかりません</AppText>
        <Button label="本棚へ戻る" onPress={() => (onBack ?? onLater)?.()} />
      </View>
    );
  }

  const finishedOn = record.endDate ? formatMonthDay(record.endDate) : null;
  // キーボードを開いて読後メモを書いているあいだは、ヒントの行をキーボードのすぐ上に出す
  const docked = keyboardVisible && memoFocused;
  const hintRow = (
    <HintRow hints={hints} usedHints={usedHints} onInsert={insertHint} onSwap={swapHints} docked={docked} />
  );

  return (
    <KeyboardAvoidingView style={styles.container} behavior="padding">
      <View style={[styles.header, { paddingTop: topInset + space[2] }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="あとで" style={styles.later} onPress={leave}>
          <AppText variant="body" style={styles.secondary}>
            あとで
          </AppText>
        </Pressable>
        {finishedOn ? (
          <AppText variant="body" style={styles.secondary}>
            {`読了 ${finishedOn}`}
          </AppText>
        ) : null}
      </View>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.body,
          { paddingBottom: docked ? space[6] : size.buttonHeight + BAR_PADDING * 2 + bottomInset + space[6] },
        ]}
      >
        <View style={styles.titleBlock}>
          <AppText variant="sectionTitle" style={styles.secondary}>
            読後メモを書く
          </AppText>
          <AppText variant="bookTitle">{record.title}</AppText>
          {record.creator ? (
            <AppText variant="label" style={styles.secondary}>
              {record.creator}
            </AppText>
          ) : null}
        </View>
        <View style={styles.field}>
          <AppText variant="value" style={styles.secondary}>
            {ONE_LINER_LABEL}
          </AppText>
          <TextInput
            accessibilityLabel={ONE_LINER_LABEL}
            multiline
            textAlignVertical="top"
            value={oneLiner}
            onChangeText={(value) => {
              setOneLiner(value);
              setError(null);
            }}
            style={[styles.input, styles.oneLinerInput, serif('oneLine')]}
          />
        </View>
        <View style={styles.field}>
          <View style={styles.memoHeader}>
            <AppText variant="value" style={styles.secondary}>
              {MEMO_LABEL}
            </AppText>
            <AppText variant="label" style={styles.tertiary}>
              {MEMO_NOTE}
            </AppText>
          </View>
          <TextInput
            ref={memoInput}
            accessibilityLabel={MEMO_LABEL}
            multiline
            textAlignVertical="top"
            value={text}
            onChangeText={(value) => {
              setText(value);
              setError(null);
            }}
            onFocus={() => setMemoFocused(true)}
            onBlur={() => setMemoFocused(false)}
            style={[
              styles.input,
              styles.memoInput,
              serif('reading'),
              memoFocused && styles.inputFocused,
            ]}
          />
        </View>
        {docked ? null : hintRow}
        {error ? (
          <AppText variant="body" style={{ color: colors.danger }}>
            {error}
          </AppText>
        ) : null}
      </ScrollView>
      {docked ? (
        <View style={styles.keyboardBar}>{hintRow}</View>
      ) : (
        <View style={[styles.bar, { paddingBottom: BAR_PADDING + bottomInset }]}>
          <Button label="残す" disabled={saving} onPress={() => void submit()} />
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[4],
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space[5],
  },
  later: { minHeight: size.touchMin, minWidth: size.touchMin, justifyContent: 'center' },
  secondary: { color: colors.textSecondary },
  tertiary: { color: colors.textTertiary },
  body: { paddingHorizontal: space[5], gap: space[4] },
  titleBlock: { gap: space[1], marginTop: space[2], marginBottom: space[2] },
  field: { gap: space[2] },
  memoHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  input: {
    backgroundColor: colors.surface1,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.card,
    paddingHorizontal: space[4],
    color: colors.textPrimary,
  },
  oneLinerInput: { minHeight: size.touchMin, paddingVertical: space[2] },
  memoInput: {
    minHeight: typography.reading.lineHeight * MEMO_MIN_LINES,
    paddingTop: space[3],
    paddingBottom: space[3],
  },
  inputFocused: { borderColor: colors.accent },
  // 見出しの行は「ほかのヒント」の押せる高さ（44）があるので、間を空けずにヒントを続ける
  hintSection: {},
  hintHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[2] },
  hintHeading: { color: colors.textSecondary, flexShrink: 1 },
  swap: { minHeight: size.touchMin, justifyContent: 'center' },
  hintStack: { gap: space[2], alignItems: 'flex-start' },
  hintScroll: { gap: space[2] },
  keyboardBar: {
    paddingTop: space[2],
    paddingBottom: space[2],
    paddingHorizontal: space[5],
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  bar: {
    paddingTop: BAR_PADDING,
    paddingHorizontal: space[5],
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
});
