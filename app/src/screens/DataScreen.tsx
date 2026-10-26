import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '../components/AppText';
import { DeleteAllSheet } from '../components/DeleteAllSheet';
import { ExportSheet, type ExportFormat } from '../components/ExportSheet';
import { ImportSheet } from '../components/ImportSheet';
import { ScreenContainer } from '../components/ScreenContainer';
import { ScreenHeaderBar } from '../components/ScreenHeaderBar';
import { SettingsCard } from '../components/SettingsCard';
import { SettingsRow } from '../components/SettingsRow';
import { colors, size, space } from '../design/tokens';
import { useBottomInset } from '../hooks/useBottomInset';
import { usePhotoService } from '../hooks/usePhotoService';
import { useFileService } from '../hooks/useFileService';
import { useLastExportedAt } from '../hooks/useLastExportedAt';
import { useRecordRepository } from '../hooks/useRecordRepository';
import { useRecords } from '../hooks/useRecords';
import { useSettings } from '../hooks/useSettings';
import { useShelfRepository } from '../hooks/useShelfRepository';
import { useStarterSettings } from '../hooks/useStarterSettings';
import { deleteAllRecords } from '../lib/deleteAllRecords';
import { triggerImpactHaptic } from '../lib/haptics';
import { buildBackup, parseBackup } from '../lib/backup';
import { recordsToCsv } from '../lib/csv';
import { createExportStore, type ExportStore } from '../lib/exportStore';
import { formatCompactDate, formatDate } from '../lib/format';
import { applyImport } from '../lib/importBackup';
import { createSettingsStore, type SettingsStore } from '../lib/settingsStore';
import { createStarterSettingsStore, type StarterSettingsStore } from '../lib/starterSettingsStore';
import { asyncKeyValueStorage } from '../lib/storage';
import type { BackupFailureReason, BackupFile, ImportMode } from '../types/backup';

const defaultExportStore = createExportStore(asyncKeyValueStorage);
const defaultSettingsStore = createSettingsStore(asyncKeyValueStorage);
const defaultStarterSettingsStore = createStarterSettingsStore(asyncKeyValueStorage);

const FAILURE_MESSAGES: Record<BackupFailureReason, string> = {
  not_json: 'このアプリのバックアップファイルではありません',
  not_backup: 'このアプリのバックアップファイルではありません',
  invalid: 'ファイルが壊れているため読み込めません',
  too_new: '新しいバージョンのアプリで書き出されたファイルです。アプリを更新してください',
};

type Message = { tone: 'error' | 'info'; text: string };
type Candidate = { name: string; backup: BackupFile };

type DataScreenProps = {
  exportStore?: ExportStore;
  settingsStore?: SettingsStore;
  starterSettingsStore?: StarterSettingsStore;
};

