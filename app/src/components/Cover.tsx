import { useState } from 'react';
import { Image, StyleSheet } from 'react-native';

import { coverHeight } from '../lib/cover';
import { getThumbnailCandidates } from '../lib/thumbnail';
import type { MediaRecord } from '../types/record';
import { TextCover } from './TextCover';

type CoverProps = {
  record: Pick<MediaRecord, 'kind' | 'title' | 'creator' | 'photoUri' | 'coverUrl'>;
  width: number;
  radius?: number;
};

export function Cover({ record, width, radius = 0 }: CoverProps) {
  const candidates = getThumbnailCandidates(record);
  const candidatesKey = candidates.join('\n');
  // 候補列が変わったら失敗数を数え直す
  const [failed, setFailed] = useState({ key: candidatesKey, count: 0 });
  const failedCount = failed.key === candidatesKey ? failed.count : 0;
  const uri = candidates[failedCount];

  if (uri === undefined) {
    return (
      <TextCover
        kind={record.kind}
        title={record.title}
        creator={record.creator}
        width={width}
        radius={radius}
      />
    );
  }

  return (
    <Image
      key={uri}
      source={{ uri }}
      resizeMode="cover"
      accessibilityRole="image"
      accessibilityLabel={record.title}
      style={[styles.image, { width, height: coverHeight(width), borderRadius: radius }]}
      onError={() => setFailed({ key: candidatesKey, count: failedCount + 1 })}
    />
  );
}

const styles = StyleSheet.create({
  image: { overflow: 'hidden' },
});
