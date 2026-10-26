import Constants from 'expo-constants';

import { formatVersion, getAppInfo } from '../appInfo';

describe('formatVersion', () => {
  it('ビルド番号があれば括弧で添える', () => {
    expect(formatVersion('1.0.0', '12')).toBe('1.0.0（12）');
  });
  it('なければバージョンだけ', () => {
    expect(formatVersion('1.0.0', null)).toBe('1.0.0');
  });
  it('バージョンも取れなければ「不明」', () => {
    expect(formatVersion(null, '12')).toBe('不明');
  });
});

describe('getAppInfo', () => {
  it('expo-constants から name・version・build を返す', () => {
    const info = getAppInfo();
    expect(info.name).toBe(Constants.expoConfig?.name ?? 'このアプリ');
    expect(info.version).toBe(Constants.nativeAppVersion ?? Constants.expoConfig?.version ?? null);
    expect(info.build).toBe(Constants.nativeBuildVersion ?? null);
  });
});
