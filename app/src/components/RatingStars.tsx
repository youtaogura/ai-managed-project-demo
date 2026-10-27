import { StyleSheet, Text, View } from 'react-native';

import { colors, space } from '../design/tokens';
import { formatRating, starFills } from '../lib/recordForm';
import { getRatingWord } from '../lib/ratingWord';
import { AppText } from './AppText';

type RatingStarsProps = {
  rating: number | null;
  size?: number;
  showValue?: boolean;
  valueVariant?: 'displayNumber' | 'value';
};

export function RatingStars({
  rating,
  size = 14,
  showValue = true,
  valueVariant = 'value',
}: RatingStarsProps) {
  const star = {
    fontSize: size * 0.9,
    lineHeight: size,
    width: size,
    textAlign: 'center',
  } as const;
  const label =
    rating === null
      ? 'どうだった？ まだ選んでいません'
      : `どうだった？ ${formatRating(rating)} ${getRatingWord(rating) ?? ''}`.trim();
  return (
    <View style={styles.row}>
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={label}
        style={styles.stars}
      >
        {starFills(rating).map((fill, i) => (
          <View
            key={i}
            testID={`rating-star-${i}`}
            style={{ width: size, height: size }}
            importantForAccessibility="no-hide-descendants"
            accessibilityElementsHidden
          >
            <Text style={[star, styles.empty]}>★</Text>
            <View
              testID={`rating-star-fill-${i}`}
              style={[styles.clip, { width: size * fill, height: size }]}
            >
              <Text style={[star, styles.filled]}>★</Text>
            </View>
          </View>
        ))}
      </View>
      {showValue ? (
        rating === null ? (
          <AppText variant="label" style={styles.unrated}>
            まだ選んでいません
          </AppText>
        ) : (
          <AppText variant={valueVariant}>{formatRating(rating)}</AppText>
        )
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space['2'] },
  stars: { flexDirection: 'row', gap: 2 },
  clip: { position: 'absolute', left: 0, top: 0, overflow: 'hidden' },
  empty: { color: colors.starOff },
  filled: { color: colors.accent },
  unrated: { color: colors.textSecondary },
});
