import { Text, type TextProps } from 'react-native';

import { resolveFontFamily } from '../design/fonts';
import { colors, typography } from '../design/tokens';

export type AppTextProps = TextProps & { variant?: keyof typeof typography };

export function AppText({ variant = 'body', style, ...props }: AppTextProps) {
  const t = typography[variant];
  return (
    <Text
      {...props}
      style={[
        {
          color: colors.textPrimary,
          fontFamily: resolveFontFamily(t.fontFamily, t.fontWeight),
          fontSize: t.fontSize,
          lineHeight: t.lineHeight,
        },
        style,
      ]}
    />
  );
}