export function DataScreen({
  exportStore = defaultExportStore,
  settingsStore = defaultSettingsStore,
  starterSettingsStore = defaultStarterSettingsStore,
}: DataScreenProps) {
  const bottomInset = useBottomInset();
  const repository = useRecordRepository();
  const shelfRepository = useShelfRepository();
  const fileService = useFileService();
  const photoService = usePhotoService();
  const { settings, replace } = useSettings();
  const { starterSettings, replace: replaceStarterSettings } = useStarterSettings();
  const { records, reload } = useRecords();
  const { lastExportedAt, markExported } = useLastExportedAt(exportStore);

  const [message, setMessage] = useState<Message | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [mode, setMode] = useState<ImportMode>('merge');
  const [includeSettings, setIncludeSettings] = useState(true);
  const [importing, setImporting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const lastExportedLabel = lastExportedAt ? formatDate(lastExportedAt) : 'まだ書き出していません';

  const onExport = async (format: ExportFormat) => {
    setMessage(null);
    setExporting(true);
    try {
      const now = new Date();
      const all = await repository.getAll();
      const shelves = await shelfRepository.getAll();
      const stamp = formatCompactDate(now);
      const file =
        format === 'json'
          ? {
              filename: `records-backup-${stamp}.json`,
              mimeType: 'application/json',
              content: JSON.stringify(buildBackup(all, shelves, starterSettings, settings, now.toISOString()), null, 2),
            }
          : {
              filename: `records-${stamp}.csv`,
              mimeType: 'text/csv',
              content: recordsToCsv(all),
            };
      const result = await fileService.saveAndShare(file);
      if (result === 'shared') {
        setExportOpen(false);
        await markExported(now.toISOString());
      }
    } catch {
      setExportOpen(false);
      setMessage({
        tone: 'error',
        text: '書き出せませんでした。もう一度お試しください',
      });
    } finally {
      setExporting(false);
    }
  };

  const onPickFile = async () => {
    setMessage(null);
    let picked: { name: string; text: string } | null;
    try {
      picked = await fileService.pickTextFile();
    } catch {
      setMessage({ tone: 'error', text: 'ファイルを開けませんでした' });
      return;
    }
    if (!picked) return;
    const result = parseBackup(picked.text);
    if (!result.ok) {
      setMessage({ tone: 'error', text: FAILURE_MESSAGES[result.reason] });
      return;
    }
    setMode('merge');
    setIncludeSettings(true);
    setCandidate({ name: picked.name, backup: result.backup });
  };

  const onConfirmImport = async () => {
    if (!candidate) return;
    const { backup } = candidate;
    setImporting(true);
    try {
      const count = await applyImport({
        repository,
        shelfRepository,
        settingsStore,
        starterSettingsStore,
        backup,
        mode,
        includeSettings,
      });
      if (includeSettings && backup.settings) replace(backup.settings);
      if (includeSettings && backup.starterSettings) replaceStarterSettings(backup.starterSettings);
      setCandidate(null);
      await reload();
      setMessage({ tone: 'info', text: `${count} 件の記録を読み込みました` });
    } catch {
      setCandidate(null);
      setMessage({
        tone: 'error',
        text: '読み込めませんでした。記録は変わっていません',
      });
    } finally {
      setImporting(false);
    }
  };

  const onConfirmDelete = async () => {
    setMessage(null);
    setDeleting(true);
    try {
      await deleteAllRecords({ repository, photoService });
      setDeleteOpen(false);
      triggerImpactHaptic();
      await reload();
      router.dismissTo('/');
    } catch {
      setDeleteOpen(false);
      setMessage({
        tone: 'error',
        text: '削除できませんでした。記録は変わっていません',
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <ScreenContainer>
      <ScreenHeaderBar title="データ" onClose={() => router.back()} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: space[6] + bottomInset }]}>
        <View style={styles.countBlock}>
          <AppText variant="label" style={styles.countLabel}>
            記録の件数
          </AppText>
          <AppText variant="displayNumber">{String(records.length)}</AppText>
        </View>
        {message ? (
          <AppText
            accessibilityRole={message.tone === 'error' ? 'alert' : undefined}
            variant="body"
            style={{
              color: message.tone === 'error' ? colors.danger : colors.textPrimary,
            }}
          >
            {message.text}
          </AppText>
        ) : null}
        <SettingsCard title="書き出し・読み込み">
          <SettingsRow
            label="記録を書き出す"
            value={lastExportedLabel}
            onPress={() => {
              setMessage(null);
              setExportOpen(true);
            }}
          />
          <View style={styles.gap} />
          <SettingsRow
            label="記録を読み込む"
            value="書き出したバックアップから戻す"
            onPress={() => void onPickFile()}
          />
        </SettingsCard>
        <AppText variant="micro" style={styles.note}>
          記録はこの端末の中にだけ保存されています。機種変更の前には書き出してください。
        </AppText>
        {records.length > 0 ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setMessage(null);
              setDeleteOpen(true);
            }}
            style={styles.deleteLink}
          >
            <AppText variant="body" style={styles.deleteText}>
              すべての記録を削除
            </AppText>
          </Pressable>
        ) : null}
      </ScrollView>
      <DeleteAllSheet
        visible={deleteOpen}
        count={records.length}
        busy={deleting}
        onExport={() => {
          setDeleteOpen(false);
          setMessage(null);
          setExportOpen(true);
        }}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => void onConfirmDelete()}
      />
      <ExportSheet
        visible={exportOpen}
        count={records.length}
        busy={exporting}
        onClose={() => setExportOpen(false)}
        onSelect={(format) => void onExport(format)}
      />
      <ImportSheet
        visible={candidate !== null}
        fileName={candidate?.name ?? ''}
        backup={candidate?.backup ?? null}
        mode={mode}
        includeSettings={includeSettings}
        busy={importing}
        onModeChange={setMode}
        onIncludeSettingsChange={setIncludeSettings}
        onCancel={() => setCandidate(null)}
        onConfirm={() => void onConfirmImport()}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: space[5], paddingTop: space[4], gap: space[5] },
  countBlock: { gap: space[1] },
  countLabel: { color: colors.textSecondary },
  gap: { height: space[2] },
  note: { color: colors.textTertiary },
  deleteLink: {
    minHeight: size.touchMin,
    marginTop: space[6],
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteText: { color: colors.danger },
});
