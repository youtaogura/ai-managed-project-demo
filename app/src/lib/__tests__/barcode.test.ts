import { isbnFromBarcode, isValidEan13 } from '../barcode';

describe('barcode', () => {
  it('isValidEan13 はチェックディジットを検証する', () => {
    expect(isValidEan13('9784065199817')).toBe(true);
    expect(isValidEan13('9784065199818')).toBe(false);
    expect(isValidEan13('97840651998ab')).toBe(false);
    expect(isValidEan13('978406519981')).toBe(false);
  });

  it('978 / 979 の EAN-13 は ISBN-13 を返す', () => {
    expect(isbnFromBarcode({ type: 'ean13', data: '9784065199817' })).toBe('9784065199817');
    expect(isbnFromBarcode({ type: 'ean13', data: '9791234567896' })).toBe('9791234567896');
  });

  it('192 始まりはチェックディジットが正しくても null', () => {
    expect(isValidEan13('1920000000000')).toBe(true);
    expect(isbnFromBarcode({ type: 'ean13', data: '1920000000000' })).toBeNull();
  });

  it('不正なバーコードや他の type は null', () => {
    expect(isbnFromBarcode({ type: 'ean13', data: '9784065199818' })).toBeNull();
    expect(isbnFromBarcode({ type: 'ean13', data: '97840651998' })).toBeNull();
    expect(isbnFromBarcode({ type: 'qr', data: '9784065199817' })).toBeNull();
  });
});
