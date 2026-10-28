/** 読後メモのヒントの種類（docs/design-system/components/Hint/README.md） */
export type HintCategory = 'feeling' | 'content' | 'self' | 'connection' | 'recommend' | 'mismatch';

export const HINT_CATEGORY_LABELS: Record<HintCategory, string> = {
  feeling: '感じたこと',
  content: '中身',
  self: '自分ごと',
  connection: 'つながり',
  recommend: '人に勧める',
  mismatch: '合わなかったとき',
};

/** ヒントの一覧（固定。設定で変えることはできない） */
export const HINTS: Record<HintCategory, readonly string[]> = {
  feeling: [
    'いちばん心に残ったのは、',
    '思わず読む手が止まったのは、',
    '意外だったのは、',
    '読み終えて、最初に浮かんだのは、',
    '少し引っかかったのは、',
  ],
  content: [
    'この本をひとつの場面で表すなら、',
    '作者がいちばん伝えたかったのは、たぶん',
    'いちばん好きな登場人物は、',
    'いちばん役に立ちそうなのは、',
  ],
  self: [
    '自分のことのように感じたのは、',
    '読み終えて、見方が変わったのは、',
    '明日から試してみたいのは、',
    '昔の自分に読ませたいのは、なぜなら',
  ],
  connection: ['似ていると思ったのは、', 'この本の次に読みたいのは、'],
  recommend: ['この本を渡したいのは、', 'まだ読んでいない人に言いたいのは、', 'この本のいいところを一つだけ言うなら、'],
  mismatch: ['合わなかったのは、', '期待していたのとちがったのは、', 'それでも残ったのは、'],
};

/** 「どうだった？」がこの値以下（あんまり）なら、合わなかったときのヒントを出す */
export const LOW_RATING_MAX = 2.9;

type Random = () => number;

function isLowRating(rating: number | null): boolean {
  return rating !== null && rating <= LOW_RATING_MAX;
}

/** 3 つのヒントを選ぶ枠。順に「感じたこと」「中身・自分ごと・つながり（低評価なら合わなかったとき）」「人に勧める」。 */
function slots(rating: number | null): (readonly string[])[] {
  const middle = isLowRating(rating) ? HINTS.mismatch : [...HINTS.content, ...HINTS.self, ...HINTS.connection];
  return [HINTS.feeling, middle, HINTS.recommend];
}

function pickOne(pool: readonly string[], random: Random): string {
  const index = Math.min(pool.length - 1, Math.max(0, Math.floor(random() * pool.length)));
  return pool[index] ?? '';
}

/** ヒントを 3 つ選ぶ（決まりは pickOtherHints と同じ）。 */
export function pickHints(rating: number | null, random: Random = Math.random): string[] {
  return slots(rating).map((pool) => pickOne(pool, random));
}

/**
 * 「ほかのヒント」。同じ決まりで、今出ているもの（current）と重ならないものを選ぶ。
 * 枠の中に今出ていないものがなければ、その枠は全体から選ぶ。
 */
export function pickOtherHints(
  current: readonly string[],
  rating: number | null,
  random: Random = Math.random,
): string[] {
  const shown = new Set(current);
  return slots(rating).map((pool) => {
    const fresh = pool.filter((hint) => !shown.has(hint));
    return pickOne(fresh.length > 0 ? fresh : pool, random);
  });
}
