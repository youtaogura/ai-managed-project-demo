import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radius, size, space } from '../design/tokens';
import { STATUS_DEFAULT_OPTIONS } from '../lib/statusDefault';
import type { RecordStatus } from '../types/record';
import { AppText } from './AppText';
import { BottomSheet } from './BottomSheet';

type StatusDefaultSheetProps = {
  visible: boolean;
  value: RecordStatus;
  onClose: () => void;
  onChange: (status: RecordStatus) => void;
};

export function StatusDefaultSheet({ visible, value, onClose, onChange }: StatusDefaultSheetProps) {
  return (
    <BottomSheet visible={visible} onClose={onClose} title="ステータスの初期値" showCloseButton>
      <AppText variant="micro" style={styles.note}>
        新しく記録するとき、最初に選ばれているステータスです。
      </AppText>
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel="ステータスの初期値"
        style={styles.list}
      >
        {STATUS_DEFAULT_OPTIONS.map((option) => {
          const selected = option.id === value;
          return (
            <Pressable
              key={option.id}
              accessibilityRole="radio"
              accessibilityLabel={option.label}
              accessibilityState={{ selected, checked: selected }}
              onPress={() => onChange(option.id)}
              style={[styles.option, selected && styles.optionSelected]}
            >
              <AppText
                variant="body"
                style={[styles.name, { color: selected ? colors.accentInk : colors.textPrimary }]}
              >
                {selected ? (
                  <AppText
                    variant="body"
                    accessibilityElementsHidden
                    importantForAccessibility="no"
                    style={[styles.name, { color: colors.accentInk }]}
                  >
                    {'✓ '}
                  </AppText>
                ) : null}
                {option.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  note: { color: colors.textTertiary, marginBottom: space[3] },
  list: { gap: space[2] },
  option: {
    minHeight: size.touchMin,
    justifyContent: 'center',
    paddingHorizontal: space[4],
    paddingVertical: space[3],
    borderRadius: radius.card,
    backgroundColor: colors.surface2,
  },
  optionSelected: { backgroundColor: colors.accent },
  name: { fontWeight: '700' },
});
