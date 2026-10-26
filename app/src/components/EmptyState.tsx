import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, radius, shadows, size, space } from '../design/tokens';
import { AppText } from './AppText';
import { Button } from './Button';

// 点線の空の背表紙（高さをばらつかせて 5 冊）
const GHOST_HEIGHTS = [118, 140, 104, 150, 126];
const GHOST_WIDTH = 32;
const GHOST_GAP = 3;

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
  actionLabel = '本を追加する',
  onAction,
  children,
}: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.shelf}>
        <View style={styles.ghosts}>
          {GHOST_HEIGHTS.map((height, i) => (
            <View key={i} testID="empty-spine" style={[styles.ghost, { height }]} />
          ))}
        </View>
        <View style={styles.board} />
      </View>
      <AppText variant="bookTitle" style={styles.title}>
        {title}
      </AppText>
      {description ? (
        <AppText variant="body" style={styles.description}>
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
  shelf: { marginBottom: space[3] },
  ghosts: { flexDirection: 'row', alignItems: 'flex-end', gap: GHOST_GAP },
  ghost: {
    width: GHOST_WIDTH,
    borderTopLeftRadius: radius.thumb,
    borderTopRightRadius: radius.thumb,
    borderWidth: 1.5,
    borderBottomWidth: 0,
    borderStyle: 'dashed',
    borderColor: colors.lineStrong,
  },
  board: {
    height: size.shelfBoardHeight,
    backgroundColor: colors.shelfBoard,
    borderRadius: radius.thumb,
    boxShadow: shadows.cover,
  },
  title: { textAlign: 'center', fontSize: 20, lineHeight: 30 },
  description: { color: colors.textSecondary, textAlign: 'center' },
});
