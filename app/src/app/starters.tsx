import { Stack } from 'expo-router';

import { StartersScreen } from '../screens/StartersScreen';

export default function StartersRoute() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <StartersScreen />
    </>
  );
}
