import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, size, space } from '../design/tokens';
import { AppText } from './AppText';

const PRESSED_OPACITY = 0.8;
const PRESSED_SCALE = 0.97;

type CommonProps = {
  onPress: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export type ButtonProps =
  | (CommonProps & { variant?: 'primary' | 'outline'; tone?: 'danger'; label: string; accessibilityLabel?: string })
  | (CommonProps & { variant: 'text'; tone?: 'danger'; label: string; accessibilityLabel?: string })
  | (CommonProps & { variant: 'icon'; onImage?: boolean; accessibilityLabel: string; children: ReactNode })
  | (CommonProps & { variant: 'record'; accessibilityLabel?: string });

export const pressedStyle: ViewStyle = {
  opacity: PRESSED_OPACITY,
  transform: [{ scale: PRESSED_SCALE }],
};

export function Button(props: ButtonProps) {
  const { onPress, disabled, style } = props;
  const variant = props.variant ?? 'primary';

  let base: StyleProp<ViewStyle>;
  let accessibilityLabel: string | undefined;
  let content: ReactNode;

  if (props.variant === 'icon') {
    base = [styles.circle, { backgroundColor: props.onImage ? colors.scrim : colors.surface2 }];
    accessibilityLabel = props.accessibilityLabel;
    content = props.children;
  } else if (props.variant === 'text') {
    base = styles.text;
    accessibilityLabel = props.accessibilityLabel ?? props.label;
    content = (
      <AppText
        variant="button"
        style={{ color: props.tone === 'danger' ? colors.danger : colors.textSecondary, fontWeight: '400' }}
      >
        {props.label}
      </AppText>
    );
  } else if (props.variant === 'record') {
    base = [styles.circle, { backgroundColor: colors.accent }];
    accessibilityLabel = props.accessibilityLabel ?? '記録する';
    content = (
      <AppText variant="sectionTitle" style={{ color: colors.accentInk }}>
        ＋
      </AppText>
    );
  } else {
    const danger = props.tone === 'danger';
    const outline = variant === 'outline';
    const textColor = outline ? (danger ? colors.danger : colors.textPrimary) : colors.accentInk;
    base = [
      styles.rect,
      outline
        ? { borderWidth: 1, borderColor: danger ? colors.danger : colors.lineStrong }
        : { backgroundColor: colors.accent },
    ];
    accessibilityLabel = props.accessibilityLabel ?? props.label;
    content = (
      <AppText variant="button" style={{ color: textColor }}>
        {props.label}
      </AppText>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        base,
        disabled && styles.disabled,
        pressed && pressedStyle,
        style,
      ]}
    >
      <View pointerEvents="none" style={styles.content}>
        {content}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  rect: {
    minHeight: size.buttonHeight,
    height: size.buttonHeight,
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space[4],
  },
  circle: {
    width: size.touchMin,
    height: size.touchMin,
    minWidth: size.touchMin,
    minHeight: size.touchMin,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    minHeight: size.touchMin,
    minWidth: size.touchMin,
    paddingHorizontal: space[2],
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.4 },
});
