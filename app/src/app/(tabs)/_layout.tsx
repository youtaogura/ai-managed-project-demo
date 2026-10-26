import { Tabs, useRouter } from 'expo-router';
import { Pressable, Text } from 'react-native';

import { tabsScreenOptions } from '../../design/navigationTheme';
import { colors, spacing } from '../../theme';

export default function TabsLayout() {
  const router = useRouter();
  return (
    <Tabs screenOptions={tabsScreenOptions}>
      <Tabs.Screen
        name="index"
        options={{
          title: '記録一覧',
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/record/new')}
              style={{ paddingHorizontal: spacing.md }}
            >
              <Text style={{ color: colors.tint, fontSize: 16 }}>追加</Text>
            </Pressable>
          ),
        }}
      />
      <Tabs.Screen name="analytics" options={{ title: '分析' }} />
    </Tabs>
  );
}
