import { Stack } from 'expo-router';

import { IsbnLookupScreen } from '../../screens/IsbnLookupScreen';

export default function IsbnLookupRoute() {
  return (
    <>
      <Stack.Screen options={{ title: 'ISBN で探す' }} />
      <IsbnLookupScreen />
    </>
  );
}
