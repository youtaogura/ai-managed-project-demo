import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radius, size, space } from '../design/tokens';
import { AppText } from './AppText';
import { Button } from './Button';

const GHOST_WIDTH = 48;
const GHOST_HEIGHT = 72;
const GHOST_COUNT = 4;

type EmptyStateProps = {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  children?: ReactNode;
};

export function EmptyState({
  title,
  description,
  actionLabel = '記録する',
  onAction,
  children,
}: EmptyStateProps) {
  const ghosts = Array.from({ length: GHOST_COUNT }, (_, i) => {
    const box = (
      <View style={styles.ghost}>
        {i === 0 ? (
          <AppText variant="sectionTitle" style={{ color: colors.textSecondary }}>
            ＋
          </AppText>
        ) : null}
      </View>
    );
    if (i === 0 && onAction) {
      return (
        <Pressable
          key={i}
          accessibilityRole="button"
          accessibilityLabel="記録する"
          onPress={onAction}
          style={styles.ghostTouch}
        >
          {box}
        </Pressable>
      );
    }
    return (
      <View key={i} style={styles.ghostTouch}>
        {box}
      </View>
    );
  });

  return (
    <View style={styles.container}>
      <View style={styles.ghosts}>{ghosts}</View>
      <AppText variant="sectionTitle">{title}</AppText>
      {description ? (
        <AppText variant="label" style={styles.description}>
          {description}
        </AppText>
      ) : null}
      {children ??
        (onAction ? <Button variant="primary" label={actionLabel} onPress={onAction} /> : null)}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space[6],
    gap: space[3],
  },
  ghosts: { flexDirection: 'row', gap: space[2], marginBottom: space[2] },
  ghostTouch: { minHeight: size.touchMin },
  ghost: {
    width: GHOST_WIDTH,
    height: GHOST_HEIGHT,
    borderRadius: radius.thumb,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.starOff,
    alignItems: 'center',
    justifyContent: 'center',
  },
  description: { color: colors.textSecondary, textAlign: 'center' },
});
