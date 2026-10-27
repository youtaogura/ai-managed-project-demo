import { Pressable, StyleSheet, View } from 'react-native';

import { colors, size, space } from '../design/tokens';
import { spineColorForTitle } from '../lib/bookSpineColor';
import type { BookCandidate } from '../types/bookSearch';
import { AppText } from './AppText';
import { pressedStyle } from './Button';
import { Spine } from './Spine';

const SPINE_WIDTH = 22;
const SPINE_HEIGHT = 64;

type BookSearchRowProps = {
  candidate: BookCandidate;
  onPress: () => void;
  disabled?: boolean;
};

export function BookSearchRow({ candidate, onPress, disabled }: BookSearchRowProps) {
  const detailLine = [candidate.author, candidate.publisher, candidate.publishedYear]
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
      <Spine
        record={{
          id: candidate.title,
          title: candidate.title,
          creator: candidate.author,
          status: 'planned',
          favorite: false,
          spineColor: spineColorForTitle(candidate.title),
        }}
        dimensions={{ width: SPINE_WIDTH, height: SPINE_HEIGHT }}
      />
      <View style={styles.texts}>
        <AppText variant="reading" numberOfLines={2}>
          {candidate.title}
        </AppText>
        {detailLine !== '' ? (
          <AppText variant="label" style={styles.secondary} numberOfLines={1}>
            {detailLine}
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
    gap: space[4],
    minHeight: size.touchMin,
    paddingVertical: space[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  disabled: { opacity: 0.4 },
  texts: { flex: 1, gap: 2 },
  secondary: { color: colors.textSecondary },
  tertiary: { color: colors.textTertiary },
});
