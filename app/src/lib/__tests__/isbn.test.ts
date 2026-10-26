import { isValidEan13, normalizeIsbn, toIsbn13 } from '../isbn';

describe('normalizeIsbn', () => {
  it('ハイフン・空白・全角を正規化する', () => {
    expect(normalizeIsbn('978-4-06-519981-7')).toBe('9784065199817');
    expect(normalizeIsbn(' ９７８　４－０６－５１９９８１－７ ')).toBe('9784065199817');
    expect(normalizeIsbn('080442957x')).toBe('080442957X');
  });
});

describe('toIsbn13', () => {
  it('有効な ISBN-13 を受け付ける', () => {
    expect(toIsbn13('978-4-06-519981-7')).toBe('9784065199817');
    expect(toIsbn13('９７８４０６５１９９８１７')).toBe('9784065199817');
  });

  it('ISBN-10 を ISBN-13 に変換する', () => {
    expect(toIsbn13('4-06-519981-6')).toBe('9784065199817');
    expect(toIsbn13('0-8044-2957-x')).toBe('9780804429573');
  });

  it('無効な入力は null を返す', () => {
    expect(toIsbn13('')).toBeNull();
    expect(toIsbn13('12345')).toBeNull();
    expect(toIsbn13('978406519981a')).toBeNull();
    expect(toIsbn13('9784065199818')).toBeNull();
    expect(toIsbn13('4065199810')).toBeNull();
    expect(toIsbn13('1234567890123')).toBeNull();
    expect(toIsbn13('X065199819')).toBeNull();
  });

  it('isValidEan13', () => {
    expect(isValidEan13('9784065199817')).toBe(true);
    expect(isValidEan13('9784065199818')).toBe(false);
    expect(isValidEan13('978406519981')).toBe(false);
  });
});
