import { StyleSheet, Text, View } from 'react-native';

import { starColors } from '../theme';

type StarRatingProps = {
  fills: number[];
  size: number;
};

export function StarRating({ fills, size }: StarRatingProps) {
  const star = {
    fontSize: size * 0.9,
    lineHeight: size,
    width: size,
    textAlign: 'center',
  } as const;
  return (
    <View style={styles.row} pointerEvents="none">
      {fills.map((fill, i) => (
        <View key={i} style={{ width: size, height: size }}>
          <Text style={[star, styles.empty]}>★</Text>
          <View style={[styles.clip, { width: size * fill, height: size }]}>
            <Text style={[star, styles.filled]}>★</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  clip: { position: 'absolute', left: 0, top: 0, overflow: 'hidden' },
  empty: { color: starColors.empty },
  filled: { color: starColors.filled },
});
