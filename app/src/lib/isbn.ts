export function normalizeIsbn(input: string): string {
  return input
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[ー－‐−―]/g, '-')
    .replace(/[\s　-]/g, '')
    .replace(/[xｘＸ]/g, 'X');
}

function ean13CheckDigit(first12: string): number {
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(first12[i]) * (i % 2 === 0 ? 1 : 3);
  return (10 - (sum % 10)) % 10;
}

function isValidIsbn10(value: string): boolean {
  if (!/^\d{9}[\dX]$/.test(value)) return false;
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    const digit = value[i] === 'X' ? 10 : Number(value[i]);
    sum += digit * (10 - i);
  }
  return sum % 11 === 0;
}

export function toIsbn13(input: string): string | null {
  const value = normalizeIsbn(input);
  if (value.length === 13) {
    if (!/^97[89]\d{10}$/.test(value)) return null;
    return ean13CheckDigit(value.slice(0, 12)) === Number(value[12]) ? value : null;
  }
  if (value.length === 10) {
    if (!isValidIsbn10(value)) return null;
    const base = `978${value.slice(0, 9)}`;
    return `${base}${ean13CheckDigit(base)}`;
  }
  return null;
}
