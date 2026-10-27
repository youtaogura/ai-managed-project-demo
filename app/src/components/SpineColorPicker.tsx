import { Pressable, StyleSheet, View } from 'react-native';

import { colors, size, space } from '../design/tokens';
import { SPINE_COLORS } from '../lib/constants';
import type { SpineColor } from '../types/record';
import { spineColorToken } from '../lib/spineColor';

const SWATCH_SIZE = 24;
const RING_WIDTH = 2;
const RING_SIZE = 32;
const HIT_SLOP = (size.touchMin - RING_SIZE) / 2;

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
            hitSlop={HIT_SLOP}
            onPress={() => onChange(color)}
            style={[styles.ring, selected && styles.selected]}
          >
            <View style={[styles.swatch, { backgroundColor: spineColorToken(color) }]} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space[1] },
  /** 選択中の輪は丸の外側。丸との間に隙間をあける */
  ring: {
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: RING_WIDTH,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatch: { width: SWATCH_SIZE, height: SWATCH_SIZE, borderRadius: SWATCH_SIZE / 2 },
  selected: { borderColor: colors.accent },
});
