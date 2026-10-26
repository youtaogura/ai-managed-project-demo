import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radius, size, space } from '../design/tokens';
import { HERO_CRITERION_OPTIONS } from '../lib/heroCriteria';
import type { HeroCriterion } from '../types/settings';
import { AppText } from './AppText';
import { BottomSheet } from './BottomSheet';

type HeroCriterionSheetProps = {
  visible: boolean;
  value: HeroCriterion;
  onClose: () => void;
  onChange: (criterion: HeroCriterion) => void;
};

export function HeroCriterionSheet({ visible, value, onClose, onChange }: HeroCriterionSheetProps) {
  return (
    <BottomSheet visible={visible} onClose={onClose} title="上に大きく出す作品" showCloseButton>
      <AppText variant="micro" style={styles.note}>
        記録一覧のいちばん上に、大きく並べる作品です。合う作品がないときは表示しません。
      </AppText>
      <View accessibilityRole="radiogroup" accessibilityLabel="上に大きく出す作品" style={styles.list}>
        {HERO_CRITERION_OPTIONS.map((option) => {
          const selected = option.id === value;
          const label = option.label;
          return (
            <Pressable
              key={option.id}
              accessibilityRole="radio"
              accessibilityLabel={label}
              accessibilityState={{ selected, checked: selected }}
              onPress={() => onChange(option.id)}
              style={[styles.option, selected && styles.optionSelected]}
            >
              <AppText
                variant="body"
                style={[styles.name, { color: selected ? colors.accentInk : colors.textPrimary }]}
              >
                {label}
              </AppText>
              {option.description ? (
                <AppText
                  variant="label"
                  style={{ color: selected ? colors.accentInk : colors.textSecondary }}
                >
                  {option.description}
                </AppText>
              ) : null}
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
