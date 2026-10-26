import { Pressable, StyleSheet, View } from 'react-native';

import { colors, size, space } from '../design/tokens';
import type { BookCandidate } from '../types/bookSearch';
import { AppText } from './AppText';
import { Cover } from './Cover';
import { pressedStyle } from './Button';

const COVER_WIDTH = 44;

type BookSearchRowProps = {
  candidate: BookCandidate;
  onPress: () => void;
  disabled?: boolean;
};

export function BookSearchRow({ candidate, onPress, disabled }: BookSearchRowProps) {
  const publisherLine = [candidate.publisher, candidate.publishedYear]
    .filter((part): part is string => part !== null)
    .join(' · ');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={candidate.title}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.row, disabled && styles.disabled, pressed && pressedStyle]}
    >
      <Cover
        record={{
          kind: 'book',
          title: candidate.title,
          creator: candidate.author,
          photoUri: null,
          coverUrl: null,
        }}
        width={COVER_WIDTH}
      />
      <View style={styles.texts}>
        <AppText variant="sectionTitle" numberOfLines={2}>
          {candidate.title}
        </AppText>
        {candidate.author !== null ? (
          <AppText variant="label" style={styles.secondary} numberOfLines={1}>
            {candidate.author}
          </AppText>
        ) : null}
        {publisherLine !== '' ? (
          <AppText variant="label" style={styles.tertiary} numberOfLines={1}>
            {publisherLine}
          </AppText>
        ) : null}
      </View>
      <AppText variant="sectionTitle" style={styles.tertiary}>
        ›
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    minHeight: size.touchMin,
    paddingVertical: space[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  disabled: { opacity: 0.4 },
  texts: { flex: 1, gap: 2 },
  secondary: { color: colors.textSecondary },
  tertiary: { color: colors.textTertiary },
});
