import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="index" options={{ title: '記録一覧' }} />
      <Tabs.Screen name="analytics" options={{ title: '分析' }} />
    </Tabs>
  );
}
