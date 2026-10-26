import { Pressable, StyleSheet, View } from 'react-native';

import { colors, size, space } from '../design/tokens';
import { mediaKindLabel } from '../lib/mediaCandidateParams';
import type { MediaCandidate, MediaSearchKind } from '../types/mediaSearch';
import { AppText } from './AppText';
import { Cover } from './Cover';
import { pressedStyle } from './Button';

const COVER_WIDTH = 44;

type MediaSearchRowProps = {
  candidate: MediaCandidate;
  kind: MediaSearchKind;
  onPress: () => void;
  disabled?: boolean;
};

export function MediaSearchRow({ candidate, kind, onPress, disabled }: MediaSearchRowProps) {
  const infoLine = [candidate.year, mediaKindLabel(candidate, kind)]
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
          kind,
          title: candidate.title,
          creator: candidate.creator,
          photoUri: null,
          coverUrl: candidate.posterUrl,
        }}
        width={COVER_WIDTH}
      />
      <View style={styles.texts}>
        <AppText variant="sectionTitle" numberOfLines={2}>
          {candidate.title}
        </AppText>
        {candidate.creator !== null ? (
          <AppText variant="label" style={styles.secondary} numberOfLines={1}>
            {candidate.creator}
          </AppText>
        ) : null}
        <AppText variant="label" style={styles.tertiary} numberOfLines={1}>
          {infoLine}
        </AppText>
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
