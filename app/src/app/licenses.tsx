import { Stack } from 'expo-router';

import { LicensesScreen } from '../screens/LicensesScreen';

export default function LicensesRoute() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <LicensesScreen />
    </>
  );
}
