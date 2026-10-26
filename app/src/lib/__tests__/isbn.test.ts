import { isValidEan13, normalizeIsbn, toIsbn13 } from '../isbn';

describe('isbn', () => {
  it('全角・ハイフン・空白を正規化する', () => {
    expect(normalizeIsbn('978-4-06-519981-7')).toBe('9784065199817');
    expect(normalizeIsbn('９７８　４－０６－５１９９８１－７')).toBe('9784065199817');
    expect(normalizeIsbn('4-00-310101-x')).toBe('400310101X');
  });

  it('ISBN-13 を受け付ける', () => {
    expect(toIsbn13('978-4-06-519981-7')).toBe('9784065199817');
  });

  it('ISBN-10 を ISBN-13 に変換する', () => {
    expect(toIsbn13('4-00-310101-4')).toBe('9784003101018');
    expect(toIsbn13('4-00-310101-x')).toBeNull();
  });

  it('X で終わる有効な ISBN-10 を変換する', () => {
    expect(toIsbn13('080442957X')).toBe('9780804429573');
  });

  it('無効な値は null', () => {
    expect(toIsbn13('123')).toBeNull();
    expect(toIsbn13('9784065199818')).toBeNull();
    expect(toIsbn13('1920000000000')).toBeNull();
    expect(toIsbn13('abcdefghij')).toBeNull();
  });

  it('isValidEan13', () => {
    expect(isValidEan13('9784065199817')).toBe(true);
    expect(isValidEan13('9784065199818')).toBe(false);
    expect(isValidEan13('978406519981')).toBe(false);
  });
});
