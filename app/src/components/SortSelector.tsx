import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { SORT_ORDER_LABELS } from '../lib/sortRecords';
import { colors, spacing } from '../theme';
import { SORT_ORDERS, type SortOrder } from '../types/sort';

type SortSelectorProps = {
  value: SortOrder;
  onChange: (order: SortOrder) => void;
};

export function SortSelector({ value, onChange }: SortSelectorProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="並び替え"
        onPress={() => setOpen(true)}
        style={styles.bar}
      >
        <Text style={styles.barText}>並び替え: {SORT_ORDER_LABELS[value]}</Text>
      </Pressable>
      <Modal testID="sort-modal" transparent animationType="fade" visible={open} onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View style={styles.sheet}>
            {SORT_ORDERS.map((order) => (
              <Pressable
                key={order}
                accessibilityRole="radio"
                accessibilityState={{ checked: order === value }}
                onPress={() => {
                  onChange(order);
                  setOpen(false);
                }}
                style={styles.option}
              >
                <Text style={[styles.optionText, order === value && styles.selected]}>
                  {order === value ? '✓ ' : ''}
                  {SORT_ORDER_LABELS[order]}
                </Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  bar: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  barText: { fontSize: 14, color: colors.text },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.background, paddingVertical: spacing.sm },
  option: { padding: spacing.md },
  optionText: { fontSize: 16, color: colors.text },
  selected: { color: colors.tint, fontWeight: '600' },
});
