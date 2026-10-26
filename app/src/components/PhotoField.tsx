import { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { usePhotoService } from '../hooks/usePhotoService';
import type { PhotoSource } from '../lib/photo/PhotoService';
import { colors, formColors, spacing } from '../theme';
import type { MediaRecord } from '../types/record';
import { Thumbnail } from './Thumbnail';

type PhotoFieldProps = {
  record: Pick<MediaRecord, 'kind' | 'photoUri' | 'coverUrl'>;
  /** 新しく作成した保存先 URI、または null（写真を外す） */
  onChange: (uri: string | null) => void;
};

type PhotoError = { message: string; denied: { canAskAgain: boolean; source: PhotoSource } | null };

const SOURCE_NAMES: Record<PhotoSource, string> = {
  camera: 'カメラ',
  library: '写真ライブラリ',
};

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

  return (
    <View style={styles.field}>
      <Text style={styles.label}>写真</Text>
      <View style={styles.preview}>
        <Thumbnail record={record} width={112} height={160} />
      </View>
      <View style={styles.buttons}>
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={() => void choose('camera')}
          style={[styles.button, busy && styles.disabled]}
        >
          <Text style={styles.buttonText}>カメラで撮影</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={() => void choose('library')}
          style={[styles.button, busy && styles.disabled]}
        >
          <Text style={styles.buttonText}>ライブラリから選択</Text>
        </Pressable>
        {record.photoUri ? (
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={() => onChange(null)}
            style={[styles.button, busy && styles.disabled]}
          >
            <Text style={styles.removeText}>写真を削除</Text>
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error.message}</Text> : null}
      {error?.denied ? (
        <Pressable accessibilityRole="button" onPress={openSettings} style={styles.button}>
          <Text style={styles.buttonText}>設定を開く</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: spacing.sm },
  label: { fontSize: 14, fontWeight: '600', color: colors.text },
  preview: { alignItems: 'center' },
  buttons: { gap: spacing.sm },
  button: {
    borderWidth: 1,
    borderColor: colors.tint,
    borderRadius: 8,
    padding: spacing.md,
    alignItems: 'center',
  },
  buttonText: { color: colors.tint, fontSize: 16, fontWeight: '600' },
  removeText: { color: formColors.danger, fontSize: 16, fontWeight: '600' },
  error: { color: formColors.danger, fontSize: 13 },
  disabled: { opacity: 0.5 },
});
