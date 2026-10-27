import { fontFamilies } from './tokens';

export const fontAssets = {
  NotoSansJP_400Regular: require('../../assets/fonts/NotoSansJP_400Regular.ttf'),
  NotoSansJP_700Bold: require('../../assets/fonts/NotoSansJP_700Bold.ttf'),
  NotoSansJP_900Black: require('../../assets/fonts/NotoSansJP_900Black.ttf'),
  ShipporiMincho_600SemiBold: require('../../assets/fonts/ShipporiMincho_600SemiBold.ttf'),
  ShipporiMincho_800ExtraBold: require('../../assets/fonts/ShipporiMincho_800ExtraBold.ttf'),
};

export type FontKey = keyof typeof fontAssets;

const weightKeys: Record<string, readonly { weight: number; key: FontKey }[]> = {
  [fontFamilies.sans]: [
    { weight: 400, key: 'NotoSansJP_400Regular' },
    { weight: 700, key: 'NotoSansJP_700Bold' },
    { weight: 900, key: 'NotoSansJP_900Black' },
  ],
  [fontFamilies.serif]: [
    { weight: 600, key: 'ShipporiMincho_600SemiBold' },
    { weight: 800, key: 'ShipporiMincho_800ExtraBold' },
  ],
};

// トークンの fontFamily / fontWeight を、読み込み済みのフォントキーへ変換する。
// 未対応の太さは最も近いものを選ぶ
export function resolveFontFamily(fontFamily: string, fontWeight: string): FontKey {
  const candidates = weightKeys[fontFamily] ?? weightKeys[fontFamilies.sans] ?? [];
  const target = Number(fontWeight);
  const first = candidates[0];
  let best = first;
  for (const c of candidates) {
    if (best === undefined || Math.abs(c.weight - target) < Math.abs(best.weight - target)) best = c;
  }
  return best?.key ?? 'NotoSansJP_400Regular';
}

// 通常の太さの文字ボタン用。AppText は太さごとに別の family を選ぶので、fontWeight の上書きではなく family で指定する
export const regularTextStyle = { fontFamily: resolveFontFamily(fontFamilies.sans, '400') };
