import { parsePreviewInsets } from '../previewInsets';

describe('parsePreviewInsets', () => {
  it('上,右,下,左 を余白に変換する', () => {
    expect(parsePreviewInsets('59,0,34,0')).toEqual({ top: 59, right: 0, bottom: 34, left: 0 });
  });

  it.each([undefined, '', '1,2,3', '1,2,3,4,5', 'a,0,0,0', '-1,0,0,0', 'Infinity,0,0,0', '1,,3,4'])(
    '不正な値 %p は null',
    (value) => {
      expect(parsePreviewInsets(value)).toBeNull();
    },
  );
});
