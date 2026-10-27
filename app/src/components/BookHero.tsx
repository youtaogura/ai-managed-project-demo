import { StyleSheet, View } from 'react-native';

import { colors, space } from '../design/tokens';
import { buildStatusLine } from '../lib/bookHero';
import { shelfNames } from '../lib/shelfSelectors';
import type { Shelf } from '../types/shelf';
import type { MediaRecord } from '../types/record';
import { AppText } from './AppText';
import { Spine } from './Spine';

/** 本の画面（読んでる本・読み返す）の上部の背表紙の大きさ */
export const BOOK_HERO_SPINE_SIZE = { width: 40, height: 150 };

type BookHeroProps = {
  record: MediaRecord;
  shelves: readonly Shelf[];
};

/** 本の画面の上部: 左に背表紙、右にステータスと日付（朱）・タイトル・「作者 · 本棚」 */
export function BookHero({ record, shelves }: BookHeroProps) {
  const names = shelfNames(record, shelves).join('、');
  const meta = [record.creator, names].filter((v): v is string => !!v).join(' · ');
  return (
    <View style={styles.hero}>
      <Spine record={record} dimensions={BOOK_HERO_SPINE_SIZE} />
      <View style={styles.text}>
        <AppText variant="value" style={{ color: colors.ribbon }}>
          {buildStatusLine(record)}
        </AppText>
        <AppText variant="bookTitle">{record.title}</AppText>
        {meta ? (
          <AppText variant="label" style={{ color: colors.textSecondary }}>
            {meta}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'flex-end', gap: space[5], paddingTop: space[4], paddingBottom: space[2] },
  text: { flex: 1, gap: space[2] },
});
