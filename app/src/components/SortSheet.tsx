import { StyleSheet, View } from 'react-native';

import { colors, space } from '../design/tokens';
import type { SortOrder } from '../types/sort';
import { AppText } from './AppText';
import { BottomSheet } from './BottomSheet';
import { ChipGroup } from './Chip';

const CHIP_WIDTH = 112;

type SortField = { label: string; options: readonly { value: SortOrder; label: string }[] };

// 項目ごとに選べる向き。SortOrder は項目×向きの組み合わせのうち実装済みのものだけ
const SORT_FIELDS: readonly SortField[] = [
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
    label: 'レーティング',
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
      {SORT_FIELDS.map((field) => {
        const active = field.options.some((option) => option.value === value);
        return (
          <View key={field.label} style={styles.row}>
            <AppText
              variant="body"
              style={[styles.label, active && styles.activeLabel]}
            >
              {field.label}
            </AppText>
            <View style={{ width: field.options.length * CHIP_WIDTH }}>
              <ChipGroup
                label={field.label}
                options={field.options}
                value={value}
                onChange={(order) => {
                  onChange(order);
                  onClose();
                }}
              />
            </View>
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
    paddingTop: space[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  label: { color: colors.textPrimary },
  activeLabel: { fontWeight: '700' },
});
