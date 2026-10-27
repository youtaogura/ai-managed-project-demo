import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radius, space } from '../design/tokens';
import type { Shelf } from '../types/shelf';
import { AppText } from './AppText';
import { BottomSheet } from './BottomSheet';
import { Button } from './Button';
import { ShelfCreateSheet } from './ShelfCreateSheet';

const CHECK_SIZE = 22;
const ROW_HEIGHT = 54;
const CHECK_MARK_WIDTH = 6;
const CHECK_MARK_HEIGHT = 11;
const ERROR_PICK_SAVE = '保存できませんでした';

type ShelfPickSheetProps = {
  visible: boolean;
  /** 見出しの上に出す本のタイトル。空なら出さない */
  bookTitle?: string;
  shelves: readonly Shelf[];
  /** 本棚の ID ごとの冊数 */
  counts: Readonly<Record<string, number>>;
  selectedIds: readonly string[];
  /** shelves の並び順の ID 配列で呼ぶ。resolve したら閉じ、reject したらエラーを出して開いたままにする */
  onSubmit: (ids: string[]) => void | Promise<void>;
  onCreate: (name: string) => Promise<Shelf>;
  onClose: () => void;
};

export function ShelfPickSheet({ visible, onClose, bookTitle, ...rest }: ShelfPickSheetProps) {
  return (
    <BottomSheet visible={visible} onClose={onClose} title="どの本棚に入れる？" eyebrow={bookTitle || undefined}>
      {visible ? <Body onClose={onClose} {...rest} /> : null}
    </BottomSheet>
  );
}

function Check({ checked }: { checked: boolean }) {
  return (
    <View style={[styles.check, checked && styles.checkOn]}>
      {checked ? <View style={styles.checkMark} /> : null}
    </View>
  );
}

function Body({
  shelves,
  counts,
  selectedIds,
  onSubmit,
  onCreate,
  onClose,
}: Omit<ShelfPickSheetProps, 'visible' | 'bookTitle'>) {
  const [checked, setChecked] = useState<ReadonlySet<string>>(
    () => new Set(shelves.filter((s) => selectedIds.includes(s.id)).map((s) => s.id)),
  );
  const [createOpen, setCreateOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (id: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  };

  const ids = shelves.filter((s) => checked.has(s.id)).map((s) => s.id);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await onSubmit(ids);
      onClose();
    } catch {
      setError(ERROR_PICK_SAVE);
      setBusy(false);
    }
  };

  const create = async (name: string) => {
    const shelf = await onCreate(name);
    setChecked((prev) => new Set(prev).add(shelf.id));
  };

  const createButton = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="本棚を作る"
      onPress={() => setCreateOpen(true)}
      style={styles.create}
    >
      <View style={styles.plus}>
        <AppText variant="body" style={{ color: colors.textSecondary }}>
          ＋
        </AppText>
      </View>
      <AppText variant="body" style={{ color: colors.textSecondary }}>
        新しい本棚を作る
      </AppText>
    </Pressable>
  );

  return (
    <View style={styles.body}>
      {shelves.length === 0 ? (
        <AppText variant="body" style={{ color: colors.textSecondary }}>
          まだ本棚がありません
        </AppText>
      ) : (
        <>
          <AppText variant="label" style={{ color: colors.textSecondary }}>
            いくつでも選べます。「すべての本」にはいつも入ります。
          </AppText>
          <View>
            {shelves.map((shelf) => {
              const isChecked = checked.has(shelf.id);
              const count = counts[shelf.id] ?? 0;
              return (
                <Pressable
                  key={shelf.id}
                  accessibilityRole="checkbox"
                  accessibilityLabel={shelf.name}
                  accessibilityState={{ checked: isChecked }}
                  onPress={() => toggle(shelf.id)}
                  style={styles.row}
                >
                  <Check checked={isChecked} />
                  <AppText variant="starter" numberOfLines={1} style={styles.name}>
                    {shelf.name}
                  </AppText>
                  <AppText variant="label" style={{ color: colors.textSecondary }}>
                    {`${count} 冊`}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </>
      )}
      {createButton}
      {shelves.length > 0 ? (
        <>
          {error ? (
            <AppText variant="body" style={{ color: colors.danger }}>
              {error}
            </AppText>
          ) : null}
          <Button
            label={ids.length === 0 ? '本棚に入れない' : `${ids.length} つの本棚に入れる`}
            disabled={busy}
            onPress={() => void submit()}
          />
        </>
      ) : null}
      <ShelfCreateSheet
        visible={createOpen}
        shelves={shelves}
        onSubmit={create}
        onClose={() => setCreateOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  body: { gap: space[3] },
  row: {
    minHeight: ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  name: { flex: 1 },
  check: {
    width: CHECK_SIZE,
    height: CHECK_SIZE,
    borderRadius: radius.thumb,
    borderWidth: 1.5,
    borderColor: colors.lineStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  checkMark: {
    width: CHECK_MARK_WIDTH,
    height: CHECK_MARK_HEIGHT,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderColor: colors.accentInk,
    transform: [{ rotate: '45deg' }, { translateY: -1 }],
  },
  create: {
    minHeight: ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
  },
  plus: {
    width: CHECK_SIZE,
    height: CHECK_SIZE,
    borderRadius: radius.thumb,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.lineStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
