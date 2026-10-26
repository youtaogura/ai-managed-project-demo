import { findEnvReferences, parseEnvExample } from '../envExample';

// @types/node が未導入のため、使う分だけ型を宣言して読み込む
type Dirent = { name: string; isDirectory(): boolean };
const fs = jest.requireActual<{
  readdirSync(dir: string, options: { withFileTypes: true }): Dirent[];
  readFileSync(file: string, encoding: 'utf8'): string;
}>('fs');
const path = jest.requireActual<{ join(...parts: string[]): string }>('path');

// Jest は app/ をカレントディレクトリとして実行される
const appDir = process.cwd();
const srcDir = path.join(appDir, 'src');
const examplePath = path.join(appDir, '.env.example');

function listSources(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry: Dirent) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === '__tests__' ? [] : listSources(full);
    return /\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith('.d.ts') ? [full] : [];
  });
}

describe('findEnvReferences', () => {
  it('EXPO_PUBLIC_ の参照を重複なく抽出する', () => {
    const source = `
      const a = process.env.EXPO_PUBLIC_A;
      const b = process.env.EXPO_PUBLIC_B_2 ?? process.env.EXPO_PUBLIC_A;
      const c = process.env.NODE_ENV;
    `;
    expect(findEnvReferences(source)).toEqual(['EXPO_PUBLIC_A', 'EXPO_PUBLIC_B_2']);
  });

  it('参照がなければ空配列', () => {
    expect(findEnvReferences('const x = 1;')).toEqual([]);
  });
});

describe('parseEnvExample', () => {
  it('空行とコメント行を除き NAME=value を分解する', () => {
    const text = '# comment\n\nEXPO_PUBLIC_A=\nEXPO_PUBLIC_B=abc\n# EXPO_PUBLIC_C=\r\nbroken\n=x\n';
    expect(parseEnvExample(text)).toEqual([
      { name: 'EXPO_PUBLIC_A', value: '' },
      { name: 'EXPO_PUBLIC_B', value: 'abc' },
    ]);
  });

  it('行末コメントは値として検出される（空でない）', () => {
    expect(parseEnvExample('EXPO_PUBLIC_A= # memo')).toEqual([
      { name: 'EXPO_PUBLIC_A', value: '# memo' },
    ]);
  });
});

describe('.env.example とコードの一致', () => {
  const text = fs.readFileSync(examplePath, 'utf8');
  const entries = parseEnvExample(text);
  const referenced = [
    ...new Set(listSources(srcDir).flatMap((f) => findEnvReferences(fs.readFileSync(f, 'utf8')))),
  ];
  const documented = entries.map((e) => e.name);

  it('コードが参照する変数がすべて載っている', () => {
    expect(referenced.filter((n) => !documented.includes(n))).toEqual([]);
  });

  it('コードで参照されていない変数が載っていない', () => {
    expect(documented.filter((n) => !referenced.includes(n))).toEqual([]);
  });

  it('すべての値が空', () => {
    expect(entries.filter((e) => e.value !== '')).toEqual([]);
  });

  it('各変数の直前にコメント行がある', () => {
    const lines = text.split(/\r?\n/);
    for (const name of documented) {
      const i = lines.findIndex((l: string) => l.startsWith(`${name}=`));
      expect(lines[i - 1]?.startsWith('#')).toBe(true);
    }
  });
});
