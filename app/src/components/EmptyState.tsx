import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '../theme';

type EmptyStateProps = {
  title: string;
  description?: string;
  children?: ReactNode;
};

export function EmptyState({ title, description, children }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: { fontSize: 18, fontWeight: '600', color: colors.text },
  description: { fontSize: 14, color: colors.textMuted, textAlign: 'center' },
});
