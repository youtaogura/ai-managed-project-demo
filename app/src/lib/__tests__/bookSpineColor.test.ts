import { SPINE_COLORS } from '../constants';
import { spineColorForTitle } from '../bookSpineColor';

describe('spineColorForTitle', () => {
  it('同じタイトルならいつも同じ色で、10 色のどれか', () => {
    expect(spineColorForTitle('吾輩は猫である')).toBe(spineColorForTitle('吾輩は猫である'));
    expect(SPINE_COLORS).toContain(spineColorForTitle('吾輩は猫である'));
  });

  it('文字コードの和から決める', () => {
    expect(spineColorForTitle('')).toBe('spine-1');
    expect(spineColorForTitle('a')).toBe(SPINE_COLORS[97 % SPINE_COLORS.length]);
  });

  it('タイトルが違えば色も散らばる', () => {
    const colorsUsed = new Set(['あ', 'い', 'う', 'え', 'お', 'か', 'き'].map(spineColorForTitle));
    expect(colorsUsed.size).toBeGreaterThan(1);
  });
});
