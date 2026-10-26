export function isValidEan13(code: string): boolean {
  if (!/^\d{13}$/.test(code)) return false;
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(code[i]) * (i % 2 === 0 ? 1 : 3);
  return (10 - (sum % 10)) % 10 === Number(code[12]);
}

export function normalizeIsbn(input: string): string {
  return input
    .replace(/[０-９Ｘｘ]/g, (c) =>
      c === 'Ｘ' || c === 'ｘ' ? 'X' : String.fromCharCode(c.charCodeAt(0) - 0xfee0),
    )
    .replace(/[\s　\-－ー‐]/g, '')
    .replace(/x/g, 'X');
}

function isValidIsbn10(code: string): boolean {
  if (!/^\d{9}[\dX]$/.test(code)) return false;
  let sum = 0;
  for (let i = 0; i < 10; i++) sum += (code[i] === 'X' ? 10 : Number(code[i])) * (10 - i);
  return sum % 11 === 0;
}

function ean13CheckDigit(first12: string): string {
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(first12[i]) * (i % 2 === 0 ? 1 : 3);
  return String((10 - (sum % 10)) % 10);
}

/** 有効な ISBN-10 / ISBN-13 を ISBN-13 に揃える。無効なら null。 */
export function toIsbn13(input: string): string | null {
  const code = normalizeIsbn(input);
  if (code.length === 13) {
    return /^97[89]/.test(code) && isValidEan13(code) ? code : null;
  }
  if (isValidIsbn10(code)) {
    const body = `978${code.slice(0, 9)}`;
    return body + ean13CheckDigit(body);
  }
  return null;
}
