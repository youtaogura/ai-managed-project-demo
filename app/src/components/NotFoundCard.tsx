import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radius, size, space } from '../design/tokens';
import { AppText } from './AppText';
import { Button } from './Button';

const MARK_WIDTH = 48;
const MARK_HEIGHT = 72;

type NotFoundCardProps = {
  onManual: () => void;
  onRetry: () => void;
  onTitleSearch: () => void;
};

export function NotFoundCard({ onManual, onRetry, onTitleSearch }: NotFoundCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.mark}>
        <AppText variant="sectionTitle" style={{ color: colors.textSecondary }}>
          ？
        </AppText>
      </View>
      <AppText variant="sectionTitle">見つかりませんでした</AppText>
      <AppText variant="label" style={styles.description}>
        古い本や同人誌は登録されていないことがあります。ISBN はそのまま、残りを手で入力できます。
      </AppText>
      <View style={styles.actions}>
        <Button variant="primary" label="手で入力する" onPress={onManual} />
        <Button variant="outline" label="もう一度探す" onPress={onRetry} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="タイトルで探す"
          onPress={onTitleSearch}
          style={styles.link}
        >
          <AppText variant="button" style={{ color: colors.textSecondary }}>
            タイトルで探す
          </AppText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    gap: space[3],
    padding: space[5],
    borderRadius: radius.card,
    backgroundColor: colors.surface1,
    borderWidth: 1,
    borderColor: colors.line,
  },
  mark: {
    width: MARK_WIDTH,
    height: MARK_HEIGHT,
    borderRadius: radius.thumb,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.starOff,
    alignItems: 'center',
    justifyContent: 'center',
  },
  description: { color: colors.textSecondary, textAlign: 'center' },
  actions: { alignSelf: 'stretch', gap: space[2], marginTop: space[2] },
  link: { minHeight: size.touchMin, alignItems: 'center', justifyContent: 'center' },
});
