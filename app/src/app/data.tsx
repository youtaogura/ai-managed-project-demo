import { Stack } from 'expo-router';

import { DataScreen } from '../screens/DataScreen';

export default function DataRoute() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <DataScreen />
    </>
  );
}
