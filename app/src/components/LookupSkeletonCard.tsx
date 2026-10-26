import { StyleSheet, View } from 'react-native';

import { colors, radius, space } from '../design/tokens';
import { AppText } from './AppText';
import { Button } from './Button';

const COVER_WIDTH = 48;
const COVER_HEIGHT = 72;
const LINE_HEIGHT = 10;
const LONG_LINE_WIDTH = '80%';
const SHORT_LINE_WIDTH = '50%';

type LookupSkeletonCardProps = {
  state: 'loading' | 'error';
  onRetry?: () => void;
  message?: string;
};

export function LookupSkeletonCard({ state, onRetry, message }: LookupSkeletonCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.cover} />
      <View style={styles.body}>
        {state === 'loading' ? (
          <>
            <View style={[styles.line, { width: LONG_LINE_WIDTH }]} />
            <View style={[styles.line, { width: SHORT_LINE_WIDTH }]} />
            <AppText variant="label" style={styles.caption}>
              書誌情報を検索中…
            </AppText>
          </>
        ) : (
          <>
            <AppText variant="label" style={{ color: colors.danger }}>
              {message}
            </AppText>
            {onRetry ? <Button variant="outline" label="再試行" onPress={onRetry} /> : null}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: space[3],
    padding: space[4],
    borderRadius: radius.card,
    backgroundColor: colors.surface1,
    borderWidth: 1,
    borderColor: colors.line,
  },
  cover: {
    width: COVER_WIDTH,
    height: COVER_HEIGHT,
    borderRadius: radius.thumb,
    backgroundColor: colors.surface2,
  },
  body: { flex: 1, justifyContent: 'center', gap: space[2] },
  line: { height: LINE_HEIGHT, borderRadius: radius.thumb, backgroundColor: colors.surface2 },
  caption: { color: colors.textSecondary },
});
