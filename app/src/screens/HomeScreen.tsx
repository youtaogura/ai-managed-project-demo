import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme';

export function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>AI Managed Project Demo</Text>
      <Text style={styles.body}>
        このアプリの機能は GitHub Project の Issue から自動で実装されます。
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
  },
  body: {
    fontSize: 15,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
