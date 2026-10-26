import { Stack, useLocalSearchParams } from 'expo-router';

import { IsbnLookupScreen } from '../../screens/IsbnLookupScreen';

function firstString(value: string | string[] | undefined): string | undefined {
  return typeof value === 'string' ? value : value?.[0];
}

export default function IsbnLookupRoute() {
  const params = useLocalSearchParams<{ isbn?: string | string[]; notFound?: string | string[] }>();
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <IsbnLookupScreen
        initialIsbn={firstString(params.isbn)}
        initialNotFound={firstString(params.notFound) === '1'}
      />
    </>
  );
}
