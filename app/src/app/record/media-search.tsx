import { Stack } from 'expo-router';

import { MediaSearchScreen } from '../../screens/MediaSearchScreen';

export default function MediaSearchRoute() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <MediaSearchScreen />
    </>
  );
}
