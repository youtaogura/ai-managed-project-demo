import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { useBottomInset } from '../hooks/useBottomInset';
import { useBookLookup } from '../hooks/useBookLookup';
import { useCoverResolver } from '../hooks/useCoverResolver';
import { isbnFromBarcode } from '../lib/barcode';
import { withCover } from '../lib/coverLookup/withCover';
import { bookInfoToParams, isbnOnlyParams } from '../lib/isbnLookupParams';
import { colors, overlayColors, spacing } from '../theme';

type ScanState = 'scanning' | 'searching' | 'not_found' | 'error';

const MESSAGE_NOT_FOUND = '見つかりませんでした';
const MESSAGE_ERROR = '書誌情報を取得できませんでした。通信状況を確認してください';

function ActionButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.button}>
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

function UnsupportedOnWeb() {
  const bottomInset = useBottomInset();
  return (
    <View style={[styles.center, { paddingBottom: spacing.lg + bottomInset }]}>
      <Text style={styles.message}>この機能はスマートフォンでのみ使えます</Text>
      <ActionButton label="手入力で追加" onPress={() => router.replace('/record/new')} />
    </View>
  );
}

function NativeBarcodeScan() {
  const bottomInset = useBottomInset();
  const [permission, requestPermission] = useCameraPermissions();
  const provider = useBookLookup();
  const resolveCover = useCoverResolver();
  const [state, setState] = useState<ScanState>('scanning');
  const [isbn, setIsbn] = useState<string | null>(null);
  const handled = useRef(false);
  const active = useRef(true);

  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);

  const search = async (isbn13: string) => {
    setIsbn(isbn13);
    setState('searching');
    const result = await provider.lookupByIsbn(isbn13);
    if (!active.current) return;
    if (result.status === 'found') {
      const book = await withCover(result.book, resolveCover);
      if (!active.current) return;
      router.replace({ pathname: '/record/new', params: bookInfoToParams(book) });
    } else {
      setState(result.status);
    }
  };

  const onScanned = (scan: { type: string; data: string }) => {
    if (handled.current) return;
    const isbn13 = isbnFromBarcode(scan);
    if (isbn13 === null) return;
    handled.current = true;
    void search(isbn13);
  };

  const rescan = () => {
    handled.current = false;
    setState('scanning');
  };

  const continueManually = () => {
    router.replace({
      pathname: '/record/new',
      params: isbnOnlyParams(isbn ?? ''),
    });
  };

  const cancel = <ActionButton label="キャンセル" onPress={() => router.back()} />;
  const manualIsbn = (
    <ActionButton label="ISBN を手入力する" onPress={() => router.replace('/record/isbn')} />
  );

  if (!permission) {
    return (
      <View style={[styles.center, { paddingBottom: spacing.lg + bottomInset }]}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!permission.granted) {
    const canAsk = permission.canAskAgain;
    return (
      <View style={[styles.center, { paddingBottom: spacing.lg + bottomInset }]}>
        <Text style={styles.message}>バーコードを読み取るためにカメラを使います</Text>
        {canAsk ? (
          <ActionButton label="カメラを許可する" onPress={() => void requestPermission()} />
        ) : (
          <>
            <Text style={styles.message}>端末の設定でカメラを許可してください</Text>
            <ActionButton label="設定を開く" onPress={() => void Linking.openSettings()} />
          </>
        )}
        {manualIsbn}
        {cancel}
      </View>
    );
  }

  if (state === 'not_found' || state === 'error') {
    return (
      <View style={[styles.center, { paddingBottom: spacing.lg + bottomInset }]}>
        <Text style={styles.message}>
          {state === 'not_found' ? MESSAGE_NOT_FOUND : MESSAGE_ERROR}
        </Text>
        {state === 'error' && isbn !== null ? (
          <ActionButton label="再試行" onPress={() => void search(isbn)} />
        ) : null}
        <ActionButton label="手入力で続ける" onPress={continueManually} />
        <ActionButton label="もう一度読み取る" onPress={rescan} />
        {cancel}
      </View>
    );
  }

  return (
    <View style={styles.camera}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['ean13'] }}
        onBarcodeScanned={state === 'scanning' ? onScanned : undefined}
      />
      <View style={[styles.overlay, { paddingBottom: spacing.lg + bottomInset }]}>
        <Text style={styles.overlayText}>
          本のバーコード（978 または 979 で始まる段）を枠に合わせてください
        </Text>
        {state === 'searching' ? (
          <View style={styles.searching}>
            <ActivityIndicator color={overlayColors.text} />
            <Text style={styles.overlayText}>書誌情報を検索中…</Text>
          </View>
        ) : null}
        {cancel}
      </View>
    </View>
  );
}

export function BarcodeScanScreen() {
  return Platform.OS === 'web' ? <UnsupportedOnWeb /> : <NativeBarcodeScan />;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.md,
    backgroundColor: colors.background,
  },
  message: { fontSize: 16, color: colors.text, textAlign: 'center' },
  button: {
    padding: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: colors.tint,
  },
  buttonText: { color: colors.onTint, fontSize: 16, fontWeight: '600' },
  camera: { flex: 1, backgroundColor: '#000' },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
    padding: spacing.lg,
    gap: spacing.md,
  },
  overlayText: {
    color: overlayColors.text,
    backgroundColor: overlayColors.background,
    padding: spacing.sm,
    textAlign: 'center',
  },
  searching: { alignItems: 'center', gap: spacing.sm },
});
