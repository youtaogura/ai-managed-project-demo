import { fontAssets, resolveFontFamily } from '../fonts';
import { typography } from '../tokens';

describe('fonts', () => {
  it('読み込むフォントは仕様の 5 つ', () => {
    expect(Object.keys(fontAssets).sort()).toEqual([
      'NotoSansJP_400Regular',
      'NotoSansJP_700Bold',
      'NotoSansJP_900Black',
      'ShipporiMincho_600SemiBold',
      'ShipporiMincho_800ExtraBold',
    ]);
  });

  it('typography の全 variant が読み込むフォントに解決される', () => {
    for (const t of Object.values(typography)) {
      expect(Object.keys(fontAssets)).toContain(resolveFontFamily(t.fontFamily, t.fontWeight));
    }
  });

  it('未対応の太さは最も近いものになり、未知のファミリーは Noto Sans JP', () => {
    expect(resolveFontFamily('Shippori Mincho', '750')).toBe('ShipporiMincho_800ExtraBold');
    expect(resolveFontFamily('Noto Sans JP', '500')).toBe('NotoSansJP_400Regular');
    expect(resolveFontFamily('Unknown', '900')).toBe('NotoSansJP_900Black');
  });
});
