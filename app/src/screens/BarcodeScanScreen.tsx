import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  Easing,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { ScreenHeaderBar } from '../components/ScreenHeaderBar';
import { colors, radius, size, space } from '../design/tokens';
import { useBookLookup } from '../hooks/useBookLookup';
import { useBottomInset } from '../hooks/useBottomInset';
import { isbnFromBarcode } from '../lib/barcode';
import { bookInfoToParams, notFoundParams } from '../lib/isbnLookupParams';

type ScanState = 'scanning' | 'searching' | 'error';

const MESSAGE_ERROR = '書誌情報を取得できませんでした。通信状況を確認してください';
const FRAME_WIDTH = 280;
const FRAME_HEIGHT = 170;
const FRAME_BORDER = 2;
const SCAN_LINE_HEIGHT = 2;
const SCAN_LINE_DURATION = 1600;
const SCAN_LINE_TRAVEL = FRAME_HEIGHT - FRAME_BORDER * 2 - SCAN_LINE_HEIGHT - space[4] * 2;

const goManualIsbn = () => router.replace('/record/isbn');
const close = () => router.back();

function ManualIsbnButton({ onPress = goManualIsbn }: { onPress?: () => void }) {
  return <Button variant="outline" label="ISBN を手入力する" onPress={onPress} />;
}

function PlainScreen({ children, actions }: { children: ReactNode; actions: ReactNode }) {
  const bottomInset = useBottomInset();
  return (
    <View style={styles.screen}>
      <ScreenHeaderBar onClose={close} divider={false} />
      <View style={styles.center}>{children}</View>
      <View style={[styles.actions, { paddingBottom: space[4] + bottomInset }]}>{actions}</View>
    </View>
  );
}

function UnsupportedOnWeb() {
  return (
    <PlainScreen actions={<ManualIsbnButton />}>
      <View style={styles.mark}>
        <AppText variant="screenTitle">▯</AppText>
      </View>
      <AppText variant="sectionTitle" style={styles.centerText}>
        この機能はスマートフォンでのみ使えます
      </AppText>
    </PlainScreen>
  );
}

function ScanLine() {
  const [progress] = useState(() => new Animated.Value(0));
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReduceMotion(enabled);
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (reduceMotion) return undefined;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(progress, {
          toValue: 1,
          duration: SCAN_LINE_DURATION,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(progress, {
          toValue: 0,
          duration: SCAN_LINE_DURATION,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [progress, reduceMotion]);

  const translateY = reduceMotion
    ? 0
    : progress.interpolate({
        inputRange: [0, 1],
        outputRange: [-SCAN_LINE_TRAVEL / 2, SCAN_LINE_TRAVEL / 2],
      });

  return (
    <Animated.View
      testID="scan-line"
      style={[styles.scanLine, { transform: [{ translateY }] }]}
    />
  );
}

function ScanOverlay() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={styles.scrim} />
      <View style={styles.frameRow}>
        <View style={styles.scrim} />
        <View style={styles.frame}>
          <ScanLine />
        </View>
        <View style={styles.scrim} />
      </View>
      <View style={[styles.scrim, styles.scrimBottom]}>
        <AppText variant="body" style={styles.caption}>
          978 で始まるバーコードを枠に合わせてください
        </AppText>
        <AppText variant="label" style={[styles.caption, { color: colors.textSecondary }]}>
          読み取れたら自動で書誌情報を探します
        </AppText>
      </View>
    </View>
  );
}

function TorchToggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="ライト"
      accessibilityState={{ selected: on }}
      onPress={onToggle}
      style={[styles.torch, { backgroundColor: on ? colors.accent : colors.scrim }]}
    >
      <AppText variant="sectionTitle" style={{ color: on ? colors.accentInk : colors.textPrimary }}>
        ⚡
      </AppText>
    </Pressable>
  );
}

