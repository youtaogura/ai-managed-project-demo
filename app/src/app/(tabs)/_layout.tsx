import { Tabs } from 'expo-router';

import { TabBar } from '../../components/TabBar';
import { tabsScreenOptions } from '../../design/navigationTheme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{ ...tabsScreenOptions, headerShown: false }}
      tabBar={(props) => <TabBar {...props} />}
    >
      <Tabs.Screen name="index" options={{ title: '記録' }} />
      <Tabs.Screen name="analytics" options={{ title: '振り返り' }} />
      <Tabs.Screen name="settings" options={{ title: '設定' }} />
    </Tabs>
  );
}
