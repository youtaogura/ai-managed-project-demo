import { validateShelfName } from '../shelfName';

const shelves = [
  { id: 'a', name: 'SF' },
  { id: 'b', name: '哲学' },
];

describe('validateShelfName', () => {
  it('前後の空白を除いた名前を返す', () => {
    expect(validateShelfName('  詩集　', shelves)).toEqual({ ok: true, name: '詩集' });
  });

  it('空・空白だけは入力を促す', () => {
    expect(validateShelfName('', shelves)).toEqual({ ok: false, error: '本棚の名前を入力してください' });
    expect(validateShelfName(' 　 ', shelves)).toEqual({ ok: false, error: '本棚の名前を入力してください' });
  });

  it('20 文字までは通り、21 文字以上は弾く', () => {
    expect(validateShelfName('あ'.repeat(20), shelves).ok).toBe(true);
    expect(validateShelfName('あ'.repeat(21), shelves)).toEqual({
      ok: false,
      error: '本棚の名前は 20 文字までです',
    });
  });

  it('重複は全角半角・大文字小文字・前後の空白を区別しない', () => {
    const dup = { ok: false, error: '同じ名前の本棚があります' };
    expect(validateShelfName('SF', shelves)).toEqual(dup);
    expect(validateShelfName(' ｓｆ ', shelves)).toEqual(dup);
    expect(validateShelfName('哲学', shelves)).toEqual(dup);
  });

  it('exceptId の本棚自身とは重複にしない', () => {
    expect(validateShelfName('SF', shelves, 'a')).toEqual({ ok: true, name: 'SF' });
    expect(validateShelfName('SF', shelves, 'b').ok).toBe(false);
  });

  it('予約語「すべての本」は使えない', () => {
    expect(validateShelfName('すべての本', shelves)).toEqual({ ok: false, error: 'その名前は使えません' });
  });
});
