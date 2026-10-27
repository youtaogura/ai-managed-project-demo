import { Pressable, StyleSheet, View } from 'react-native';


import { colors, radius, typography } from '../design/tokens';
import { resolveFontFamily } from '../design/fonts';
import { spineColorToken } from '../lib/spineColor';
import { getSpineAccessibilityLabel } from '../lib/spineLabel';
import { getSpineSize } from '../lib/spineLayout';
import {
  ELLIPSIS,
  LATIN_CHAR_RATIO,
  SHIFT_RATIO,
  fitVerticalUnits,
  splitVerticalUnits,
  unitLength,
  type VerticalUnit,
} from '../lib/spineTitle';
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
/** 実際の字幅は近似より広いことがあるので、折り返し・省略されない広さの箱に入れて中央に置く */
const LATIN_BOX_SCALE = 2;

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

  const shown = fitVerticalUnits(
    splitVerticalUnits(record.title),
    height - TITLE_TOP,
    fontSize,
    lineHeight,
  );
  const unitProps = { family, fontSize, lineHeight, maxTcyWidth: width - EDGE_WIDTH * 4 };

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
          {shown.units.map((unit, i) => (
            <SpineUnit key={i} unit={unit} {...unitProps} />
          ))}
          {shown.truncated ? <SpineUnit unit={{ kind: 'upright', text: ELLIPSIS }} {...unitProps} /> : null}
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

type SpineUnitProps = {
  unit: VerticalUnit;
  family: string;
  fontSize: number;
  lineHeight: number;
  maxTcyWidth: number;
};

function SpineUnit({ unit, family, fontSize, lineHeight, maxTcyWidth }: SpineUnitProps) {
  const textStyle = {
    color: colors.spineInk,
    fontFamily: family,
    fontSize,
    lineHeight,
    textAlign: 'center' as const,
  };
  const tcyFits = unit.kind === 'tcy' && unit.text.length * fontSize * LATIN_CHAR_RATIO <= maxTcyWidth;
  if (unit.kind === 'latin' || (unit.kind === 'tcy' && !tcyFits)) {
    const length = unitLength({ kind: 'latin', text: unit.text }, fontSize, lineHeight);
    const boxWidth = length * LATIN_BOX_SCALE;
    return (
      <View style={{ width: lineHeight, height: length }}>
        <View
          style={{
            position: 'absolute',
            width: boxWidth,
            height: lineHeight,
            left: (lineHeight - boxWidth) / 2,
            top: (length - lineHeight) / 2,
          }}
        >
          <AppText
            variant="spineTitle"
            numberOfLines={1}
            ellipsizeMode="clip"
            style={[textStyle, { width: boxWidth, transform: [{ rotate: '90deg' }] }]}
          >
            {unit.text}
          </AppText>
        </View>
      </View>
    );
  }
  if (unit.kind === 'rotate') {
    return (
      <View style={{ width: lineHeight, height: lineHeight, alignItems: 'center', justifyContent: 'center' }}>
        <AppText variant="spineTitle" style={[textStyle, { transform: [{ rotate: '90deg' }] }]}>
          {unit.text}
        </AppText>
      </View>
    );
  }
  const offset = fontSize * SHIFT_RATIO;
  return (
    <AppText
      variant="spineTitle"
      style={[textStyle, unit.shift && { transform: [{ translateX: offset }, { translateY: -offset }] }]}
    >
      {unit.text}
    </AppText>
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
