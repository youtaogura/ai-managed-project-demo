import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, size, space } from '../design/tokens';
import { useTopInset } from '../hooks/useTopInset';
import { AppText } from './AppText';
import { Button } from './Button';

type ScreenHeaderBarProps = {
  title?: string;
  onClose: () => void;
  /** 指定すると、左の閉じるを ✕ ではなく文字のボタン（例: 「キャンセル」）にする */
  closeLabel?: string;
  right?: ReactNode;
  onImage?: boolean;
  divider?: boolean;
  children?: ReactNode;
};

export function ScreenHeaderBar({
  title,
  onClose,
  closeLabel,
  right,
  onImage,
  divider = true,
  children,
}: ScreenHeaderBarProps) {
  const topInset = useTopInset();
  return (
    <View
      style={[
        styles.bar,
        { paddingTop: topInset + space[2] },
        divider && styles.divider,
      ]}
    >
      {closeLabel !== undefined ? (
        <View style={[styles.side, styles.sideStart]}>
          <Button variant="text" label={closeLabel} onPress={onClose} />
        </View>
      ) : (
        <Button variant="icon" accessibilityLabel="閉じる" onImage={onImage} onPress={onClose}>
          <AppText variant="sectionTitle">✕</AppText>
        </Button>
      )}
      <View style={styles.center}>
        {children ?? (
          <AppText variant="sectionTitle" style={styles.title}>
            {title}
          </AppText>
        )}
      </View>
      {children === undefined || right !== undefined ? (
        <View style={[styles.side, closeLabel !== undefined && styles.sideWide]}>{right}</View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    paddingHorizontal: space[4],
    paddingBottom: space[2],
  },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.line },
  center: { flex: 1, justifyContent: 'center' },
  title: { textAlign: 'center' },
  side: { minWidth: size.touchMin, alignItems: 'flex-end' },
  // 文字の閉じるボタンのときは、左右の幅をそろえて見出しを中央に置く
  sideStart: { width: size.touchMin * 2 + space[4], alignItems: 'flex-start' },
  sideWide: { width: size.touchMin * 2 + space[4] },
});
