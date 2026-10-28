import type { StarterItem, StarterSettings } from '../types/starter';
import type {
  FreeTextEntry,
  MediaRecord,
  NewRecordInput,
  QuoteEntry,
  StarterEntry,
} from '../types/record';
import { normalizePage, recordToInput } from './notes';
import { pickStarters, swapStarters } from './starterPicker';

export type WriteCard = {
  key: string;
  kind: 'starter' | 'free';
  starterId: string | null;
  starter: string;
  text: string;
  page: string;
  asQuote: boolean;
};

export type WriteDraft = {
  oneLiner: string;
  cards: WriteCard[];
  selectedKey: string | null;
};

type Random = () => number;
type KeyGenerator = () => string;

const defaultKey: KeyGenerator = () => `card-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const defaultGenerateId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
const defaultNow = () => new Date().toISOString();

function starterCard(item: StarterItem, key: string): WriteCard {
  return { key, kind: 'starter', starterId: item.id, starter: item.text, text: '', page: '', asQuote: false };
}

export function createFreeCard(key: string = defaultKey()): WriteCard {
  return { key, kind: 'free', starterId: null, starter: '', text: '', page: '', asQuote: false };
}

export function isWritten(card: Pick<WriteCard, 'text'>): boolean {
  return card.text.trim() !== '';
}

/** 設定の数だけ、オンの書き出しから重複なくカードを作る。 */
export function createCards(
  settings: StarterSettings,
  random: Random = Math.random,
  keyOf: KeyGenerator = defaultKey,
): WriteCard[] {
  return pickStarters(settings, random).map((item) => starterCard(item, keyOf()));
}

/** 書いていないカードだけを入れ替える。書いたカードと自由記述はそのまま残す。 */
export function replaceUnwrittenCards(
  cards: readonly WriteCard[],
  settings: StarterSettings,
  random: Random = Math.random,
  keyOf: KeyGenerator = defaultKey,
): WriteCard[] {
  const kept = cards.filter((card) => card.kind === 'starter' && isWritten(card));
  const unwritten = cards.filter((card) => card.kind === 'starter' && !isWritten(card));
  if (unwritten.length === 0) return [...cards];
  const keptIds = new Set(kept.map((card) => card.starterId));
  const swapped = swapStarters(
    { ...settings, count: unwritten.length as StarterSettings['count'] },
    cards.filter((c) => c.kind === 'starter').map((c) => c.starterId ?? ''),
    random,
  ).filter((item) => !keptIds.has(item.id));
  const fresh = swapped.slice(0, unwritten.length).map((item) => starterCard(item, keyOf()));
  let next = 0;
  const result: WriteCard[] = [];
  for (const card of cards) {
    if (card.kind === 'starter' && !isWritten(card)) {
      const replacement = fresh[next++];
      result.push(replacement ?? card);
    } else {
      result.push(card);
    }
  }
  return result;
}

/** 下書きからカードを戻す。設定から消えた・オフの書き出しは捨て、足りない分は抽選で補う。 */
export function restoreCards(
  draftCards: readonly WriteCard[],
  settings: StarterSettings,
  random: Random = Math.random,
  keyOf: KeyGenerator = defaultKey,
): WriteCard[] {
  const free = draftCards.filter((card) => card.kind === 'free');
  if (!settings.enabled) return free;
  const enabledIds = new Set(settings.items.filter((item) => item.enabled).map((item) => item.id));
  const alive = draftCards.filter(
    (card) => card.kind === 'free' || (card.starterId !== null && enabledIds.has(card.starterId)),
  );
  const starters = alive.filter((card) => card.kind === 'starter');
  // 復元では抽選しない。捨てたカードがあるときだけ、その分を補う
  const missing = draftCards.filter((card) => card.kind === 'starter').length - starters.length;
  if (missing <= 0) return alive;
  const used = new Set(starters.map((card) => card.starterId));
  const pool: StarterSettings = {
    ...settings,
    count: missing as StarterSettings['count'],
    items: settings.items.filter((item) => !used.has(item.id)),
  };
  const extra = pickStarters(pool, random).map((item) => starterCard(item, keyOf()));
  const firstFree = alive.findIndex((card) => card.kind === 'free');
  if (firstFree === -1) return [...alive, ...extra];
  return [...alive.slice(0, firstFree), ...extra, ...alive.slice(firstFree)];
}

export function hasAnythingToSave(oneLiner: string, cards: readonly WriteCard[]): boolean {
  return oneLiner.trim() !== '' || cards.some(isWritten);
}

export function isDraftBlank(draft: Pick<WriteDraft, 'oneLiner' | 'cards'>): boolean {
  return (
    draft.oneLiner.trim() === '' &&
    draft.cards.every((card) => card.text === '' && card.page === '')
  );
}

export type WriteOptions = { now?: () => string; generateId?: () => string };

export function buildWriteInput(
  record: MediaRecord,
  values: { oneLiner: string; cards: readonly WriteCard[] },
  options: WriteOptions = {},
): NewRecordInput {
  const now = options.now ?? defaultNow;
  const generateId = options.generateId ?? defaultGenerateId;
  const starters: StarterEntry[] = [];
  const quotes: QuoteEntry[] = [];
  const freeTexts: FreeTextEntry[] = [];
  for (const card of values.cards) {
    if (!isWritten(card)) continue;
    const text = card.text.trim();
    if (card.kind === 'free') {
      freeTexts.push({ id: generateId(), text, createdAt: now() });
    } else if (card.asQuote) {
      quotes.push({
        id: generateId(),
        text,
        page: normalizePage(card.page),
        comment: null,
        starter: card.starter,
        createdAt: now(),
      });
    } else {
      starters.push({ id: generateId(), starter: card.starter, text, createdAt: now() });
    }
  }
  const oneLiner = values.oneLiner.trim();
  return {
    ...recordToInput(record, record.memos, [...record.quotes, ...quotes]),
    oneLiner: oneLiner === '' ? null : oneLiner,
    starters: [...record.starters, ...starters],
    freeTexts: [...record.freeTexts, ...freeTexts],
  };
}
