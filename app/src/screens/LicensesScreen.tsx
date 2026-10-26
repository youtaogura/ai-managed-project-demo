import { router } from 'expo-router';
import { FlatList, StyleSheet, View } from 'react-native';

import { AppText } from '../components/AppText';
import { ScreenContainer } from '../components/ScreenContainer';
import { ScreenHeaderBar } from '../components/ScreenHeaderBar';
import { colors, size, space } from '../design/tokens';
import { useBottomInset } from '../hooks/useBottomInset';
import licensesJson from '../generated/licenses.json';
import { parseLicenseList } from '../lib/licenses';

const licenses = parseLicenseList(licensesJson);

export function LicensesScreen() {
  const bottomInset = useBottomInset();
  return (
    <ScreenContainer>
      <ScreenHeaderBar title="オープンソースライセンス" onClose={() => router.back()} />
      <FlatList
        data={licenses}
        keyExtractor={(item) => item.name}
        contentContainerStyle={{ paddingHorizontal: space[5], paddingBottom: space[6] + bottomInset }}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <AppText variant="body">{item.name}</AppText>
            <AppText variant="label" style={styles.sub}>
              {`${item.version} · ${item.license}`}
            </AppText>
          </View>
        )}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: size.touchMin, justifyContent: 'center', paddingVertical: space[2] },
  sub: { color: colors.textSecondary },
});
