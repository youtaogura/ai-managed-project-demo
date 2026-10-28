import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { resolveFontFamily } from '../design/fonts';
import { colors, radius, size, space, typography } from '../design/tokens';
import type { OneLineValues } from '../lib/reread';
import { getRatingWord } from '../lib/ratingWord';
import { formatRating } from '../lib/recordForm';
import { AppText } from './AppText';
import { BottomSheet } from './BottomSheet';
import { Button } from './Button';
import { FocusInput } from './NoteSheet';
import { RatingSlider } from './RatingSlider';
import { ToggleRow } from './Toggle';

const ERROR_SAVE = '保存できませんでした。もう一度お試しください';
const ONE_LINER_LABEL = 'この本をひとことで';
/** 入力欄の高さ（`one-line` の 2 行ぶん） */
const ONE_LINER_MIN_HEIGHT = typography.oneLine.lineHeight * 2 + space[4] * 2;
const TOGGLE_ROW_HEIGHT = 52;

export type OneLineSheetProps = {
  visible: boolean;
  /** 本のタイトル（シートの上に小さく出す） */
  bookTitle: string;
  /** 開いたときに入っている値 */
  initial: OneLineValues;
  /** 保存。失敗したら reject */
  onSubmit: (values: OneLineValues) => Promise<void>;
  onClose: () => void;
};

/** 読み返す画面でひとことかどうだった？を押すと開く、ひとこと・どうだった？・お気に入りを直すシート。 */
export function OneLineSheet({ visible, bookTitle, onClose, ...rest }: OneLineSheetProps) {
  return (
    <BottomSheet visible={visible} onClose={onClose} title={bookTitle} showCloseButton closeInTitleRow>
      {visible ? <Form {...rest} onClose={onClose} /> : null}
    </BottomSheet>
  );
}

type FormProps = Omit<OneLineSheetProps, 'visible' | 'bookTitle'>;

function Form({ initial, onSubmit, onClose }: FormProps) {
  const [oneLiner, setOneLiner] = useState(initial.oneLiner);
  const [rating, setRating] = useState(initial.rating);
  const [favorite, setFavorite] = useState(initial.favorite);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const word = getRatingWord(rating);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await onSubmit({ oneLiner, rating, favorite });
      onClose();
    } catch {
      setError(ERROR_SAVE);
      setBusy(false);
    }
  };

  return (
    <View style={styles.form}>
      <View style={styles.field}>
        <AppText variant="value" style={styles.secondary}>
          {ONE_LINER_LABEL}
        </AppText>
        <FocusInput
          accessibilityLabel={ONE_LINER_LABEL}
          multiline
          textAlignVertical="top"
          value={oneLiner}
          onChangeText={setOneLiner}
          style={[styles.oneLiner, oneLineFont]}
        />
      </View>
      <View style={styles.field}>
        <View style={styles.ratingHead}>
          <AppText variant="value" style={styles.secondary}>
            どうだった？
          </AppText>
          <AppText variant="label" style={styles.secondary}>
            星をなぞると 0.1 ずつ変わります
          </AppText>
        </View>
        <View style={styles.ratingRow}>
          <RatingSlider value={rating} onChange={setRating} />
          {rating !== null && word !== null ? (
            <View style={styles.result}>
              <AppText variant="displayNumber">{formatRating(rating)}</AppText>
              <AppText variant="reading" style={{ color: colors.ribbon }}>
                {word}
              </AppText>
            </View>
          ) : (
            <AppText variant="label" style={styles.secondary}>
              まだ選んでいません
            </AppText>
          )}
        </View>
        {rating !== null ? (
          <Pressable accessibilityRole="button" style={styles.clear} onPress={() => setRating(null)}>
            <AppText variant="label" style={styles.secondary}>
              星をなしにする
            </AppText>
          </Pressable>
        ) : null}
      </View>
      <ToggleRow label="お気に入り" value={favorite} onValueChange={setFavorite} style={styles.toggleRow} />
      {error ? (
        <AppText variant="body" style={{ color: colors.danger }}>
          {error}
        </AppText>
      ) : null}
      <Button label="保存する" disabled={busy} onPress={() => void submit()} />
    </View>
  );
}

const oneLineFont = {
  fontFamily: resolveFontFamily(typography.oneLine.fontFamily, typography.oneLine.fontWeight),
  fontSize: typography.oneLine.fontSize,
  lineHeight: typography.oneLine.lineHeight,
};

const styles = StyleSheet.create({
  form: { gap: space[5] },
  field: { gap: space[3] },
  secondary: { color: colors.textSecondary },
  // TextField の README どおり面は surface-1（読後メモを直すシートと揃える）
  oneLiner: {
    backgroundColor: colors.surface1,
    minHeight: ONE_LINER_MIN_HEIGHT,
    padding: space[4],
  },
  ratingHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: space[2] },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: space[5] },
  result: { flexDirection: 'row', alignItems: 'baseline', gap: space[3] },
  // 星の行のすぐ下に小さく。タップ領域は touch-min を確保し、上の余白はその分詰める
  clear: { alignSelf: 'flex-start', minHeight: size.touchMin, minWidth: size.touchMin, justifyContent: 'center', marginTop: -space[2] },
  toggleRow: {
    minHeight: TOGGLE_ROW_HEIGHT,
    paddingHorizontal: space[4],
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface1,
  },
});
