export function formatPeriod(start: string | null, end: string | null): string | null {
  if (start && end) return `${start} 〜 ${end}`;
  if (start) return `${start} 〜`;
  if (end) return `〜 ${end}`;
  return null;
}

export function formatRating(rating: number | null): string {
  return rating === null ? '未評価' : `★ ${rating.toFixed(1)}`;
}

const pad = (n: number) => String(n).padStart(2, '0');

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
