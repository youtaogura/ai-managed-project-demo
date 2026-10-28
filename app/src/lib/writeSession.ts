import type { MediaRecord, NewRecordInput, PostReadMemo } from '../types/record';
import { pickHints, pickOtherHints } from './hints';
import { recordToInput } from './notes';

/** 書く画面のカード。starter はヒントの文、text はその続き（自由に書くカードは starter が空）。 */
export type WriteCard = {
  key: string;
  kind: 'starter' | 'free';
  starter: string;
  text: string;
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

function hintCard(hint: string, key: string): WriteCard {
  return { key, kind: 'starter', starter: hint, text: '' };
}

export function createFreeCard(key: string = defaultKey()): WriteCard {
  return { key, kind: 'free', starter: '', text: '' };
}

export function isWritten(card: Pick<WriteCard, 'text'>): boolean {
  return card.text.trim() !== '';
}

/** ヒントを 3 つ選んでカードを作る。rating は本の「どうだった？」。 */
export function createCards(
  rating: number | null,
  random: Random = Math.random,
  keyOf: KeyGenerator = defaultKey,
): WriteCard[] {
  return pickHints(rating, random).map((hint) => hintCard(hint, keyOf()));
}

/** 書いていないヒントのカードだけを、今出ているものと別のヒントに入れ替える。書いたカードと自由記述はそのまま残す。 */
export function replaceUnwrittenCards(
  cards: readonly WriteCard[],
  rating: number | null,
  random: Random = Math.random,
  keyOf: KeyGenerator = defaultKey,
): WriteCard[] {
  const hintCards = cards.filter((card) => card.kind === 'starter');
  const others = pickOtherHints(
    hintCards.map((card) => card.starter),
    rating,
    random,
  );
  const kept = new Set(hintCards.filter(isWritten).map((card) => card.starter));
  let slot = 0;
  return cards.map((card) => {
    if (card.kind !== 'starter') return card;
    const hint = others[slot++];
    if (isWritten(card) || hint === undefined || kept.has(hint)) return card;
    kept.add(hint);
    return hintCard(hint, keyOf());
  });
}

/** 下書きからカードを戻す。ヒントのカードがひとつもなければ（前の版の下書きなど）新しく選んで前に足す。 */
export function restoreCards(
  draftCards: readonly WriteCard[],
  rating: number | null,
  random: Random = Math.random,
  keyOf: KeyGenerator = defaultKey,
): WriteCard[] {
  if (draftCards.some((card) => card.kind === 'starter')) return [...draftCards];
  return [...createCards(rating, random, keyOf), ...draftCards];
}

export function hasAnythingToSave(oneLiner: string, cards: readonly WriteCard[]): boolean {
  return oneLiner.trim() !== '' || cards.some(isWritten);
}

export function isDraftBlank(draft: Pick<WriteDraft, 'oneLiner' | 'cards'>): boolean {
  return draft.oneLiner.trim() === '' && draft.cards.every((card) => card.text === '');
}

export type WriteOptions = { now?: () => string; generateId?: () => string };

/** 書いたカードを読後メモとして足す（ヒントのカードは「ヒント + 続き」を 1 件の本文にする）。ひとことは oneLiner に入れる。 */
export function buildWriteInput(
  record: MediaRecord,
  values: { oneLiner: string; cards: readonly WriteCard[] },
  options: WriteOptions = {},
): NewRecordInput {
  const now = options.now ?? defaultNow;
  const generateId = options.generateId ?? defaultGenerateId;
  const added: PostReadMemo[] = values.cards.filter(isWritten).map((card) => {
    const text = card.text.trim();
    return {
      id: generateId(),
      text: card.kind === 'starter' ? `${card.starter}${text}` : text,
      createdAt: now(),
    };
  });
  const oneLiner = values.oneLiner.trim();
  return {
    ...recordToInput(record, record.memos, record.quotes),
    oneLiner: oneLiner === '' ? null : oneLiner,
    postReadMemos: [...record.postReadMemos, ...added],
  };
}
