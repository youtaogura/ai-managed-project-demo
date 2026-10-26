import AsyncStorage from '@react-native-async-storage/async-storage';

import { asyncKeyValueStorage } from '../storage';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

describe('asyncKeyValueStorage', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('保存・取得・削除できる', async () => {
    expect(await asyncKeyValueStorage.getItem('k')).toBeNull();
    await asyncKeyValueStorage.setItem('k', 'v');
    expect(await asyncKeyValueStorage.getItem('k')).toBe('v');
    await asyncKeyValueStorage.removeItem('k');
    expect(await asyncKeyValueStorage.getItem('k')).toBeNull();
  });
});
