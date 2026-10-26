import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type ComponentRef } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '../components/AppText';
import { BottomSheet } from '../components/BottomSheet';
import { Button } from '../components/Button';
import { Cover } from '../components/Cover';
import { InfoCell, InfoCellRow } from '../components/InfoCell';
import { RatingStars } from '../components/RatingStars';
import { RecordInfoSection } from '../components/RecordInfoSection';
import { colors, radius, shadows, size, space } from '../design/tokens';
import { useCoverResolver } from '../hooks/useCoverResolver';
import { useBottomInset } from '../hooks/useBottomInset';
import { useSettings } from '../hooks/useSettings';
import { usePhotoPicker } from '../hooks/usePhotoPicker';
import { usePhotoService } from '../hooks/usePhotoService';
import { useRecordRepository } from '../hooks/useRecordRepository';
import { coverCreditLabel } from '../lib/coverLookup/coverCredit';
import { needsCover } from '../lib/coverLookup/needsCover';
import { triggerImpactHaptic } from '../lib/haptics';
import { getHeroBackground } from '../lib/heroColor';
import { infoCellLabels } from '../lib/infoCellLabels';
import { getStatusLabel, KIND_LABELS } from '../lib/statusLabel';
import type { MediaRecord, NewRecordInput } from '../types/record';

type RecordDetailScreenProps = {
  recordId: string;
  onEdit?: (id: string) => void;
  onDeleted?: () => void;
  onBack?: () => void;
};

const COVER_WIDTH = 196;
const STARS_SIZE = 18;
const REVIEW_LINES = 3;
const HERO_TOP = space[4] + space[6];
const BAR_PADDING = space[4];

function toInput(
  record: MediaRecord,
  photoUri: string | null,
  coverUrl: string | null = record.coverUrl,
): NewRecordInput {
  const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...input } = record;
  return { ...input, photoUri, coverUrl };
}

