import { Stack } from 'expo-router';

import { AboutScreen } from '../screens/AboutScreen';

export default function AboutRoute() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <AboutScreen />
    </>
  );
}
