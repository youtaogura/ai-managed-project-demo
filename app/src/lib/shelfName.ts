import type { Shelf } from '../types/shelf';

export const SHELF_NAME_MAX = 20;
export const RESERVED_SHELF_NAME = 'すべての本';
export const SHELF_NAME_EXAMPLES = ['SF', '哲学', 'いつか読み返す', '仕事の本'] as const;

export const ERROR_SHELF_NAME_EMPTY = '本棚の名前を入力してください';
export const ERROR_SHELF_NAME_TOO_LONG = `本棚の名前は ${SHELF_NAME_MAX} 文字までです`;
export const ERROR_SHELF_NAME_DUPLICATE = '同じ名前の本棚があります';
export const ERROR_SHELF_NAME_RESERVED = 'その名前は使えません';

export type ShelfNameResult = { ok: true; name: string } | { ok: false; error: string };

function comparable(name: string): string {
  return name.trim().normalize('NFKC').toLowerCase();
}

/** 前後の空白を除いた名前を返す。exceptId の本棚自身との一致は重複にしない。 */
export function validateShelfName(
  name: string,
  shelves: readonly Pick<Shelf, 'id' | 'name'>[],
  exceptId?: string,
): ShelfNameResult {
  const trimmed = name.trim();
  if (trimmed === '') return { ok: false, error: ERROR_SHELF_NAME_EMPTY };
  if ([...trimmed].length > SHELF_NAME_MAX) return { ok: false, error: ERROR_SHELF_NAME_TOO_LONG };
  const key = comparable(trimmed);
  if (key === comparable(RESERVED_SHELF_NAME)) return { ok: false, error: ERROR_SHELF_NAME_RESERVED };
  if (shelves.some((s) => s.id !== exceptId && comparable(s.name) === key)) {
    return { ok: false, error: ERROR_SHELF_NAME_DUPLICATE };
  }
  return { ok: true, name: trimmed };
}
