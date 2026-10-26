import { useState } from 'react';
import { Linking } from 'react-native';

import type { PhotoSource } from '../lib/photo/PhotoService';
import { usePhotoService } from './usePhotoService';

export type PhotoError = {
  message: string;
  denied: { canAskAgain: boolean; source: PhotoSource } | null;
};

const SOURCE_NAMES: Record<PhotoSource, string> = {
  camera: 'カメラ',
  library: '写真ライブラリ',
};

/** 写真を選んで保存し、保存先 URI を onPicked に渡す */
export function usePhotoPicker(onPicked: (uri: string) => void | Promise<void>) {
  const service = usePhotoService();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<PhotoError | null>(null);

  const choose = async (source: PhotoSource) => {
    setBusy(true);
    setError(null);
    try {
      const result = await service.pick(source);
      if (result.status === 'denied') {
        setError({
          message: `${SOURCE_NAMES[source]}へのアクセスが許可されていません`,
          denied: { canAskAgain: result.canAskAgain, source },
        });
      } else if (result.status === 'picked') {
        await onPicked(await service.save(result.uri));
      }
    } catch {
      setError({ message: '写真を保存できませんでした', denied: null });
    } finally {
      setBusy(false);
    }
  };

  const openSettings = () => {
    if (error?.denied?.canAskAgain) void choose(error.denied.source);
    else void Linking.openSettings();
  };

  const clearError = () => setError(null);

  return { busy, error, choose, openSettings, clearError };
}
