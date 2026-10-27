import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { resolveFontFamily } from '../design/fonts';
import { colors, radius, size, space, typography } from '../design/tokens';
import { PAGE_MAX_LENGTH } from '../lib/notes';
import { AppText } from './AppText';
import { TextField } from './TextField';
import { Toggle } from './Toggle';

const SELECTED_BORDER = 1.5;
const BODY_MIN_HEIGHT = typography.reading.lineHeight * 4;

function serif(variant: 'reading' | 'oneLine' | 'starter') {
  const t = typography[variant];
  return { fontFamily: resolveFontFamily(t.fontFamily, t.fontWeight), fontSize: t.fontSize, lineHeight: t.lineHeight };
}

type StarterProps = {
  starter: string;
  selected: boolean;
  text: string;
  onChangeText: (text: string) => void;
  onSelect: () => void;
  asQuote: boolean;
  onChangeAsQuote: (value: boolean) => void;
  page: string;
  onChangePage: (page: string) => void;
};

/** 書き出しのカード。選んでいるときだけ続きの入力欄を開く。 */
export function Starter({
  starter,
  selected,
  text,
  onChangeText,
  onSelect,
  asQuote,
  onChangeAsQuote,
  page,
  onChangePage,
}: StarterProps) {
  if (!selected) {
    const written = text.trim() !== '';
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={starter}
        accessibilityState={{ selected: false }}
        onPress={onSelect}
        style={[styles.card, styles.unselected]}
      >
        <View style={styles.summary}>
          <AppText variant="starter" style={{ color: colors.textPrimary }}>
            {starter}
          </AppText>
          {written ? (
            <AppText variant="reading" numberOfLines={1}>
              {text.trim()}
            </AppText>
          ) : null}
        </View>
        <AppText variant="label" style={{ color: colors.textSecondary }}>
          書く
        </AppText>
      </Pressable>
    );
  }
  return (
    <View accessibilityState={{ selected: true }} style={[styles.card, styles.selected]}>
      <AppText variant="starter" style={{ color: colors.textPrimary }}>
        {starter}
      </AppText>
      <TextInput
        accessibilityLabel={`${starter}の続き`}
        multiline
        textAlignVertical="top"
        value={text}
        onChangeText={onChangeText}
        style={[styles.input, serif('reading')]}
      />
      <View style={styles.quoteRow}>
        <Toggle small label="引用として残す" value={asQuote} onValueChange={onChangeAsQuote} />
        <AppText variant="label" style={{ color: colors.textSecondary }}>
          引用として残す
        </AppText>
      </View>
      {asQuote ? (
        <TextField
          label="ページ"
          optionalLabel
          value={page}
          onChangeText={onChangePage}
          keyboardType="number-pad"
          maxLength={PAGE_MAX_LENGTH}
        />
      ) : null}
    </View>
  );
}

type OneLinerFieldProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
};

/** 一番上に固定で出す「ひとことで言うと、」の欄。 */
export function OneLinerField({ label, value, onChangeText }: OneLinerFieldProps) {
  return (
    <View style={styles.oneLiner}>
      <AppText variant="starter" style={{ color: colors.textPrimary }}>
        {label}
      </AppText>
      <TextInput
        accessibilityLabel={label}
        multiline
        textAlignVertical="top"
        value={value}
        onChangeText={onChangeText}
        style={[styles.oneLinerInput, serif('reading')]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface1,
    borderRadius: radius.card,
    padding: space[4],
    gap: space[3],
  },
  unselected: {
    borderWidth: 1,
    borderColor: colors.line,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: size.touchMin,
  },
  selected: { borderWidth: SELECTED_BORDER, borderColor: colors.ribbon },
  summary: { flex: 1, gap: space[1] },
  quoteRow: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  input: {
    minHeight: BODY_MIN_HEIGHT,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.textPrimary,
    borderRadius: radius.button,
    paddingHorizontal: space[3],
    paddingTop: space[2],
    color: colors.textPrimary,
  },
  free: { backgroundColor: colors.surface2, borderColor: colors.line },
  oneLiner: { backgroundColor: colors.surface2, borderRadius: radius.card, padding: space[4], gap: space[2] },
  oneLinerInput: { color: colors.textPrimary, minHeight: size.touchMin, padding: 0 },
});

type FreeFieldProps = {
  value: string;
  onChangeText: (text: string) => void;
};

/** 書き出しなしで自由に書く欄。 */
export function FreeField({ value, onChangeText }: FreeFieldProps) {
  return (
    <TextInput
      accessibilityLabel="自由に書く"
      multiline
      textAlignVertical="top"
      value={value}
      onChangeText={onChangeText}
      style={[styles.input, styles.free, serif('reading')]}
    />
  );
}
