import { Stack } from 'expo-router';

import { TitleSearchScreen } from '../../screens/TitleSearchScreen';

export default function TitleSearchRoute() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <TitleSearchScreen />
    </>
  );
}
