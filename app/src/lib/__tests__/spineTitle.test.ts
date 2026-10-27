import { fitVerticalUnits, splitVerticalUnits, unitLength } from '../spineTitle';

const texts = (title: string) => splitVerticalUnits(title).map((u) => u.text);

describe('splitVerticalUnits', () => {
  it('「ゲーム」は ー だけ回す', () => {
    expect(splitVerticalUnits('ゲーム')).toEqual([
      { kind: 'upright', text: 'ゲ' },
      { kind: 'rotate', text: 'ー' },
      { kind: 'upright', text: 'ム' },
    ]);
  });

  it('英数字は内側の空白ごと 1 単位', () => {
    expect(splitVerticalUnits('ONE PIECE')).toEqual([{ kind: 'latin', text: 'ONE PIECE' }]);
    expect(splitVerticalUnits('1Q84')).toEqual([{ kind: 'latin', text: '1Q84' }]);
    expect(texts('SF!')).toEqual(['SF!']);
  });

  it('和文と英数字の間の空白は捨てる', () => {
    expect(texts('三体 II')).toEqual(['三', '体', 'II']);
    expect(texts('AI 時代の読書')).toEqual(['AI', '時', '代', 'の', '読', '書']);
  });

  it('2 文字までの数字は縦中横、3 文字以上は latin', () => {
    expect(splitVerticalUnits('12')).toEqual([{ kind: 'tcy', text: '12' }]);
    expect(splitVerticalUnits('123')[0].kind).toBe('latin');
  });

  it('コロンは latin 1 文字、全角英数字は upright', () => {
    expect(splitVerticalUnits('史 : 文')[1]).toEqual({ kind: 'latin', text: ':' });
    expect(splitVerticalUnits('Ａ１').map((u) => u.kind)).toEqual(['upright', 'upright']);
  });

  it('回す文字とかっこ', () => {
    expect(splitVerticalUnits('〜…―').map((u) => u.kind)).toEqual(['rotate', 'rotate', 'rotate']);
    expect(splitVerticalUnits('（「」）')).toEqual([
      { kind: 'upright', text: '︵' },
      { kind: 'upright', text: '﹁' },
      { kind: 'upright', text: '﹂' },
      { kind: 'upright', text: '︶' },
    ]);
  });

  it('小さい仮名は shift 付き', () => {
    expect(splitVerticalUnits('きゃ')).toEqual([
      { kind: 'upright', text: 'き' },
      { kind: 'upright', text: 'ゃ', shift: true },
    ]);
  });

  it('空文字は空配列、サロゲートペアを壊さない', () => {
    expect(splitVerticalUnits('')).toEqual([]);
    expect(texts('𠮷😀')).toEqual(['𠮷', '😀']);
  });
});

describe('fitVerticalUnits', () => {
  const units = splitVerticalUnits('あいうえお');

  it('ちょうど収まるときは省略しない', () => {
    expect(fitVerticalUnits(units, 75, 13, 15)).toEqual({ units, truncated: false });
  });

  it('収まらないときは「︙」の分を残して切る', () => {
    const r = fitVerticalUnits(units, 74, 13, 15);
    expect(r.truncated).toBe(true);
    expect(r.units.map((u) => u.text)).toEqual(['あ', 'い', 'う']);
  });

  it('latin はまとまりごと落とす', () => {
    const u = splitVerticalUnits('あONE PIECE');
    const r = fitVerticalUnits(u, 60, 13, 15);
    expect(r.units.map((x) => x.text)).toEqual(['あ']);
    expect(r.truncated).toBe(true);
  });

  it('1 単位も入らなくても落ちない', () => {
    expect(fitVerticalUnits(units, 10, 13, 15)).toEqual({ units: [], truncated: true });
  });

  it.each([
    [13, 15, 90],
    [12, 15, 90],
  ])('長いタイトルは文字 %ipx でも高さを超えない', (fontSize, lineHeight, height) => {
    const long = splitVerticalUnits('サピエンス全史 : 文明の構造と人類の幸福');
    const r = fitVerticalUnits(long, height, fontSize, lineHeight);
    const used = r.units.reduce((s, x) => s + unitLength(x, fontSize, lineHeight), 0);
    expect(r.truncated).toBe(true);
    expect(used + lineHeight).toBeLessThanOrEqual(height);
  });
});
