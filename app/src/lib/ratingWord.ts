/** 評価の言葉。小数の誤差を避けるため 10 倍の整数で比べる。 */
export function getRatingWord(rating: number | null): string | null {
  if (rating === null) return null;
  const tenths = Math.round(rating * 10);
  if (tenths >= 50) return '最高';
  if (tenths >= 40) return 'よかった';
  if (tenths >= 30) return 'まあまあ';
  return 'あんまり';
}
