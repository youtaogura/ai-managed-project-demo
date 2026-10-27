import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors } from '../design/tokens';

const WIDTH = 8;
const LENGTH = 22;
const NOTCH = 4;

type RibbonMarkProps = {
  width?: number;
  length?: number;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

/** 下を V 字に切り欠いた栞。View だけで描く（本体の長方形＋左右の三角） */
export function RibbonMark({ width = WIDTH, length = LENGTH, testID, style }: RibbonMarkProps) {
  const half = width / 2;
  return (
    <View testID={testID} pointerEvents="none" style={[{ width, height: length }, style]}>
      <View style={[styles.body, { height: length - NOTCH }]} />
      <View style={styles.notchRow}>
        <View
          testID="ribbon-notch"
          style={{
            borderLeftWidth: half,
            borderBottomWidth: NOTCH,
            borderLeftColor: colors.ribbon,
            borderBottomColor: 'transparent',
          }}
        />
        <View
          testID="ribbon-notch"
          style={{
            borderRightWidth: half,
            borderBottomWidth: NOTCH,
            borderRightColor: colors.ribbon,
            borderBottomColor: 'transparent',
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { backgroundColor: colors.ribbon },
  notchRow: { flexDirection: 'row' },
});
