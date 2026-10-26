import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, size, space } from '../design/tokens';
import { useTopInset } from '../hooks/useTopInset';
import { AppText } from './AppText';
import { Button } from './Button';

type ScreenHeaderBarProps = {
  title?: string;
  onClose: () => void;
  right?: ReactNode;
  onImage?: boolean;
  divider?: boolean;
  children?: ReactNode;
};

export function ScreenHeaderBar({
  title,
  onClose,
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
      <Button variant="icon" accessibilityLabel="閉じる" onImage={onImage} onPress={onClose}>
        <AppText variant="sectionTitle">✕</AppText>
      </Button>
      <View style={styles.center}>
        {children ?? (
          <AppText variant="sectionTitle" style={styles.title}>
            {title}
          </AppText>
        )}
      </View>
      {children === undefined || right !== undefined ? (
        <View style={styles.side}>{right}</View>
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
});
