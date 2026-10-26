import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';

import { resolveFontFamily } from '../design/fonts';
import { colors, size, space, typography } from '../design/tokens';
import { AppText } from './AppText';

const FIELD_RADIUS = 12;
const FIELD_PADDING_X = 14;
const MULTILINE_MIN_HEIGHT = 120;
const ISBN_HEIGHT = 56;
const ISBN_FONT_SIZE = 22;

type FieldChrome = {
  label: string;
  required?: boolean;
  optionalLabel?: boolean;
  error?: string;
};

function headingText({ label, required, optionalLabel }: FieldChrome): string {
  return `${label}${required ? '（必須）' : ''}${optionalLabel ? '（任意）' : ''}`;
}

function Heading({ chrome }: { chrome: FieldChrome }) {
  return (
    <AppText variant="label" style={[styles.heading, { color: colors.textSecondary }]}>
      {headingText(chrome)}
    </AppText>
  );
}

function ErrorText({ error }: { error?: string }) {
  if (!error) return null;
  return (
    <AppText variant="micro" style={[styles.error, { color: colors.danger }]}>
      {error}
    </AppText>
  );
}

export type TextFieldProps = Omit<TextInputProps, 'style' | 'accessibilityLabel'> &
  FieldChrome & { variant?: 'default' | 'isbn'; multiline?: boolean };

export function TextField({
  label,
  required,
  optionalLabel,
  error,
  variant = 'default',
  multiline,
  onFocus,
  onBlur,
  ...inputProps
}: TextFieldProps) {
  const [focused, setFocused] = useState(false);
  const isbn = variant === 'isbn';
  const body = typography.body;
  const borderColor = error ? colors.danger : focused ? colors.accent : colors.line;
  return (
    <View>
      <Heading chrome={{ label, required, optionalLabel }} />
      <TextInput
        placeholderTextColor={colors.textTertiary}
        keyboardType={isbn ? 'number-pad' : undefined}
        {...inputProps}
        accessibilityLabel={headingText({ label, required, optionalLabel })}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : undefined}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={[
          styles.input,
          {
            borderColor,
            fontFamily: resolveFontFamily(body.fontFamily, isbn ? '700' : body.fontWeight),
            fontSize: isbn ? ISBN_FONT_SIZE : body.fontSize,
            fontWeight: isbn ? '700' : body.fontWeight,
          },
          isbn && { height: ISBN_HEIGHT },
          multiline && { height: undefined, minHeight: MULTILINE_MIN_HEIGHT, paddingTop: space[3] },
        ]}
      />
      <ErrorText error={error} />
    </View>
  );
}

type DateFieldButtonProps = FieldChrome & {
  value?: string | null;
  placeholder?: string;
  onPress: () => void;
};

export function DateFieldButton({
  label,
  required,
  optionalLabel,
  error,
  value,
  placeholder = '選択してください',
  onPress,
}: DateFieldButtonProps) {
  return (
    <View>
      <Heading chrome={{ label, required, optionalLabel }} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label} ${value || placeholder}`}
        onPress={onPress}
        style={[styles.input, styles.dateButton, { borderColor: error ? colors.danger : colors.line }]}
      >
        <AppText style={{ color: value ? colors.textPrimary : colors.textTertiary }}>
          {value || placeholder}
        </AppText>
      </Pressable>
      <ErrorText error={error} />
    </View>
  );
}

const styles = StyleSheet.create({
  heading: { marginBottom: space[1] },
  input: {
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderRadius: FIELD_RADIUS,
    height: size.buttonHeight,
    minHeight: size.touchMin,
    paddingHorizontal: FIELD_PADDING_X,
    color: colors.textPrimary,
  },
  dateButton: { justifyContent: 'center' },
  error: { marginTop: space[1] },
});
