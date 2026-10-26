import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radius, typography } from '../design/tokens';
import { resolveFontFamily } from '../design/fonts';
import { getSpineAccessibilityLabel } from '../lib/spineLabel';
import { getSpineSize } from '../lib/spineLayout';
import type { MediaRecord, SpineColor } from '../types/record';
import { AppText } from './AppText';

const SPINE_FACES: Record<SpineColor, string> = {
  'spine-1': colors.spine1,
  'spine-2': colors.spine2,
  'spine-3': colors.spine3,
  'spine-4': colors.spine4,
  'spine-5': colors.spine5,
  'spine-6': colors.spine6,
  'spine-7': colors.spine7,
  'spine-8': colors.spine8,
  'spine-9': colors.spine9,
  'spine-10': colors.spine10,
};

const LINE_TOP = 22;
const EDGE_WIDTH = 2;
const RIBBON_WIDTH = 8;
const RIBBON_LENGTH = 22;
const RIBBON_OVERHANG = 6;
const NARROW_WIDTH = 34;
const NARROW_FONT_SIZE = 12;
const TITLE_TOP = 28;
const PRESS_LIFT = -4;

type SpineProps = {
  record: MediaRecord;
  onPress: (record: MediaRecord) => void;
};

export function Spine({ record, onPress }: SpineProps) {
  const { width, height } = getSpineSize(record.id);
  const narrow = width < NARROW_WIDTH;
  const fontSize = narrow ? NARROW_FONT_SIZE : typography.spineTitle.fontSize;
  const lineHeight = narrow ? NARROW_FONT_SIZE + 3 : typography.spineTitle.lineHeight;
  const family = resolveFontFamily(typography.spineTitle.fontFamily, typography.spineTitle.fontWeight);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={getSpineAccessibilityLabel(record)}
      onPress={() => onPress(record)}
      style={({ pressed }) => [
        styles.base,
        { width, height, backgroundColor: SPINE_FACES[record.spineColor] },
        pressed && styles.pressed,
      ]}
    >
      <View pointerEvents="none" style={styles.fill}>
        <View style={[styles.edge, styles.edgeLeft]} />
        <View style={[styles.edge, styles.edgeRight]} />
        <View style={styles.line} />
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={styles.title}
        >
          {Array.from(record.title).map((char, i) => (
            <AppText
              key={i}
              variant="spineTitle"
              style={{
                color: colors.spineInk,
                fontFamily: family,
                fontSize,
                lineHeight,
                textAlign: 'center',
              }}
            >
              {char}
            </AppText>
          ))}
        </View>
      </View>
      {record.favorite ? (
        <View testID="spine-ribbon" style={[styles.ribbon, { left: (width - RIBBON_WIDTH) / 2 }]} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderTopLeftRadius: radius.thumb,
    borderTopRightRadius: radius.thumb,
    overflow: 'visible',
  },
  pressed: { transform: [{ translateY: PRESS_LIFT }] },
  fill: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
    borderTopLeftRadius: radius.thumb,
    borderTopRightRadius: radius.thumb,
  },
  edge: { position: 'absolute', top: 0, bottom: 0, width: EDGE_WIDTH },
  edgeLeft: { left: 0, backgroundColor: 'rgba(255, 255, 255, 0.18)' },
  edgeRight: { right: 0, backgroundColor: 'rgba(0, 0, 0, 0.25)' },
  line: {
    position: 'absolute',
    top: LINE_TOP,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.spineInk,
    opacity: 0.3,
  },
  title: {
    position: 'absolute',
    top: TITLE_TOP,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    overflow: 'hidden',
  },
  ribbon: {
    position: 'absolute',
    top: -RIBBON_OVERHANG,
    width: RIBBON_WIDTH,
    height: RIBBON_LENGTH,
    backgroundColor: colors.ribbon,
  },
});
