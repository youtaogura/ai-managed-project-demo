import { Pressable, StyleSheet, View } from 'react-native';

import { colors, size } from '../design/tokens';
import { SPINE_COLORS } from '../lib/constants';
import type { SpineColor } from '../types/record';
import { spineColorToken } from '../lib/spineColor';

const SWATCH_SIZE = 28;
const SWATCH_BORDER = 2;


type SpineColorPickerProps = {
  value: SpineColor;
  onChange: (value: SpineColor) => void;
};

export function SpineColorPicker({ value, onChange }: SpineColorPickerProps) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="背表紙の色" style={styles.group}>
      {SPINE_COLORS.map((color, index) => {
        const selected = color === value;
        return (
          <Pressable
            key={color}
            accessibilityRole="radio"
            accessibilityLabel={`背表紙の色 ${index + 1}`}
            accessibilityState={{ checked: selected, selected }}
            onPress={() => onChange(color)}
            style={styles.hit}
          >
            <View
              style={[
                styles.swatch,
                { backgroundColor: spineColorToken(color) },
                selected && styles.selected,
              ]}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  hit: {
    width: size.touchMin,
    height: size.touchMin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatch: {
    width: SWATCH_SIZE,
    height: SWATCH_SIZE,
    borderRadius: SWATCH_SIZE / 2,
    borderWidth: SWATCH_BORDER,
    borderColor: 'transparent',
  },
  selected: { borderColor: colors.accent },
});
