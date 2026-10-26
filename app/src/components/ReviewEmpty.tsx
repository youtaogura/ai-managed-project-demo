import { StyleSheet, View } from 'react-native';

import { colors, radius, space } from '../design/tokens';
import { AppText } from './AppText';
import { Button } from './Button';

// 点線の空の積み上げ（高さ違いの 12 本）
const GHOST_HEIGHTS = [28, 44, 36, 60, 48, 76, 52, 40, 68, 56, 84, 64];
const GHOST_WIDTH = 16;

type ReviewEmptyProps = { onAdd: () => void };

export function ReviewEmpty({ onAdd }: ReviewEmptyProps) {
  return (
    <View style={styles.container}>
      <View style={styles.ghosts}>
        {GHOST_HEIGHTS.map((height, i) => (
          <View key={i} style={[styles.ghost, { height }]} />
        ))}
      </View>
      <AppText variant="sectionTitle">読んだ本がたまると、ここに積み上がります</AppText>
      <AppText variant="label" style={styles.description}>
        読み終えた本を記録すると、月ごとに背表紙の色で積み上がっていきます
      </AppText>
      <Button variant="primary" label="本を追加する" onPress={onAdd} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space[6],
    gap: space[3],
  },
  ghosts: { flexDirection: 'row', alignItems: 'flex-end', gap: space[1], marginBottom: space[2] },
  ghost: {
    width: GHOST_WIDTH,
    borderRadius: radius.thumb / 2,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.lineStrong,
  },
  description: { color: colors.textSecondary, textAlign: 'center' },
});
