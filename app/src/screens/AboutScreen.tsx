import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '../components/AppText';
import { ScreenContainer } from '../components/ScreenContainer';
import { ScreenHeaderBar } from '../components/ScreenHeaderBar';
import { SettingsCard } from '../components/SettingsCard';
import { colors, radius, space } from '../design/tokens';
import { useBottomInset } from '../hooks/useBottomInset';
import { formatVersion, getAppInfo } from '../lib/appInfo';

type Source = { name: string; note: string };

const SOURCES: readonly Source[] = [
  { name: 'openBD', note: '書誌情報（ISBN から）' },
  { name: '国立国会図書館サーチ', note: 'タイトル検索' },
  { name: 'Noto Sans JP / しっぽり明朝', note: 'フォント（SIL Open Font License）' },
];

const PRIVACY =
  '記録はこの端末の中にだけ保存され、外部に送られることはありません。書誌情報を探すときだけ、ISBN やキーワードを上の出典に問い合わせます。';

const BAR_HEIGHTS = [space[5], space[6], space[4]] as const;

export function AboutScreen() {
  const bottomInset = useBottomInset();
  const { name, version, build } = getAppInfo();
  const versionText = `バージョン ${formatVersion(version, build)}`;

  return (
    <ScreenContainer>
      <ScreenHeaderBar title="このアプリについて" onClose={() => router.back()} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: space[6] + bottomInset }]}
      >
        <View style={styles.hero}>
          <View style={styles.mark} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            {BAR_HEIGHTS.map((height, i) => (
              <View key={i} style={[styles.bar, { height }]} />
            ))}
          </View>
          <AppText variant="screenTitle">{name}</AppText>
          <AppText variant="label" style={styles.secondary}>
            {versionText}
          </AppText>
        </View>
        <SettingsCard title="データの出典">
          {SOURCES.map((source, i) => (
            <View key={source.name} style={i > 0 ? styles.sourceGap : undefined}>
              <AppText variant="body">{source.name}</AppText>
              <AppText variant="label" style={styles.secondary}>
                {source.note}
              </AppText>
            </View>
          ))}
        </SettingsCard>
        <AppText variant="micro" style={styles.tertiary}>
          {PRIVACY}
        </AppText>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: space[5], paddingTop: space[4], gap: space[5] },
  hero: { alignItems: 'center', gap: space[2] },
  mark: { flexDirection: 'row', alignItems: 'flex-end', gap: space[1], marginBottom: space[2] },
  bar: { width: space[2], borderRadius: radius.thumb, backgroundColor: colors.accent },
  secondary: { color: colors.textSecondary },
  tertiary: { color: colors.textTertiary },
  sourceGap: { marginTop: space[3] },
});
