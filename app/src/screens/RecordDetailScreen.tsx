import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Thumbnail } from '../components/Thumbnail';
import { usePhotoService } from '../hooks/usePhotoService';
import { useRecordRepository } from '../hooks/useRecordRepository';
import { formatDateTime, formatRating } from '../lib/format';
import { getStatusLabel, KIND_LABELS } from '../lib/statusLabel';
import { colors, spacing } from '../theme';
import type { MediaRecord } from '../types/record';

type RecordDetailScreenProps = {
  recordId: string;
  onEdit?: (id: string) => void;
  onDeleted?: () => void;
  onBack?: () => void;
};

const NOT_ENTERED = '未入力';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

export function RecordDetailScreen({
  recordId,
  onEdit,
  onDeleted,
  onBack,
}: RecordDetailScreenProps) {
  const repository = useRecordRepository();
  const photoService = usePhotoService();
  const [record, setRecord] = useState<MediaRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 編集から戻ったときに最新の内容を表示するため、フォーカスのたび読み込む
  useFocusEffect(
    useCallback(() => {
      let active = true;
      repository
        .getAll()
        .catch(() => [] as MediaRecord[])
        .then((all) => {
          if (!active) return;
          setRecord(all.find((r) => r.id === recordId) ?? null);
          setLoading(false);
        });
      return () => {
        active = false;
      };
    }, [repository, recordId]),
  );

  const photoUri = record?.photoUri ?? null;

  const remove = useCallback(async () => {
    try {
      await repository.delete(recordId);
      if (photoUri) void photoService.remove(photoUri);
      onDeleted?.();
    } catch {
      setError('削除できませんでした');
    }
  }, [repository, photoService, recordId, photoUri, onDeleted]);

  const confirmDelete = () => {
    setError(null);
    Alert.alert('この記録を削除しますか？', undefined, [
      { text: 'キャンセル', style: 'cancel' },
      { text: '削除', style: 'destructive', onPress: () => void remove() },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator accessibilityLabel="読み込み中" />
      </View>
    );
  }

  if (!record) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>記録が見つかりません</Text>
        <Pressable accessibilityRole="button" onPress={onBack} style={styles.primary}>
          <Text style={styles.primaryText}>一覧へ戻る</Text>
        </Pressable>
      </View>
    );
  }

  const isBook = record.kind === 'book' || record.kind === 'manga';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.thumb}>
        <Thumbnail record={record} width={112} height={160} />
      </View>
      <Row label="種別" value={KIND_LABELS[record.kind]} />
      <Row label="タイトル" value={record.title} />
      <Row label="作者・著者など" value={record.creator ?? NOT_ENTERED} />
      {isBook ? <Row label="出版社" value={record.publisher ?? NOT_ENTERED} /> : null}
      {isBook ? <Row label="ISBN" value={record.isbn ?? NOT_ENTERED} /> : null}
      <Row label="開始日" value={record.startDate ?? NOT_ENTERED} />
      <Row label="終了日" value={record.endDate ?? NOT_ENTERED} />
      <Row label="ステータス" value={getStatusLabel(record.kind, record.status)} />
      <Row label="レーティング" value={formatRating(record.rating)} />
      <Row label="感想" value={record.review ?? '感想はありません'} />
      <Row label="登録日時" value={formatDateTime(record.createdAt)} />
      <Row label="更新日時" value={formatDateTime(record.updatedAt)} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable
        accessibilityRole="button"
        onPress={() => onEdit?.(record.id)}
        style={styles.primary}
      >
        <Text style={styles.primaryText}>編集</Text>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={confirmDelete} style={styles.danger}>
        <Text style={styles.dangerText}>削除</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.md },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    backgroundColor: colors.background,
  },
  thumb: { alignItems: 'center' },
  row: { gap: 2 },
  label: { fontSize: 12, color: colors.textMuted },
  value: { fontSize: 16, color: colors.text },
  title: { fontSize: 18, fontWeight: '600', color: colors.text },
  error: { color: colors.danger },
  primary: {
    backgroundColor: colors.tint,
    padding: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryText: { color: '#fff', fontWeight: '600' },
  danger: {
    borderWidth: 1,
    borderColor: colors.danger,
    padding: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  dangerText: { color: colors.danger, fontWeight: '600' },
});
