import type { StarterItem, StarterSettings } from '../types/starter';

type Random = () => number;

function enabledItems(settings: StarterSettings): StarterItem[] {
  return settings.enabled ? settings.items.filter((item) => item.enabled) : [];
}

// Fisher-Yates で先頭 count 個を取る
function sample(items: StarterItem[], count: number, random: Random): StarterItem[] {
  const pool = [...items];
  const n = Math.min(count, pool.length);
  for (let i = 0; i < n; i++) {
    const j = i + Math.min(pool.length - i - 1, Math.floor(random() * (pool.length - i)));
    const tmp = pool[i];
    pool[i] = pool[j] as StarterItem;
    pool[j] = tmp as StarterItem;
  }
  return pool.slice(0, n);
}

/** オンの書き出しから重複なく count 個を選ぶ。固定の書き出しは含まない。 */
export function pickStarters(settings: StarterSettings, random: Random = Math.random): StarterItem[] {
  return sample(enabledItems(settings), settings.count, random);
}

/** 今出ている書き出し以外から選び直す。足りなければ現在のものから補う。 */
export function swapStarters(
  settings: StarterSettings,
  current: readonly string[],
  random: Random = Math.random,
): StarterItem[] {
  const enabled = enabledItems(settings);
  if (enabled.length <= settings.count) return enabled;
  const currentIds = new Set(current);
  const fresh = sample(
    enabled.filter((item) => !currentIds.has(item.id)),
    settings.count,
    random,
  );
  if (fresh.length >= settings.count) return fresh;
  const rest = sample(
    enabled.filter((item) => currentIds.has(item.id)),
    settings.count - fresh.length,
    random,
  );
  return [...fresh, ...rest];
}
