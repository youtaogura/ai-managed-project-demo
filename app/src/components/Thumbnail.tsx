import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { getThumbnailCandidates, PLACEHOLDER_LABEL } from '../lib/thumbnail';
import { colors } from '../theme';
import type { MediaRecord } from '../types/record';

type ThumbnailProps = {
  record: Pick<MediaRecord, 'photoUri' | 'coverUrl'>;
  width?: number;
  height?: number;
};

export function Thumbnail({ record, width = 56, height = 80 }: ThumbnailProps) {
  const [failedCount, setFailedCount] = useState(0);
  const candidates = getThumbnailCandidates(record);
  const uri = candidates[failedCount];
  const size = { width, height };

  if (uri === undefined) {
    return (
      <View style={[styles.box, styles.placeholder, size]} testID="thumbnail-placeholder">
        <Text style={{ fontSize: Math.round(width / 2) }}>{PLACEHOLDER_LABEL}</Text>
      </View>
    );
  }

  return (
    <Image
      key={uri}
      source={{ uri }}
      style={[styles.box, size]}
      accessibilityLabel="サムネイル"
      onError={() => setFailedCount((n) => n + 1)}
    />
  );
}

const styles = StyleSheet.create({
  box: { borderRadius: 6, backgroundColor: colors.surface },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
});
