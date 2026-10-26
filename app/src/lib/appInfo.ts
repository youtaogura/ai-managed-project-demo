import Constants from 'expo-constants';

export type AppInfo = { name: string; version: string | null; build: string | null };

export function formatVersion(version: string | null | undefined, build: string | null | undefined): string {
  if (!version) return '不明';
  return build ? `${version}（${build}）` : version;
}

export function getAppInfo(): AppInfo {
  return {
    name: Constants.expoConfig?.name ?? 'このアプリ',
    version: Constants.nativeAppVersion ?? Constants.expoConfig?.version ?? null,
    build: Constants.nativeBuildVersion ?? null,
  };
}
