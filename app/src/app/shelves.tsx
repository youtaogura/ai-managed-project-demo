import { Stack } from 'expo-router';

import { ShelvesScreen } from '../screens/ShelvesScreen';

export default function ShelvesRoute() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ShelvesScreen />
    </>
  );
}
