import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '../components/AppText';
import { ChipGroup } from '../components/Chip';
import { ScreenContainer } from '../components/ScreenContainer';
import { ScreenHeaderBar } from '../components/ScreenHeaderBar';
import { StarterDeleteSheet } from '../components/StarterDeleteSheet';
import { StarterEditSheet } from '../components/StarterEditSheet';
import { Toggle, ToggleRow } from '../components/Toggle';
import { colors, radius, size, space } from '../design/tokens';
import { useBottomInset } from '../hooks/useBottomInset';
import { useStarterSettings } from '../hooks/useStarterSettings';
import { STARTER_COUNT_OPTIONS, STARTER_FIXED } from '../lib/constants';
import {
  addStarterItem,
  createStarterId,
  removeStarterItem,
  renameStarterItem,
  setStarterItemEnabled,
  validateStarterText,
} from '../lib/starterItems';
import type { StarterItem } from '../types/starter';

const COUNT_CHIPS = STARTER_COUNT_OPTIONS.map((n) => ({ value: String(n), label: String(n) }));

// 追加（'new'）・編集（項目の id）のシート。閉じているときは null
type Editing = 'new' | string | null;

function Badge({ label }: { label: string }) {
  return (
    <View style={styles.badge}>
      <AppText variant="micro" style={{ color: colors.textSecondary }}>
        {label}
      </AppText>
    </View>
  );
}

export function StartersScreen() {
  const bottomInset = useBottomInset();
  const { starterSettings, update } = useStarterSettings();
  const { items } = starterSettings;
  const [editing, setEditing] = useState<Editing>(null);
  const [error, setError] = useState<string | undefined>(undefined);
  const [deleting, setDeleting] = useState<StarterItem | null>(null);

  const editingItem = items.find((item) => item.id === editing && item.custom) ?? null;
  const sheetOpen = editing === 'new' || editingItem !== null;

  const closeEdit = () => {
    setEditing(null);
    setError(undefined);
  };

  const onSubmit = (text: string) => {
    const exceptId = editingItem ? editingItem.id : undefined;
    const result = validateStarterText(text, items, exceptId);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    update({
      items: editingItem
        ? renameStarterItem(items, editingItem.id, result.text)
        : addStarterItem(items, result.text, createStarterId()),
    });
    closeEdit();
  };

  return (
    <ScreenContainer>
      <ScreenHeaderBar title="書き出し" onClose={() => router.back()} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: space[6] + bottomInset }]}>
        <View style={styles.card}>
          <ToggleRow
            label="読み終えたら書き出しを出す"
            description="オフにすると、自由に書く欄だけになります。続きを書くと、ひと続きの文章として残ります"
            value={starterSettings.enabled}
            onValueChange={(enabled) => update({ enabled })}
          />
        </View>
        <View style={styles.countRow}>
          <AppText variant="body">一度に出す数</AppText>
          <View style={styles.chips}>
            <ChipGroup
              label="一度に出す数"
              compact
              options={COUNT_CHIPS}
              value={String(starterSettings.count)}
              onChange={(value) => {
                const count = STARTER_COUNT_OPTIONS.find((n) => String(n) === value);
                if (count) update({ count });
              }}
            />
          </View>
        </View>
        <AppText variant="label" style={{ color: colors.textSecondary }}>
          出す書き出し（オンのものからランダムに）
        </AppText>
        <View>
          <View style={styles.itemRow}>
            <View style={styles.itemText}>
              <AppText variant="starter">{STARTER_FIXED}</AppText>
              <Badge label="固定" />
            </View>
            <Toggle small disabled value label={STARTER_FIXED} onValueChange={() => undefined} />
          </View>
          {items.map((item) => (
            <View key={item.id} style={styles.itemRow}>
              <StarterText item={item} onEdit={() => setEditing(item.id)} />
              <Toggle
                small
                value={item.enabled}
                label={item.text}
                onValueChange={(enabled) => update({ items: setStarterItemEnabled(items, item.id, enabled) })}
              />
            </View>
          ))}
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setError(undefined);
            setEditing('new');
          }}
          style={styles.addButton}
        >
          <AppText variant="button" style={{ color: colors.textSecondary }}>
            ＋ 自分の書き出しを追加
          </AppText>
        </Pressable>
      </ScrollView>
      <StarterEditSheet
        visible={sheetOpen}
        initialText={editingItem ? editingItem.text : null}
        error={error}
        onSubmit={onSubmit}
        onDelete={() => {
          setDeleting(editingItem);
          closeEdit();
        }}
        onClose={closeEdit}
      />
      <StarterDeleteSheet
        visible={deleting !== null}
        text={deleting ? deleting.text : ''}
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) update({ items: removeStarterItem(items, deleting.id) });
          setDeleting(null);
        }}
      />
    </ScreenContainer>
  );
}

function StarterText({ item, onEdit }: { item: StarterItem; onEdit: () => void }) {
  const color = item.enabled ? colors.textPrimary : colors.textTertiary;
  const body = (
    <>
      <AppText variant="starter" style={{ color }}>
        {item.text}
      </AppText>
      {item.custom ? <Badge label="自分で追加" /> : null}
    </>
  );
  if (!item.custom) return <View style={styles.itemText}>{body}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.text}を編集`}
      onPress={onEdit}
      style={styles.itemText}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: space[5], paddingTop: space[4], gap: space[4] },
  card: {
    backgroundColor: colors.surface1,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: radius.card,
    paddingHorizontal: space[4],
    paddingVertical: space[2],
  },
  countRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[3] },
  chips: { flex: 1, maxWidth: 200 },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  itemText: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: space[2],
    minHeight: size.touchMin,
    paddingVertical: space[2],
  },
  badge: {
    backgroundColor: colors.surface2,
    borderRadius: radius.thumb * 2,
    paddingHorizontal: space[2],
  },
  addButton: {
    minHeight: size.touchMin,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.lineStrong,
    borderRadius: radius.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
