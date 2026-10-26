import { Stack } from 'expo-router';

import { BarcodeScanScreen } from '../../screens/BarcodeScanScreen';

export default function BarcodeScanRoute() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <BarcodeScanScreen />
    </>
  );
}
