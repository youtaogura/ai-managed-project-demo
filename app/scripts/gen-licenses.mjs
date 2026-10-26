// package.json の dependencies から、同梱ライブラリの一覧（src/generated/licenses.json）を生成する
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));

function licenseName(pkg) {
  const pick = (v) => (typeof v === 'string' ? v : v && typeof v.type === 'string' ? v.type : null);
  const names = Array.isArray(pkg.licenses)
    ? pkg.licenses.map(pick).filter(Boolean)
    : [pick(pkg.license)].filter(Boolean);
  const joined = names.join(' OR ');
  return joined === '' ? '不明' : joined;
}

const { dependencies = {} } = readJson(join(root, 'package.json'));
const entries = Object.keys(dependencies)
  .sort()
  .map((name) => {
    const pkg = readJson(join(root, 'node_modules', name, 'package.json'));
    const license = pkg.license !== undefined ? licenseName({ license: pkg.license }) : licenseName(pkg);
    return { name, version: String(pkg.version), license };
  });

writeFileSync(join(root, 'src/generated/licenses.json'), `${JSON.stringify(entries, null, 2)}\n`);
console.log(`${entries.length} 件のライセンスを書き出しました`);
