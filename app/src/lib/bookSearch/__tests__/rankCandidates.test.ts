import type { BookCandidate } from '../../../types/bookSearch';
import { normalizeTitle, rankCandidates } from '../rankCandidates';

const book = (title: string, isbn: string | null = null): BookCandidate => ({
  title,
  author: null,
  publisher: null,
  publishedYear: null,
  isbn,
  ndlId: null,
});

const titles = (list: BookCandidate[]) => list.map((c) => `${c.title}${c.isbn ? `#${c.isbn}` : ''}`);

describe('rankCandidates', () => {
  it('一致 → 前方一致 → 含む → それ以外 の順に並べる（実際の応答の並びをもとにした例）', () => {
    const input = [
      book('映画は文学をあきらめない : ひとつの物語からもうひとつの物語へ', '1'),
      book('音楽家たちの村上春樹 : ノルウェイの森と10のオマージュ', '2'),
      book('『ノルウェイの森』を英語で読む', '3'),
      book('ノルウェイの森公式ガイドブック', '4'),
      book('ノルウェイの森', '5'),
      book('ノルウェイの森 : 上', '6'),
    ];
    expect(titles(rankCandidates('ノルウェイの森', input))).toEqual([
      'ノルウェイの森#5',
      'ノルウェイの森 : 上#6',
      '『ノルウェイの森』を英語で読む#3',
      'ノルウェイの森公式ガイドブック#4',
      '音楽家たちの村上春樹 : ノルウェイの森と10のオマージュ#2',
      '映画は文学をあきらめない : ひとつの物語からもうひとつの物語へ#1',
    ]);
  });

  it('全角・半角、大文字・小文字、空白の違いを無視する', () => {
    const input = [book('ワンピース・ガイド'), book('ＯＮＥ　ＰＩＥＣＥ　１')];
    expect(titles(rankCandidates('one piece', input))).toEqual(['ＯＮＥ　ＰＩＥＣＥ　１', 'ワンピース・ガイド']);
  });

  it('同じ順位なら ISBN のあるものを先にし、それ以外は元の順を保つ', () => {
    const input = [book('サピエンス全史'), book('サピエンス全史', '9784309226712'), book('サピエンス全史', '9784309226729')];
    expect(titles(rankCandidates('サピエンス全史', input))).toEqual([
      'サピエンス全史#9784309226712',
      'サピエンス全史#9784309226729',
      'サピエンス全史',
    ]);
  });

  it('同じ ISBN の重複は最初の1件だけ残す。ISBN のないものは重複とみなさない', () => {
    const input = [book('本', '1'), book('本', '1'), book('本'), book('本')];
    expect(titles(rankCandidates('本', input))).toEqual(['本#1', '本', '本']);
  });

  it('キーワードが空なら元の順（ISBN のあるものが先）', () => {
    const input = [book('A'), book('B', '1')];
    expect(titles(rankCandidates('  ', input))).toEqual(['B#1', 'A']);
  });

  it('normalizeTitle は記号・空白を除き、NFKC と小文字にそろえる', () => {
    expect(normalizeTitle('『ＯＮＥ ＰＩＥＣＥ』 : 第1巻')).toBe('onepiece第1巻');
  });
});
