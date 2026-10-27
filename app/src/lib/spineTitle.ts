export type VerticalUnit = {
  kind: 'upright' | 'rotate' | 'latin' | 'tcy';
  text: string;
  /** 小さい仮名を右上に寄せる */
  shift?: boolean;
};

/** 半角文字 1 つぶんの幅（文字サイズ比）。描画前に測れないので近似する */
export const LATIN_CHAR_RATIO = 0.75;
/** 小さい仮名のずらし量（文字サイズ比） */
export const SHIFT_RATIO = 0.08;
/** 縦書きの三点リーダ（Shippori Mincho に収録あり） */
export const ELLIPSIS = '︙';

const ROTATE_CHARS = new Set(['ー', 'ｰ', '〜', '～', '…', '‥', '―', '—', '–', '−']);
const SMALL_KANA = new Set(['ゃ', 'ゅ', 'ょ', 'っ', 'ャ', 'ュ', 'ョ', 'ッ']);
const BRACKETS: Record<string, string> = {
  '（': '︵',
  '）': '︶',
  '(': '︵',
  ')': '︶',
  '「': '﹁',
  '」': '﹂',
  '『': '﹃',
  '』': '﹄',
  '【': '︻',
  '】': '︼',
  '〔': '︹',
  '〕': '︺',
  '〈': '︿',
  '〉': '﹀',
  '《': '︽',
  '》': '︾',
};
const LATIN_SYMBOLS = new Set([' ', '.', ',', '-', "'", '&', ':', '/', '!', '?', '+', '#']);
const TCY_MAX = 2;

const isAlnum = (c: string) => /^[A-Za-z0-9]$/.test(c);

function latinUnit(text: string): VerticalUnit {
  const tcy = text.length <= TCY_MAX && /^[0-9]+$/.test(text);
  return { kind: tcy ? 'tcy' : 'latin', text };
}

export function splitVerticalUnits(title: string): VerticalUnit[] {
  const chars = Array.from(title);
  const units: VerticalUnit[] = [];
  let i = 0;
  while (i < chars.length) {
    const c = chars[i];
    if (isAlnum(c)) {
      let j = i;
      while (j < chars.length && (isAlnum(chars[j]) || LATIN_SYMBOLS.has(chars[j]))) j += 1;
      const run = chars.slice(i, j).join('').trimEnd();
      units.push(latinUnit(run));
      i += Array.from(run).length;
      continue;
    }
    i += 1;
    if (c === ' ') continue;
    if (LATIN_SYMBOLS.has(c) && !(c in BRACKETS)) {
      units.push({ kind: 'latin', text: c });
    } else if (c in BRACKETS) {
      units.push({ kind: 'upright', text: BRACKETS[c] });
    } else if (ROTATE_CHARS.has(c)) {
      units.push({ kind: 'rotate', text: c });
    } else if (SMALL_KANA.has(c)) {
      units.push({ kind: 'upright', text: c, shift: true });
    } else {
      units.push({ kind: 'upright', text: c });
    }
  }
  return units;
}

export function unitLength(unit: VerticalUnit, fontSize: number, lineHeight: number): number {
  return unit.kind === 'latin' ? unit.text.length * fontSize * LATIN_CHAR_RATIO : lineHeight;
}

export function fitVerticalUnits(
  units: VerticalUnit[],
  availableHeight: number,
  fontSize: number,
  lineHeight: number,
): { units: VerticalUnit[]; truncated: boolean } {
  const total = units.reduce((sum, u) => sum + unitLength(u, fontSize, lineHeight), 0);
  if (total <= availableHeight) return { units, truncated: false };
  const budget = availableHeight - lineHeight;
  const kept: VerticalUnit[] = [];
  let used = 0;
  for (const unit of units) {
    used += unitLength(unit, fontSize, lineHeight);
    if (used > budget) break;
    kept.push(unit);
  }
  return { units: kept, truncated: true };
}
