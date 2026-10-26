import type { StarterItem, StarterSettings } from '../types/starter';
import { STARTER_FIXED } from './constants';

export type StarterValidation = { ok: true; text: string } | { ok: false; error: string };

/** 前後の空白を除き、空・重複（固定の書き出しを含む）を弾く。exceptId は編集中の項目。 */
export function validateStarterText(
  text: string,
  items: readonly StarterItem[],
  exceptId?: string,
): StarterValidation {
  const trimmed = text.trim();
  if (trimmed === '') return { ok: false, error: '書き出しを入力してください' };
  const duplicated =
    trimmed === STARTER_FIXED || items.some((item) => item.id !== exceptId && item.text === trimmed);
  if (duplicated) return { ok: false, error: '同じ書き出しがあります' };
  return { ok: true, text: trimmed };
}

export function addStarterItem(items: readonly StarterItem[], text: string, id: string): StarterItem[] {
  return [...items, { id, text, enabled: true, custom: true }];
}

export function renameStarterItem(items: readonly StarterItem[], id: string, text: string): StarterItem[] {
  return items.map((item) => (item.id === id && item.custom ? { ...item, text } : item));
}

export function removeStarterItem(items: readonly StarterItem[], id: string): StarterItem[] {
  return items.filter((item) => !(item.id === id && item.custom));
}

export function setStarterItemEnabled(
  items: readonly StarterItem[],
  id: string,
  enabled: boolean,
): StarterItem[] {
  return items.map((item) => (item.id === id ? { ...item, enabled } : item));
}

export function createStarterId(): string {
  return `starter-custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** 設定画面の行の値 */
export function starterSummary(settings: StarterSettings): string {
  if (!settings.enabled) return 'オフ';
  const pool = settings.items.filter((item) => item.enabled).length;
  return `オン · 一度に ${settings.count} つ · ${pool} 個から`;
}
