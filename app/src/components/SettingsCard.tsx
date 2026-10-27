import { Children, Fragment, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, radius, space } from '../design/tokens';
import { AppText } from './AppText';

type SettingsCardProps = {
  /** 省略すると見出しなしのカードになる。 */
  title?: string;
  children: ReactNode;
};

// 設定画面の 1 段。上に小さな見出しを置き、行の間は line の区切り線で分ける
export function SettingsCard({ title, children }: SettingsCardProps) {
  return (
    <View style={styles.section}>
      {title ? (
        <AppText variant="value" style={styles.title}>
          {title}
        </AppText>
      ) : null}
      <View style={styles.card}>
        {Children.toArray(children).map((child, index) => (
          <Fragment key={index}>
            {index > 0 ? <View style={styles.divider} /> : null}
            {child}
          </Fragment>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: space[2] },
  title: { color: colors.textSecondary },
  card: {
    backgroundColor: colors.surface1,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: radius.card,
    paddingHorizontal: space[4],
  },
  divider: { height: 1, backgroundColor: colors.line },
});
