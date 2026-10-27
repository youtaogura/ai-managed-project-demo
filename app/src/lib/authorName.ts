const ROLE = '(?:編著|共著|監訳|監修|原作|イラスト|写真|著|編|訳|絵|画)';
const ROLE_MARK = new RegExp(`(?:\\s*[／/]\\s*|\\s+)${ROLE}(?=\\s|$|[、／/,，])`, 'g');
const LIFE_YEARS = /[,，]?\s*\d{4}-(?:\d{4})?\s*$/;
const JAPANESE = /[\u3040-\u30ff\u3400-\u9fff]/;
const SEPARATOR = '、';

function normalizePerson(person: string): string | null {
  const parts = person
    .replace(LIFE_YEARS, '')
    .split(/[,，]/)
    .map((part) => part.trim())
    .filter((part) => part !== '');
  if (parts.length === 0) return null;
  const [family, ...given] = parts;
  const joined = [family, ...given].join('');
  if (JAPANESE.test(joined)) {
    const name = joined.replace(/\s+/g, '');
    return name === '' ? null : name;
  }
  return given.length === 0 ? family : `${given.join(' ')} ${family}`;
}

function splitPersons(raw: string): string[] {
  return raw
    .trim()
    .replace(ROLE_MARK, '\u0000')
    .split('\u0000')
    .map((person) => person.trim())
    .filter((person) => person !== '');
}

function collect(raws: string[]): string | null {
  const names: string[] = [];
  for (const raw of raws) {
    for (const person of splitPersons(raw)) {
      const name = normalizePerson(person);
      if (name !== null && !names.includes(name)) names.push(name);
    }
  }
  return names.length === 0 ? null : names.join(SEPARATOR);
}

export function normalizeAuthor(raw: string): string | null {
  return collect([raw]);
}

export function normalizeAuthors(raws: string[]): string | null {
  return collect(raws);
}
