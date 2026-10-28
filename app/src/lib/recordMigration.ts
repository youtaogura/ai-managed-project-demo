import type { PostReadMemo } from '../types/record';
import { sourceFromIsbn } from './recordSource';
import type { KeyValueStorage } from './storage';

export const RECORDS_KEY = 'records.v1';
export const SCHEMA_VERSION_STORAGE_KEY = 'records.schemaVersion';
export const CURRENT_SCHEMA_VERSION = 4;
/** 使わなくなった保存キー（書き出しの設定）。版 4 への移行で消す。 */
export const LEGACY_STARTER_SETTINGS_KEY = 'starterSettings.v1';

type Migration = { to: number; run: (rawItems: unknown[]) => unknown[] };
type RawObject = Record<string, unknown>;

function isObject(value: unknown): value is RawObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function addSource(item: unknown): unknown {
  if (!isObject(item) || 'source' in item) return item;
  const isbn = item.isbn;
  return {
    ...item,
    source: sourceFromIsbn(typeof isbn === 'string' ? isbn : null),
  };
}

function isEntryBase(value: unknown): value is { id: string; text: string; createdAt: string } & RawObject {
  return (
    isObject(value) &&
    typeof value.id === 'string' &&
    value.id !== '' &&
    typeof value.text === 'string' &&
    typeof value.createdAt === 'string'
  );
}

function isLegacyStarter(value: unknown): value is { id: string; text: string; createdAt: string; starter: string } {
  return isEntryBase(value) && typeof value.starter === 'string';
}

function listOrEmpty(value: unknown): unknown[] | null {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : null;
}

/**
 * 書き出し（starters）と自由記述（freeTexts）を読後メモ（postReadMemos）にまとめ、引用の starter を外す。
 * 書き出しは「書き出しの文 + 続き」を 1 件の本文にする。本文が空のものは捨てる。id と createdAt は引き継ぎ、書いた順に並べる。
 * 形が壊れているものは変えずに返す（読み込みの検査で弾かれる）。変えるものがなければ同じ値を返す。
 */
export function toPostReadMemos(item: unknown): unknown {
  if (!isObject(item)) return item;
  const quotes = item.quotes;
  const hasQuoteStarter = Array.isArray(quotes) && quotes.some((q) => isObject(q) && 'starter' in q);
  if (!('starters' in item) && !('freeTexts' in item) && !hasQuoteStarter) return item;

  const starters = listOrEmpty(item.starters);
  const freeTexts = listOrEmpty(item.freeTexts);
  const existing = listOrEmpty(item.postReadMemos);
  if (
    starters === null ||
    freeTexts === null ||
    existing === null ||
    !starters.every(isLegacyStarter) ||
    !freeTexts.every(isEntryBase)
  ) {
    return item;
  }

  const converted: PostReadMemo[] = [
    ...starters
      .filter((s) => s.text.trim() !== '')
      .map((s) => ({ id: s.id, text: `${s.starter}${s.text.trim()}`, createdAt: s.createdAt })),
    ...freeTexts
      .filter((f) => f.text.trim() !== '')
      .map((f) => ({ id: f.id, text: f.text.trim(), createdAt: f.createdAt })),
  ];
  // sort は安定なので、同じ時刻なら元の並び（既存 → 書き出し → 自由記述）を保つ
  const postReadMemos = [...existing, ...converted].sort((a, b) => {
    const x = isObject(a) && typeof a.createdAt === 'string' ? a.createdAt : '';
    const y = isObject(b) && typeof b.createdAt === 'string' ? b.createdAt : '';
    return x === y ? 0 : x < y ? -1 : 1;
  });

  const { starters: _starters, freeTexts: _freeTexts, ...rest } = item;
  return {
    ...rest,
    postReadMemos,
    ...(Array.isArray(quotes)
      ? {
          quotes: quotes.map((q) => {
            if (!isObject(q) || !('starter' in q)) return q;
            const { starter: _starter, ...quote } = q;
            return quote;
          }),
        }
      : {}),
  };
}

// 版ごとの移行。今後の移行はここに { to, run } を足す
export const MIGRATIONS: Migration[] = [
  { to: 2, run: (rawItems) => rawItems.map(addSource) },
  { to: 4, run: (rawItems) => rawItems.map(toPostReadMemos) },
];

export async function migrateRecords(storage: KeyValueStorage): Promise<boolean> {
  try {
    const stored = Number(await storage.getItem(SCHEMA_VERSION_STORAGE_KEY));
    const version = Number.isInteger(stored) ? stored : 0;
    if (version >= CURRENT_SCHEMA_VERSION) return true;

    const raw = await storage.getItem(RECORDS_KEY);
    if (raw !== null) {
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return false;
      let items: unknown[] = parsed;
      for (const migration of MIGRATIONS) {
        if (migration.to > version) items = migration.run(items);
      }
      if (items.some((item, i) => item !== parsed[i])) {
        await storage.setItem(RECORDS_KEY, JSON.stringify(items));
      }
    }
    if (version < 4) await storage.removeItem(LEGACY_STARTER_SETTINGS_KEY).catch(() => undefined);
    await storage.setItem(SCHEMA_VERSION_STORAGE_KEY, String(CURRENT_SCHEMA_VERSION));
    return true;
  } catch {
    return false;
  }
}
