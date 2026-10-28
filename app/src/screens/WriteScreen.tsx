import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { FreeField, OneLinerField, Starter } from '../components/Starter';
import { colors, radius, size, space } from '../design/tokens';
import { useBottomInset } from '../hooks/useBottomInset';
import { useRecordRepository } from '../hooks/useRecordRepository';
import { useTopInset } from '../hooks/useTopInset';
import { ONE_LINER_PROMPT } from '../lib/constants';
import {
  buildWriteInput,
  createCards,
  createFreeCard,
  hasAnythingToSave,
  isDraftBlank,
  isWritten,
  replaceUnwrittenCards,
  restoreCards,
  type WriteCard,
  type WriteDraft,
} from '../lib/writeSession';
import { useWriteDraftStore } from '../hooks/useWriteDraftStore';
import type { MediaRecord } from '../types/record';

const ERROR_SAVE = '保存できませんでした。もう一度お試しください';
const BAR_PADDING = space[4];

type WriteScreenProps = {
  recordId: string;
  onSaved?: (id: string) => void;
  onLater?: () => void;
  onBack?: () => void;
};

export function WriteScreen({ recordId, onSaved, onLater, onBack }: WriteScreenProps) {
  const bottomInset = useBottomInset();
  const topInset = useTopInset();
  const repository = useRecordRepository();
  const draftStore = useWriteDraftStore();
  const [record, setRecord] = useState<MediaRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [oneLiner, setOneLiner] = useState('');
  const [cards, setCards] = useState<WriteCard[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initialized = useRef(false);

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
          if (draft) {
            setOneLiner(draft.oneLiner);
            setCards(restoreCards(draft.cards, found.rating));
            setSelectedKey(draft.selectedKey);
          } else {
            setOneLiner(found.oneLiner ?? '');
            setCards(createCards(found.rating));
          }
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

  const patchCard = (key: string, patch: Partial<WriteCard>) => {
    setCards((current) => current.map((card) => (card.key === key ? { ...card, ...patch } : card)));
    setError(null);
  };

  const leave = useCallback(() => {
    const draft: WriteDraft = { oneLiner, cards, selectedKey };
    if (ready) {
      const store = isDraftBlank(draft) ? draftStore.clear(recordId) : draftStore.save(recordId, draft);
      void store.catch(() => undefined);
    }
    onLater?.();
  }, [oneLiner, cards, selectedKey, ready, draftStore, recordId, onLater]);

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
      const updated = await repository.update(recordId, buildWriteInput(record, { oneLiner, cards }));
      if (!updated) throw new Error('not found');
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

  const starterCards = cards.filter((card) => card.kind === 'starter');
  const freeCards = cards.filter((card) => card.kind === 'free');
  const writtenCount = starterCards.filter(isWritten).length;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, { paddingTop: topInset + space[2] }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="あとで" style={styles.later} onPress={leave}>
          <AppText variant="body" style={{ color: colors.textSecondary }}>
            あとで
          </AppText>
        </Pressable>
      </View>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.body,
          { paddingBottom: size.buttonHeight + BAR_PADDING * 2 + bottomInset + space[6] },
        ]}
      >
        <AppText variant="label" style={{ color: colors.ribbon }}>
          読み終えた
        </AppText>
        <AppText variant="bookTitle">{record.title}</AppText>
        {record.creator ? (
          <AppText variant="label" style={{ color: colors.textSecondary }}>
            {record.creator}
          </AppText>
        ) : null}
        <View style={styles.guide}>
          <AppText variant="sectionTitle">ヒントを選んで、続きを書こう</AppText>
          <AppText variant="label" style={{ color: colors.textSecondary }}>
            {`${writtenCount} / ${starterCards.length}`}
          </AppText>
        </View>
        <OneLinerField label={ONE_LINER_PROMPT} value={oneLiner} onChangeText={setOneLiner} />
        {starterCards.map((card) => (
          <Starter
            key={card.key}
            starter={card.starter}
            selected={selectedKey === card.key}
            text={card.text}
            onChangeText={(text) => patchCard(card.key, { text })}
            onSelect={() => setSelectedKey(card.key)}
          />
        ))}
        {freeCards.map((card) => (
          <FreeField
            key={card.key}
            value={card.text}
            onChangeText={(text) => patchCard(card.key, { text })}
          />
        ))}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="ほかのヒント"
          style={styles.action}
          onPress={() => setCards((current) => replaceUnwrittenCards(current, record.rating))}
        >
          <AppText variant="body" style={{ color: colors.textSecondary }}>
            ↻ ほかのヒント
          </AppText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="自由に書く"
          style={styles.action}
          onPress={() => setCards((current) => [...current, createFreeCard()])}
        >
          <AppText variant="body" style={{ color: colors.textSecondary }}>
            自由に書く
          </AppText>
        </Pressable>
        {error ? (
          <AppText variant="body" style={{ color: colors.danger }}>
            {error}
          </AppText>
        ) : null}
      </ScrollView>
      <View style={[styles.bar, { paddingBottom: BAR_PADDING + bottomInset }]}>
        <Button
          label="ここまでを残す"
          disabled={saving || !hasAnythingToSave(oneLiner, cards)}
          onPress={() => void submit()}
        />
      </View>
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
  header: { paddingHorizontal: space[4], paddingBottom: space[2], alignItems: 'flex-start' },
  later: { minHeight: size.touchMin, minWidth: size.touchMin, justifyContent: 'center' },
  body: { paddingHorizontal: space[5], gap: space[3] },
  guide: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: space[2],
  },
  action: {
    minHeight: size.touchMin,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.button,
  },
  bar: {
    paddingTop: BAR_PADDING,
    paddingHorizontal: space[5],
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
});
