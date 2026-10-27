import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, typography } from '../design/tokens';

const LINE_HEIGHT = typography.reading.lineHeight;

type RuledTextProps = {
  children: ReactNode;
};

/** 本文の各行（行の高さ 32px）の下に罫線を引く。高さから行数を求めるので Web / iOS / Android で同じに動く。 */
export function RuledText({ children }: RuledTextProps) {
  const [height, setHeight] = useState(0);
  const lines = Math.max(1, Math.round(height / LINE_HEIGHT));
  return (
    <View onLayout={(e) => setHeight(e.nativeEvent.layout.height)}>
      {children}
      {Array.from({ length: lines }, (_, i) => (
        <View key={i} testID="rule" pointerEvents="none" style={[styles.rule, { top: (i + 1) * LINE_HEIGHT - 1 }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  rule: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: colors.line },
});
