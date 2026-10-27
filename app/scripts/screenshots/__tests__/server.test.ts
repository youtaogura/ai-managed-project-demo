import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { resolveRequestPath } from '../server.cjs';

describe('resolveRequestPath', () => {
  let root: string;
  let dist: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'shots-'));
    dist = join(root, 'dist');
    mkdirSync(join(dist, 'reading'), { recursive: true });
    mkdirSync(join(dist, 'record'), { recursive: true });
    writeFileSync(join(dist, 'index.html'), 'index');
    writeFileSync(join(dist, 'settings.html'), 'settings');
    writeFileSync(join(dist, 'reading', '[id].html'), 'reading');
    writeFileSync(join(dist, 'record', 'index.html'), 'record-index');
    writeFileSync(join(root, 'secret.txt'), 'secret');
  });

  afterEach(() => rmSync(root, { recursive: true, force: true }));

  it('/ は index.html', () => {
    expect(resolveRequestPath(dist, '/')).toBe(join(dist, 'index.html'));
  });

  it('/settings は settings.html', () => {
    expect(resolveRequestPath(dist, '/settings')).toBe(join(dist, 'settings.html'));
  });

  it('x.html がなければ x/index.html', () => {
    expect(resolveRequestPath(dist, '/record')).toBe(join(dist, 'record', 'index.html'));
  });

  it('動的ルート /reading/abc は reading/[id].html', () => {
    expect(resolveRequestPath(dist, '/reading/abc')).toBe(join(dist, 'reading', '[id].html'));
  });

  it('クエリは無視し、そのままのファイルも返す', () => {
    expect(resolveRequestPath(dist, '/settings?x=1')).toBe(join(dist, 'settings.html'));
    expect(resolveRequestPath(dist, '/settings.html')).toBe(join(dist, 'settings.html'));
  });

  it('存在しないパスは index.html', () => {
    expect(resolveRequestPath(dist, '/nothing')).toBe(join(dist, 'index.html'));
    expect(resolveRequestPath(dist, '/nothing/deep')).toBe(join(dist, 'index.html'));
  });

  it('.. を含むパスはディレクトリの外を読まない', () => {
    const expected = join(dist, 'index.html');
    expect(resolveRequestPath(dist, '/../secret.txt')).toBe(expected);
    expect(resolveRequestPath(dist, '/%2e%2e/secret.txt')).toBe(expected);
    expect(resolveRequestPath(dist, '/reading/../../secret.txt')).toBe(expected);
  });
});