function NativeBarcodeScan() {
  const bottomInset = useBottomInset();
  const [permission, requestPermission] = useCameraPermissions();
  const provider = useBookLookup();
  const [state, setState] = useState<ScanState>('scanning');
  const [isbn, setIsbn] = useState<string | null>(null);
  const [torch, setTorch] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
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
      router.replace({ pathname: '/record/new', params: bookInfoToParams(result.book) });
    } else if (result.status === 'not_found') {
      router.replace({ pathname: '/record/isbn', params: notFoundParams(isbn13) });
    } else {
      setState('error');
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

  if (!permission) {
    return (
      <View style={[styles.screen, styles.center]}>
        <ActivityIndicator accessibilityLabel="読み込み中" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <PlainScreen
        actions={
          <>
            {permission.canAskAgain ? (
              <Button label="カメラを許可する" onPress={() => void requestPermission()} />
            ) : (
              <Button label="設定を開く" onPress={() => void Linking.openSettings()} />
            )}
            <ManualIsbnButton />
          </>
        }
      >
        <View style={styles.mark}>
          <AppText variant="screenTitle">▯</AppText>
        </View>
        <AppText variant="sectionTitle" style={styles.centerText}>
          バーコードを読み取るためにカメラを使います
        </AppText>
        {permission.canAskAgain ? null : (
          <AppText variant="label" style={[styles.centerText, { color: colors.textSecondary }]}>
            端末の設定でカメラを許可してください
          </AppText>
        )}
      </PlainScreen>
    );
  }

  if (state === 'error') {
    return (
      <PlainScreen
        actions={
          <>
            {isbn !== null ? (
              <Button label="再試行" onPress={() => void search(isbn)} />
            ) : null}
            <ManualIsbnButton
              onPress={() =>
                router.replace({ pathname: '/record/isbn', params: isbn === null ? {} : { isbn } })
              }
            />
            <Button variant="outline" label="もう一度読み取る" onPress={rescan} />
          </>
        }
      >
        <AppText variant="sectionTitle" style={[styles.centerText, { color: colors.danger }]}>
          {MESSAGE_ERROR}
        </AppText>
      </PlainScreen>
    );
  }

  return (
    <View style={styles.camera}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={torch}
        barcodeScannerSettings={{ barcodeTypes: ['ean13'] }}
        onBarcodeScanned={state === 'scanning' ? onScanned : undefined}
        onCameraReady={() => setCameraReady(true)}
      />
      <ScanOverlay />
      <View style={styles.topBar}>
        <ScreenHeaderBar
          title="バーコードを読み取る"
          onClose={close}
          onImage
          divider={false}
          right={cameraReady ? <TorchToggle on={torch} onToggle={() => setTorch((v) => !v)} /> : undefined}
        />
      </View>
      <View style={[styles.bottomBar, { paddingBottom: space[4] + bottomInset }]}>
        {state === 'searching' ? (
          <View style={styles.searching}>
            <ActivityIndicator color={colors.textPrimary} />
            <AppText variant="label">書誌情報を検索中…</AppText>
          </View>
        ) : null}
        <ManualIsbnButton />
      </View>
    </View>
  );
}

export function BarcodeScanScreen() {
  return Platform.OS === 'web' ? <UnsupportedOnWeb /> : <NativeBarcodeScan />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space[3], padding: space[6] },
  centerText: { textAlign: 'center' },
  mark: {
    width: 96,
    height: 96,
    borderRadius: radius.card,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: { gap: space[2], paddingHorizontal: space[4], paddingTop: space[3] },
  camera: { flex: 1, backgroundColor: colors.bg },
  scrim: { flex: 1, backgroundColor: colors.scrim },
  scrimBottom: { alignItems: 'center', paddingTop: space[4], gap: space[1] },
  frameRow: { flexDirection: 'row', height: FRAME_HEIGHT },
  frame: {
    width: FRAME_WIDTH,
    height: FRAME_HEIGHT,
    borderRadius: radius.card,
    borderWidth: FRAME_BORDER,
    borderColor: colors.textPrimary,
    justifyContent: 'center',
    paddingHorizontal: space[4],
  },
  scanLine: { height: SCAN_LINE_HEIGHT, backgroundColor: colors.textPrimary },
  caption: { textAlign: 'center' },
  topBar: { position: 'absolute', top: 0, left: 0, right: 0 },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    gap: space[3],
    paddingHorizontal: space[4],
  },
  searching: { alignItems: 'center', gap: space[2] },
  torch: {
    width: size.touchMin,
    height: size.touchMin,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
