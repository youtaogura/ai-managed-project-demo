/// <reference types="node" />
import fs from 'node:fs';
import path from 'node:path';

import licensesJson from '../../generated/licenses.json';
import { parseLicenseList } from '../licenses';

const root = path.join(__dirname, '../../..');
const readJson = (file: string): { dependencies?: Record<string, string>; version?: string } =>
  JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));

describe('parseLicenseList', () => {
  it('不正な要素を捨てる', () => {
    expect(
      parseLicenseList([
        { name: 'a', version: '1', license: 'MIT' },
        { name: 'b', version: 2, license: 'MIT' },
        null,
        'x',
      ]),
    ).toEqual([{ name: 'a', version: '1', license: 'MIT' }]);
  });

  it('配列でなければ空配列', () => {
    expect(parseLicenseList({})).toEqual([]);
  });
});

describe('licenses.json の同期（更新は pnpm licenses:gen）', () => {
  const entries = parseLicenseList(licensesJson);

  it('名前の集合が dependencies と一致する', () => {
    const deps = Object.keys(readJson('package.json').dependencies ?? {}).sort();
    expect(entries.map((e) => e.name).sort()).toEqual(deps);
  });

  it('version が node_modules の実バージョンと一致し、license が空でない', () => {
    for (const e of entries) {
      expect(e.version).toBe(readJson(`node_modules/${e.name}/package.json`).version);
      expect(e.license).not.toBe('');
    }
  });
});
