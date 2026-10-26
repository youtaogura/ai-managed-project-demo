import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, size, space } from '../design/tokens';
import { ValidationError } from '../lib/recordRepository';
import { SHELF_NAME_EXAMPLES, validateShelfName } from '../lib/shelfName';
import type { Shelf } from '../types/shelf';
import { AppText } from './AppText';
import { BottomSheet } from './BottomSheet';
import { Button } from './Button';
import { TextField } from './TextField';

export const ERROR_SHELF_SAVE = '保存できませんでした。もう一度お試しください';

const EXAMPLE_RADIUS = 10;
const EXAMPLE_HEIGHT = 36;

type ShelfCreateSheetProps = {
  visible: boolean;
  /** 重複の確認と、例のチップの絞り込みに使う */
  shelves: readonly Pick<Shelf, 'id' | 'name'>[];
  title?: string;
  initialName?: string;
  submitLabel?: string;
  /** 名前の変更のとき、自分自身の名前を重複にしない */
  exceptId?: string;
  onSubmit: (name: string) => Promise<void>;
  onClose: () => void;
};

export function ShelfCreateSheet({
  visible,
  shelves,
  title = '本棚を作る',
  initialName = '',
  submitLabel = '作る',
  exceptId,
  onSubmit,
  onClose,
}: ShelfCreateSheetProps) {
  return (
    <BottomSheet visible={visible} onClose={onClose} title={title}>
      {visible ? (
        <Form
          shelves={shelves}
          initialName={initialName}
          submitLabel={submitLabel}
          exceptId={exceptId}
          onSubmit={onSubmit}
          onClose={onClose}
        />
      ) : null}
    </BottomSheet>
  );
}

type FormProps = Omit<ShelfCreateSheetProps, 'visible' | 'title'>;

function Form({ shelves, initialName = '', submitLabel = '作る', exceptId, onSubmit, onClose }: FormProps) {
  const [name, setName] = useState(initialName);
  const [error, setError] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  const examples = SHELF_NAME_EXAMPLES.filter((example) => validateShelfName(example, shelves, exceptId).ok);

  const change = (text: string) => {
    setName(text);
    setError(undefined);
  };

  const submit = async () => {
    const result = validateShelfName(name, shelves, exceptId);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setBusy(true);
    try {
      await onSubmit(result.name);
      onClose();
    } catch (e) {
      setError(e instanceof ValidationError ? e.message : ERROR_SHELF_SAVE);
      setBusy(false);
    }
  };

  return (
    <View style={styles.form}>
      <TextField
        label="名前"
        value={name}
        onChangeText={change}
        placeholder="例: SF"
        error={error}
        autoFocus
      />
      {examples.length > 0 ? (
        <View style={styles.examples}>
          <AppText variant="label" style={{ color: colors.textSecondary }}>
            例
          </AppText>
          <View style={styles.exampleRow}>
            {examples.map((example) => (
              <Pressable
                key={example}
                accessibilityRole="button"
                accessibilityLabel={example}
                hitSlop={(size.touchMin - EXAMPLE_HEIGHT) / 2}
                onPress={() => change(example)}
                style={styles.example}
              >
                <AppText variant="label" style={{ color: colors.textSecondary }}>
                  {example}
                </AppText>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}
      <Button label={submitLabel} disabled={busy} onPress={() => void submit()} />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: space[3] },
  examples: { gap: space[2] },
  exampleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  example: {
    height: EXAMPLE_HEIGHT,
    paddingHorizontal: space[3],
    borderRadius: EXAMPLE_RADIUS,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
