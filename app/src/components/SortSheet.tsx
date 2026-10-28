import { StyleSheet, View } from 'react-native';

import { colors, space } from '../design/tokens';
import type { SortOrder } from '../types/sort';
import { AppText } from './AppText';
import { BottomSheet } from './BottomSheet';
import { ChipGroup } from './Chip';

// 2 つ並ぶ行と 1 つの行で、チップの列（右端）と幅を揃える
const CHIP_MIN_WIDTH = 96;

type SortField = { label: string; options: readonly { value: SortOrder; label: string }[] };

// 項目ごとに選べる向き。SortOrder は項目×向きの組み合わせのうち実装済みのものだけ
export const SORT_FIELDS: readonly SortField[] = [
  {
    label: '終了日',
    options: [
      { value: 'endDate_desc', label: '新しい順' },
      { value: 'endDate_asc', label: '古い順' },
    ],
  },
  {
    label: '開始日',
    options: [
      { value: 'startDate_desc', label: '新しい順' },
      { value: 'startDate_asc', label: '古い順' },
    ],
  },
  {
    label: '評価',
    options: [
      { value: 'rating_desc', label: '高い順' },
      { value: 'rating_asc', label: '低い順' },
    ],
  },
  { label: 'タイトル', options: [{ value: 'title_asc', label: 'あ→ん' }] },
  { label: '登録日時', options: [{ value: 'createdAt_desc', label: '新しい順' }] },
];

type SortSheetProps = {
  visible: boolean;
  value: SortOrder;
  onClose: () => void;
  onChange: (order: SortOrder) => void;
};

export function SortSheet({ visible, value, onClose, onChange }: SortSheetProps) {
  return (
    <BottomSheet visible={visible} onClose={onClose} title="並び替え" showCloseButton>
      {SORT_FIELDS.map((field, index) => {
        const active = field.options.some((option) => option.value === value);
        const last = index === SORT_FIELDS.length - 1;
        return (
          <View key={field.label} style={[styles.row, last && styles.lastRow]}>
            <AppText variant="body" style={[styles.label, active && styles.activeLabel]}>
              {field.label}
            </AppText>
            <ChipGroup
              label={field.label}
              options={field.options}
              value={value}
              minChipWidth={CHIP_MIN_WIDTH}
              onChange={(order) => {
                onChange(order);
                onClose();
              }}
            />
          </View>
        );
      })}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space[3],
    paddingVertical: space[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  lastRow: { borderBottomWidth: 0 },
  label: { flexShrink: 1, color: colors.textPrimary },
  activeLabel: { fontWeight: '700' },
});
