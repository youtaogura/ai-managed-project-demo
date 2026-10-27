import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
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
import { useReduceMotion } from '../hooks/useReduceMotion';
import { colors, radius, size, space, typography } from '../design/tokens';
import { AppText } from './AppText';
import { Button } from './Button';

const TITLE_SIZE = 20;
const TITLE_LINE_HEIGHT = Math.round((TITLE_SIZE * typography.bookTitle.lineHeight) / typography.bookTitle.fontSize);
const HANDLE_WIDTH = 36;
const HANDLE_HEIGHT = 4;
export const SLIDE_DURATION = 250;
const SLIDE_DISTANCE = 400;
const SWIPE_THRESHOLD = 80;
const SWIPE_VELOCITY = 0.8;

type BottomSheetProps = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  /** 見出しの上に小さく出す文字（本のタイトルなど） */
  eyebrow?: string;
  showCloseButton?: boolean;
  /**
   * 見出しを小さなラベルにして、同じ行の右に「閉じる」（文字ボタン）を出す（メモ・引用を書くシート用）。
   * showCloseButton と title があるときだけ効く。ほかのシートの見た目は変えない
   */
  closeInTitleRow?: boolean;
  children?: ReactNode;
};

export function BottomSheet({
  visible,
  onClose,
  title,
  eyebrow,
  showCloseButton,
  closeInTitleRow,
  children,
}: BottomSheetProps) {
  const titleRow = Boolean(closeInTitleRow && showCloseButton && title);
  const bottomInset = useBottomInset();
  const [translateY] = useState(() => new Animated.Value(SLIDE_DISTANCE));
  const [opacity] = useState(() => new Animated.Value(0));
  const reduceMotion = useReduceMotion();

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
            {eyebrow ? (
              <AppText variant="label" numberOfLines={1} style={styles.eyebrow}>
                {eyebrow}
              </AppText>
            ) : null}
            {titleRow ? (
              <View testID="bottom-sheet-title-row" style={styles.titleRow}>
                <AppText variant="label" numberOfLines={1} style={styles.titleRowText}>
                  {title}
                </AppText>
                <Button variant="text" label="閉じる" onPress={onClose} style={styles.titleRowClose} />
              </View>
            ) : title ? (
              <AppText variant="bookTitle" style={styles.title}>
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
            {showCloseButton && !titleRow ? (
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
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingHorizontal: space[6],
    maxHeight: '90%',
  },
  scroll: { flexGrow: 0 },
  handleArea: { alignItems: 'center', minHeight: size.touchMin, justifyContent: 'center' },
  handle: {
    width: HANDLE_WIDTH,
    height: HANDLE_HEIGHT,
    borderRadius: radius.full,
    backgroundColor: colors.line,
  },
  eyebrow: { color: colors.textSecondary, marginBottom: space[1] },
  title: { marginBottom: space[3], fontSize: TITLE_SIZE, lineHeight: TITLE_LINE_HEIGHT },
  close: { marginTop: space[3] },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space[2] },
  titleRowText: { flex: 1, color: colors.textSecondary },
  titleRowClose: { marginRight: -space[2] },
});
