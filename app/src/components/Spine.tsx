import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radius, typography } from '../design/tokens';
import { resolveFontFamily } from '../design/fonts';
import { spineColorToken } from '../lib/spineColor';
import { getSpineAccessibilityLabel } from '../lib/spineLabel';
import { getSpineSize } from '../lib/spineLayout';
import type { MediaRecord } from '../types/record';
import { AppText } from './AppText';
import { RibbonMark } from './RibbonMark';

const LINE_TOP = 22;
const EDGE_WIDTH = 2;
const RIBBON_WIDTH = 8;
const RIBBON_LENGTH = 22;
const RIBBON_OVERHANG = 6;
const NARROW_WIDTH = 34;
const NARROW_FONT_SIZE = 12;
const TITLE_TOP = 28;
const PRESS_LIFT = -4;

type SpineRecord = Pick<MediaRecord, 'id' | 'title' | 'creator' | 'status' | 'favorite' | 'spineColor'>;

type SpineProps<R extends SpineRecord> = {
  record: R;
  /** 渡さないときは押せない（プレビュー・検索結果用） */
  onPress?: (record: R) => void;
  /** 大きさを ID ではなく指定したいとき（検索結果の小さな背表紙） */
  dimensions?: { width: number; height: number };
};

export function Spine<R extends SpineRecord>({ record, onPress, dimensions }: SpineProps<R>) {
  const { width, height } = dimensions ?? getSpineSize(record.id);
  const narrow = width < NARROW_WIDTH;
  const fontSize = narrow ? NARROW_FONT_SIZE : typography.spineTitle.fontSize;
  const lineHeight = narrow ? NARROW_FONT_SIZE + 3 : typography.spineTitle.lineHeight;
  const family = resolveFontFamily(typography.spineTitle.fontFamily, typography.spineTitle.fontWeight);

  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : 'image'}
      accessibilityLabel={getSpineAccessibilityLabel(record)}
      disabled={!onPress}
      onPress={() => onPress?.(record)}
      style={({ pressed }) => [
        styles.base,
        { width, height, backgroundColor: spineColorToken(record.spineColor) },
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
        <RibbonMark
          testID="spine-ribbon"
          width={RIBBON_WIDTH}
          length={RIBBON_LENGTH}
          style={[styles.ribbon, { left: (width - RIBBON_WIDTH) / 2 }]}
        />
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
  },
});
