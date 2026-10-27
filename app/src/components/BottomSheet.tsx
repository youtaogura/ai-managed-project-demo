import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { useBottomInset } from '../hooks/useBottomInset';
import { colors, radius, size, space } from '../design/tokens';
import { AppText } from './AppText';
import { Button } from './Button';

const SHEET_RADIUS = 20;
const HANDLE_WIDTH = 36;
const HANDLE_HEIGHT = 4;
const SLIDE_DURATION = 250;
const SLIDE_DISTANCE = 400;
const SWIPE_THRESHOLD = 80;
const SWIPE_VELOCITY = 0.8;

type BottomSheetProps = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  showCloseButton?: boolean;
  children?: ReactNode;
};

export function BottomSheet({ visible, onClose, title, showCloseButton, children }: BottomSheetProps) {
  const bottomInset = useBottomInset();
  const [translateY] = useState(() => new Animated.Value(SLIDE_DISTANCE));
  const [opacity] = useState(() => new Animated.Value(0));
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (active) setReduceMotion(v);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!visible) return;
    translateY.setValue(reduceMotion ? 0 : SLIDE_DISTANCE);
    opacity.setValue(reduceMotion ? 0 : 1);
    const anim = reduceMotion
      ? Animated.timing(opacity, { toValue: 1, duration: SLIDE_DURATION, useNativeDriver: true })
      : Animated.timing(translateY, {
          toValue: 0,
          duration: SLIDE_DURATION,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        });
    anim.start();
    return () => anim.stop();
  }, [visible, reduceMotion, translateY, opacity]);

  const pan = useMemo(
    () =>
      PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_e, g) => g.dy > 4,
      onPanResponderMove: (_e, g) => translateY.setValue(Math.max(0, g.dy)),
      onPanResponderRelease: (_e, g) =>
        releaseSwipe(g.dy, g.vy, onClose, () =>
          Animated.timing(translateY, { toValue: 0, duration: 150, useNativeDriver: true }).start(),
        ),
    }),
    [onClose, translateY],
  );

  return (
    <Modal testID="bottom-sheet-modal" visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable
          accessible={false}
          testID="bottom-sheet-scrim"
          style={styles.scrim}
          onPress={onClose}
        />
        <KeyboardAvoidingView
          testID="bottom-sheet-keyboard-avoiding"
          behavior="padding"
          pointerEvents="box-none"
          style={styles.avoiding}
        >
          <Animated.View
            accessibilityViewIsModal
            accessibilityRole="none"
            role="dialog"
            accessibilityLabel={title}
            style={[
              styles.sheet,
              { paddingBottom: space[6] + bottomInset, opacity, transform: [{ translateY }] },
            ]}
          >
            <View {...pan.panHandlers} testID="bottom-sheet-handle-area" style={styles.handleArea}>
              <View style={styles.handle} />
            </View>
            {title ? (
              <AppText variant="sectionTitle" style={styles.title}>
                {title}
              </AppText>
            ) : null}
            <ScrollView
              testID="bottom-sheet-scroll"
              keyboardShouldPersistTaps="handled"
              bounces={false}
              style={styles.scroll}
            >
              {children}
            </ScrollView>
            {showCloseButton ? (
              <View style={styles.close}>
                <Button variant="outline" label="閉じる" onPress={onClose} />
              </View>
            ) : null}
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

export function releaseSwipe(dy: number, vy: number, onClose: () => void, reset: () => void) {
  if (shouldDismissSwipe(dy, vy)) onClose();
  else reset();
}

export function shouldDismissSwipe(dy: number, vy: number): boolean {
  return dy > SWIPE_THRESHOLD || (dy > 0 && vy > SWIPE_VELOCITY);
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  avoiding: { flex: 1, justifyContent: 'flex-end' },
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: colors.scrim },
  sheet: {
    backgroundColor: colors.surface1,
    borderTopLeftRadius: SHEET_RADIUS,
    borderTopRightRadius: SHEET_RADIUS,
    paddingHorizontal: space[6],
    maxHeight: '90%',
  },
  scroll: { flexGrow: 0 },
  handleArea: { alignItems: 'center', minHeight: size.touchMin, justifyContent: 'center' },
  handle: {
    width: HANDLE_WIDTH,
    height: HANDLE_HEIGHT,
    borderRadius: radius.full,
    backgroundColor: colors.lineStrong,
  },
  title: { marginBottom: space[3] },
  close: { marginTop: space[3] },
});
