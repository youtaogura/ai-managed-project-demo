import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '../components/AppText';
import { BottomSheet } from '../components/BottomSheet';
import { Button } from '../components/Button';
import { ScreenContainer } from '../components/ScreenContainer';
import { ScreenHeaderBar } from '../components/ScreenHeaderBar';
import { ERROR_SHELF_SAVE, ShelfCreateSheet } from '../components/ShelfCreateSheet';
import { colors, radius, size, space } from '../design/tokens';
import { useBottomInset } from '../hooks/useBottomInset';
import { useRecordRepository } from '../hooks/useRecordRepository';
import { useRecords } from '../hooks/useRecords';
import { useShelfRepository } from '../hooks/useShelfRepository';
import { useShelves } from '../hooks/useShelves';
import { deleteShelf } from '../lib/deleteShelf';
import { countShelfRecords, moveShelf } from '../lib/shelfSelectors';
import type { Shelf } from '../types/shelf';

const ERROR_DELETE = '削除できませんでした。もう一度お試しください';

type RowProps = {
  shelf: Shelf;
  count: number;
  first: boolean;
  last: boolean;
  onRename: () => void;
  onMove: (direction: 'up' | 'down') => void;
  onDelete: () => void;
};

function TextAction({
  label,
  accessibilityLabel,
  disabled,
  danger,
  onPress,
}: {
  label: string;
  accessibilityLabel: string;
  disabled?: boolean;
  danger?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: disabled === true }}
      disabled={disabled}
      onPress={onPress}
      style={styles.action}
    >
      <AppText
        variant="label"
        style={{
          color: disabled ? colors.textTertiary : danger ? colors.danger : colors.textPrimary,
        }}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

function ShelfRow({ shelf, count, first, last, onRename, onMove, onDelete }: RowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.texts}>
        <AppText variant="body" numberOfLines={1}>
          {shelf.name}
        </AppText>
        <AppText variant="label" style={{ color: colors.textSecondary }}>
          {`${count} 冊`}
        </AppText>
      </View>
      <View style={styles.actions}>
        <TextAction label="名前を変える" accessibilityLabel={`${shelf.name}の名前を変える`} onPress={onRename} />
        <TextAction
          label="上へ"
          accessibilityLabel={`${shelf.name}を上へ`}
          disabled={first}
          onPress={() => onMove('up')}
        />
        <TextAction
          label="下へ"
          accessibilityLabel={`${shelf.name}を下へ`}
          disabled={last}
          onPress={() => onMove('down')}
        />
        <TextAction label="削除" accessibilityLabel={`${shelf.name}を削除`} danger onPress={onDelete} />
      </View>
    </View>
  );
}

// 作成（'new'）・名前の変更（本棚の ID）のシート。閉じているときは null
type Editing = 'new' | string | null;

export function ShelvesScreen() {
  const bottomInset = useBottomInset();
  const shelfRepository = useShelfRepository();
  const recordRepository = useRecordRepository();
  const { shelves, reload } = useShelves();
  const { records, reload: reloadRecords } = useRecords();
  const [editing, setEditing] = useState<Editing>(null);
  const [deleting, setDeleting] = useState<Shelf | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [moveError, setMoveError] = useState<string | null>(null);

  const counts = useMemo(() => countShelfRecords(records, shelves), [records, shelves]);
  const editingShelf = shelves.find((s) => s.id === editing) ?? null;

  const submitEdit = async (name: string) => {
    if (editingShelf) await shelfRepository.rename(editingShelf.id, name);
    else await shelfRepository.create(name);
    await reload();
  };

  const move = async (id: string, direction: 'up' | 'down') => {
    setMoveError(null);
    try {
      await shelfRepository.reorder(moveShelf(shelves.map((s) => s.id), id, direction));
      await reload();
    } catch {
      setMoveError(ERROR_SHELF_SAVE);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    setDeleteError(null);
    try {
      await deleteShelf({ shelfRepository, recordRepository }, deleting.id);
      await Promise.all([reload(), reloadRecords()]);
      setDeleting(null);
    } catch {
      setDeleteError(ERROR_DELETE);
    } finally {
      setBusy(false);
    }
  };

  const closeDelete = () => {
    setDeleting(null);
    setDeleteError(null);
  };

  return (
    <ScreenContainer>
      <ScreenHeaderBar title="本棚の管理" onClose={() => router.back()} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: space[6] + bottomInset }]}>
        {shelves.length === 0 ? (
          <AppText variant="body" style={{ color: colors.textSecondary }}>
            まだ本棚がありません
          </AppText>
        ) : (
          <View style={styles.card}>
            {shelves.map((shelf, index) => (
              <ShelfRow
                key={shelf.id}
                shelf={shelf}
                count={counts[shelf.id] ?? 0}
                first={index === 0}
                last={index === shelves.length - 1}
                onRename={() => setEditing(shelf.id)}
                onMove={(direction) => void move(shelf.id, direction)}
                onDelete={() => setDeleting(shelf)}
              />
            ))}
          </View>
        )}
        {moveError ? (
          <AppText variant="body" style={{ color: colors.danger }}>
            {moveError}
          </AppText>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="本棚を作る"
          onPress={() => setEditing('new')}
          style={styles.create}
        >
          <AppText variant="value" style={{ color: colors.textSecondary }}>
            ＋ 本棚を作る
          </AppText>
        </Pressable>
      </ScrollView>

      <ShelfCreateSheet
        visible={editing === 'new' || editingShelf !== null}
        shelves={shelves}
        title={editingShelf ? '名前を変える' : '本棚を作る'}
        initialName={editingShelf?.name ?? ''}
        submitLabel={editingShelf ? '保存する' : '作る'}
        exceptId={editingShelf?.id}
        onSubmit={submitEdit}
        onClose={() => setEditing(null)}
      />

      <BottomSheet visible={deleting !== null} onClose={closeDelete} title="この本棚を削除しますか？">
        <View style={styles.sheetBody}>
          <AppText variant="body" style={{ color: colors.textSecondary }}>
            {`「${deleting?.name ?? ''}」を削除します。中の本は消えず、「すべての本」には残ります`}
          </AppText>
          {deleteError ? (
            <AppText variant="body" style={{ color: colors.danger }}>
              {deleteError}
            </AppText>
          ) : null}
          <Button variant="outline" label="キャンセル" onPress={closeDelete} />
          <Button
            variant="outline"
            tone="danger"
            label="削除する"
            disabled={busy}
            onPress={() => void confirmDelete()}
          />
        </View>
      </BottomSheet>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: space[5], paddingTop: space[4], gap: space[4] },
  card: { backgroundColor: colors.surface1, borderRadius: radius.card, padding: space[4], gap: space[3] },
  row: { gap: space[1] },
  texts: { gap: space[1] },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  action: { minHeight: size.touchMin, minWidth: size.touchMin, justifyContent: 'center', alignItems: 'center', paddingHorizontal: space[2] },
  create: {
    minHeight: size.touchMin,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.lineStrong,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetBody: { gap: space[3] },
});
