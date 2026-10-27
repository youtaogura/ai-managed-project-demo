import type { BookCandidate } from '../../types/bookSearch';

// 比較用に表記を揃える（全角・半角、大文字・小文字、空白、かっこや記号の違いを無視する）
export function normalizeTitle(text: string): string {
  return text
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\s『』「」【】〈〉《》()（）［］[\]・:：、。,.!?！？〜~\-－ー_＿/／]/g, '');
}

// 副題（「 : 」以降）を除いた本タイトル
function mainTitle(title: string): string {
  return title.split(/\s+:\s+/)[0] ?? title;
}

// 0: タイトルが一致、1: タイトルがキーワードで始まる、2: タイトルにキーワードを含む、3: それ以外（著者名などで当たったもの）
function matchRank(keyword: string, candidate: BookCandidate): number {
  const full = normalizeTitle(candidate.title);
  const main = normalizeTitle(mainTitle(candidate.title));
  if (keyword === '') return 3;
  if (main === keyword || full === keyword) return 0;
  if (main.startsWith(keyword) || full.startsWith(keyword)) return 1;
  if (full.includes(keyword)) return 2;
  return 3;
}

/**
 * 国立国会図書館サーチの結果は読みの順に並ぶため、探している本が後ろに埋もれる。
 * キーワードとタイトルの一致の度合いで並べ替え、同じ ISBN の重複を除く。
 * 一致の度合いが同じなら ISBN のあるものを先にし、それ以外は元の順を保つ。
 */
export function rankCandidates(keyword: string, candidates: readonly BookCandidate[]): BookCandidate[] {
  const key = normalizeTitle(keyword);
  const ranked = candidates
    .map((candidate, index) => ({ candidate, index, rank: matchRank(key, candidate), hasIsbn: candidate.isbn !== null }))
    .sort((a, b) => a.rank - b.rank || Number(b.hasIsbn) - Number(a.hasIsbn) || a.index - b.index);
  const seen = new Set<string>();
  const result: BookCandidate[] = [];
  for (const { candidate } of ranked) {
    if (candidate.isbn !== null) {
      if (seen.has(candidate.isbn)) continue;
      seen.add(candidate.isbn);
    }
    result.push(candidate);
  }
  return result;
}
