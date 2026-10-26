import { StyleSheet, View } from 'react-native';

import { resolveFontFamily } from '../design/fonts';
import { space } from '../design/tokens';
import {
  COVER_TITLE_LINES,
  COVER_TITLE_STYLES,
  coverHeight,
  getCoverColors,
  getCoverTitleVariant,
} from '../lib/cover';
import { AppText } from './AppText';

type TextCoverProps = {
  title: string;
  creator: string | null;
  width: number;
  radius?: number;
};

export function TextCover({ title, creator, width, radius = 0 }: TextCoverProps) {
  const { bg, ink } = getCoverColors();
  const variant = getCoverTitleVariant(width);
  const t = COVER_TITLE_STYLES[variant];
  const padding = Math.max(space['1'], Math.round(width * 0.08));

  return (
    <View
      testID="text-cover"
      style={[
        styles.box,
        {
          width,
          height: coverHeight(width),
          backgroundColor: bg,
          borderRadius: radius,
          padding,
        },
      ]}
    >
      <AppText
        variant="body"
        numberOfLines={COVER_TITLE_LINES[variant]}
        ellipsizeMode="tail"
        style={{
          color: ink,
          fontFamily: resolveFontFamily(t.fontFamily, t.fontWeight),
          fontSize: t.fontSize,
          lineHeight: t.lineHeight,
        }}
      >
        {title}
      </AppText>
      {creator !== null && variant !== 'thumb' ? (
        <AppText variant="micro" numberOfLines={1} style={[styles.creator, { color: ink }]}>
          {creator}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { overflow: 'hidden', justifyContent: 'center' },
  creator: { marginTop: space['1'], opacity: 0.7 },
});
