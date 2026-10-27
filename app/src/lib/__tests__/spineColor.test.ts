import { colors } from '../../design/tokens';
import { SPINE_COLORS } from '../constants';
import { spineColorToken } from '../spineColor';

describe('spineColorToken', () => {
  it('背表紙の色の名前を colors.spineN に対応させる', () => {
    expect(spineColorToken('spine-1')).toBe(colors.spine1);
    expect(spineColorToken('spine-10')).toBe(colors.spine10);
  });

  it('すべての色が値を持つ', () => {
    for (const c of SPINE_COLORS) expect(spineColorToken(c)).toMatch(/^#/);
  });
});