export function RecordDetailScreen({
  recordId,
  onEdit,
  onDeleted,
  onBack,
}: RecordDetailScreenProps) {
  const bottomInset = useBottomInset();
  const { enabledFields } = useSettings().settings;
  const repository = useRecordRepository();
  const photoService = usePhotoService();
  const resolveCover = useCoverResolver();
  const [record, setRecord] = useState<MediaRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const [bodyY, setBodyY] = useState(0);
  const [infoY, setInfoY] = useState(0);

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

  // 書影の自動取得は、画面を開いている間に記録ごと 1 回まで
  const coverAttempted = useRef<string | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!record || !needsCover(record) || coverAttempted.current === record.id) return;
    coverAttempted.current = record.id;
    const { id, isbn } = record;
    const fetchCover = async () => {
      try {
        const coverUrl = await resolveCover(isbn ?? '');
        if (coverUrl === null || !mounted.current) return;
        // 取得中に写真などが付いていたら上書きしない
        const latest = (await repository.getAll()).find((r) => r.id === id);
        if (!latest || !mounted.current || !needsCover(latest)) return;
        const updated = await repository.update(id, toInput(latest, null, coverUrl));
        if (updated && mounted.current) setRecord(updated);
      } catch {
        // 取得・保存に失敗しても何も表示しない（文字の表紙のまま）
      }
    };
    void fetchCover();
  }, [record, repository, resolveCover]);

  const savePhoto = async (uri: string | null) => {
    if (!record) return;
    const oldUri = record.photoUri;
    const updated = await repository.update(recordId, toInput(record, uri));
    if (!updated) throw new Error('not found');
    setRecord(updated);
    if (oldUri && oldUri !== uri) void photoService.remove(oldUri);
    setPhotoOpen(false);
  };

  const picker = usePhotoPicker(savePhoto);

  const removePhoto = async () => {
    setPhotoError(null);
    try {
      await savePhoto(null);
    } catch {
      setPhotoError('写真を保存できませんでした');
    }
  };

  const confirmDelete = async () => {
    if (!record) return;
    try {
      await repository.delete(recordId);
      if (record.photoUri) void photoService.remove(record.photoUri);
      triggerImpactHaptic();
      onDeleted?.();
    } catch {
      setDeleteError('削除できませんでした');
    }
  };

  const openDelete = () => {
    setDeleteError(null);
    setDeleteOpen(true);
  };

  const openPhoto = () => {
    setPhotoError(null);
    picker.clearError();
    setPhotoOpen(true);
  };

  if (loading) {
    return (
      <View style={styles.center} accessibilityLabel="読み込み中">
        <ActivityIndicator />
      </View>
    );
  }

  if (!record) {
    return (
      <View style={styles.center}>
        <AppText variant="sectionTitle">記録が見つかりません</AppText>
        <Button label="一覧へ戻る" onPress={() => onBack?.()} />
      </View>
    );
  }

  const labels = infoCellLabels(record.kind);
  const byline = [record.creator, KIND_LABELS[record.kind]].filter(Boolean).join(' · ');
  const photoMessage = photoError ?? picker.error?.message ?? null;
  const credit = coverCreditLabel(record.coverUrl);

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{
          paddingBottom: size.buttonHeight + BAR_PADDING * 2 + bottomInset + space[6],
        }}
      >
        <View style={[styles.hero, { backgroundColor: getHeroBackground(record.kind) }]}>
          <View style={styles.cover}>
            <Cover record={record} width={COVER_WIDTH} radius={radius.thumb} />
          </View>
          <View style={styles.heroButtons}>
            <Button variant="icon" onImage accessibilityLabel="戻る" onPress={() => onBack?.()}>
              <AppText variant="sectionTitle">‹</AppText>
            </Button>
            {enabledFields.photo ? (
              <Button variant="icon" onImage accessibilityLabel="写真を変更" onPress={openPhoto}>
                <AppText variant="label">写真</AppText>
              </Button>
            ) : null}
          </View>
        </View>
        <View style={styles.body} onLayout={(e) => setBodyY(e.nativeEvent.layout.y)}>
          <View style={styles.titleGroup}>
            <AppText variant="screenTitle">{record.title}</AppText>
            <AppText variant="body" style={{ color: colors.textSecondary }}>
              {byline}
            </AppText>
            {enabledFields.rating && record.rating !== null ? (
              <RatingStars rating={record.rating} size={STARS_SIZE} valueVariant="displayNumber" />
            ) : null}
          </View>
          {enabledFields.status || enabledFields.startDate || enabledFields.endDate ? (
            <InfoCellRow>
              {enabledFields.status ? (
                <InfoCell label="ステータス" value={getStatusLabel(record.kind, record.status)} />
              ) : null}
              {enabledFields.startDate ? (
                <InfoCell label={labels.start} value={record.startDate} />
              ) : null}
              {enabledFields.endDate ? (
                <InfoCell label={labels.end} value={record.endDate} />
              ) : null}
            </InfoCellRow>
          ) : null}
          {enabledFields.review && record.review ? (
            <AppText variant="body" numberOfLines={REVIEW_LINES}>
              {record.review}
            </AppText>
          ) : null}
          <View onLayout={(e) => setInfoY(e.nativeEvent.layout.y)}>
            <RecordInfoSection record={record} onDelete={openDelete} />
          </View>
          {credit ? (
            <AppText variant="micro" style={{ color: colors.textSecondary }}>
              {credit}
            </AppText>
          ) : null}
        </View>
      </ScrollView>
      <View style={[styles.bar, { paddingBottom: BAR_PADDING + bottomInset }]}>
        <Button
          variant="outline"
          label="作品の情報"
          style={styles.barButton}
          onPress={() => scrollRef.current?.scrollTo({ y: bodyY + infoY, animated: true })}
        />
        <Button label="編集" style={styles.barButton} onPress={() => onEdit?.(record.id)} />
      </View>

      <BottomSheet
        visible={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="この記録を削除しますか？"
      >
        <View style={styles.sheetBody}>
          <AppText variant="body" style={{ color: colors.textSecondary }}>
            {`「${record.title}」の記録と、付けた写真が削除されます。元に戻せません。`}
          </AppText>
          {deleteError ? (
            <AppText variant="body" style={{ color: colors.danger }}>
              {deleteError}
            </AppText>
          ) : null}
          <Button variant="outline" label="キャンセル" onPress={() => setDeleteOpen(false)} />
          <Button
            variant="outline"
            tone="danger"
            label="削除する"
            onPress={() => void confirmDelete()}
          />
        </View>
      </BottomSheet>

      <BottomSheet
        visible={enabledFields.photo && photoOpen}
        onClose={() => setPhotoOpen(false)}
        title="写真を変更"
      >
        <View style={styles.sheetBody}>
          <Button
            variant="outline"
            label="カメラで撮影"
            disabled={picker.busy}
            onPress={() => void picker.choose('camera')}
          />
          <Button
            variant="outline"
            label="ライブラリから選択"
            disabled={picker.busy}
            onPress={() => void picker.choose('library')}
          />
          {record.photoUri ? (
            <Button
              variant="outline"
              tone="danger"
              label="写真を削除"
              disabled={picker.busy}
              onPress={() => void removePhoto()}
            />
          ) : null}
          {photoMessage ? (
            <AppText variant="body" style={{ color: colors.danger }}>
              {photoMessage}
            </AppText>
          ) : null}
          {picker.error?.denied ? (
            <Button variant="outline" label="設定を開く" onPress={picker.openSettings} />
          ) : null}
        </View>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[4],
    backgroundColor: colors.bg,
  },
  hero: {
    height: size.detailHeroHeight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cover: { boxShadow: shadows.cover },
  heroButtons: {
    position: 'absolute',
    top: HERO_TOP,
    left: space[4],
    right: space[4],
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  body: { padding: space[5], gap: space[5] },
  titleGroup: { gap: space[2] },
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    gap: space[3],
    paddingTop: BAR_PADDING,
    paddingHorizontal: space[5],
    backgroundColor: colors.bg,
  },
  barButton: { flex: 1 },
  sheetBody: { gap: space[3] },
});
