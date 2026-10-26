import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, radius, space } from '../design/tokens';
import { AppText } from './AppText';

type SettingsCardProps = {
  title: string;
  children: ReactNode;
};

// カードの上に小さな見出しを置く、設定画面の 1 段
export function SettingsCard({ title, children }: SettingsCardProps) {
  return (
    <View style={styles.section}>
      <AppText variant="label" style={styles.title}>
        {title}
      </AppText>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: space[2] },
  title: { color: colors.textSecondary },
  card: {
    backgroundColor: colors.surface1,
    borderRadius: radius.card,
    padding: space[4],
  },
});
