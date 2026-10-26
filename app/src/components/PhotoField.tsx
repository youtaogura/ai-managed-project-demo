import { useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';

import { colors, radius, space } from '../design/tokens';
import { usePhotoService } from '../hooks/usePhotoService';
import type { PhotoSource } from '../lib/photo/PhotoService';
import type { MediaRecord } from '../types/record';
import { AppText } from './AppText';
import { Button } from './Button';
import { Cover } from './Cover';

type PhotoFieldProps = {
  record: Pick<MediaRecord, 'kind' | 'title' | 'creator' | 'photoUri' | 'coverUrl'>;
  /** 新しく作成した保存先 URI、または null（写真を外す） */
  onChange: (uri: string | null) => void;
};

type PhotoError = { message: string; denied: { canAskAgain: boolean; source: PhotoSource } | null };

const SOURCE_NAMES: Record<PhotoSource, string> = {
  camera: 'カメラ',
  library: '写真ライブラリ',
};

const COVER_WIDTH = 112;

function describe(record: PhotoFieldProps['record']): string | null {
  if (record.photoUri) return null;
  if (record.coverUrl) return '書影を取得しました。自分で撮った写真に変えることもできます';
  return 'ポスターがないので、タイトルから表紙を作っています。写真を付けるとこちらに表示されます';
}

export function PhotoField({ record, onChange }: PhotoFieldProps) {
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
        onChange(await service.save(result.uri));
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

  const description = describe(record);

  return (
    <View style={styles.field}>
      <View style={styles.cover}>
        <Cover record={record} width={COVER_WIDTH} radius={radius.thumb} />
      </View>
      <View style={styles.side}>
        {description ? (
          <AppText variant="label" style={{ color: colors.textSecondary }}>
            {description}
          </AppText>
        ) : null}
        <Button
          variant="outline"
          label="カメラで撮影"
          disabled={busy}
          onPress={() => void choose('camera')}
        />
        <Button
          variant="outline"
          label="ライブラリから選択"
          disabled={busy}
          onPress={() => void choose('library')}
        />
        {record.photoUri ? (
          <Button
            variant="outline"
            tone="danger"
            label="写真を削除"
            disabled={busy}
            onPress={() => onChange(null)}
          />
        ) : null}
        {error ? (
          <AppText variant="micro" style={{ color: colors.danger }}>
            {error.message}
          </AppText>
        ) : null}
        {error?.denied ? <Button variant="outline" label="設定を開く" onPress={openSettings} /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { flexDirection: 'row', gap: space[4], alignItems: 'flex-start' },
  cover: { width: COVER_WIDTH },
  side: { flex: 1, gap: space[2] },
});
