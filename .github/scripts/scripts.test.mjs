// CI スクリプトのテスト。一時 git リポジトリで「違反あり / なし」の PR を作って実行する。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { isAllowed } from './license-check.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8' });

const BASE_FILES = {
  'app/package.json': JSON.stringify({ dependencies: { react: '19' }, devDependencies: { jest: '30' } }),
  'app/jest.config.js': 'module.exports = {};\n',
  'app/src/screens/Home.tsx': 'export const Home = () => null;\n',
  'app/src/screens/__tests__/Home.test.tsx': "it('a', () => {});\nit('b', () => {});\n",
  'README.md': '# demo\n',
};

const GOOD_BODY = `## 概要\nToDo を追加\n\nCloses #7\n\n## 判断ログ\n\n| 論点 | 選んだ案 | 却下した案 | 理由 |\n|---|---|---|---|\n| 保存先 | state | AsyncStorage | 仕様で永続化は対象外 |\n`;

// base コミットの上に、ブランチ branch で changes を適用した一時リポジトリを作る
function makeRepo(changes = {}, { branch = 'agent/issue-7', remove = [] } = {}) {
  const dir = mkdtempSync(path.join(tmpdir(), 'ci-scripts-'));
  git(dir, 'init', '-q', '-b', 'main');
  git(dir, 'config', 'user.email', 't@example.com');
  git(dir, 'config', 'user.name', 't');
  write(dir, BASE_FILES);
  git(dir, 'add', '-A');
  git(dir, 'commit', '-qm', 'base');
  git(dir, 'checkout', '-qb', branch);
  write(dir, changes);
  for (const f of remove) git(dir, 'rm', '-q', f);
  git(dir, 'add', '-A');
  git(dir, 'commit', '-qm', 'change', '--allow-empty');
  return dir;
}

function write(dir, files) {
  for (const [f, content] of Object.entries(files)) {
    mkdirSync(path.dirname(path.join(dir, f)), { recursive: true });
    writeFileSync(path.join(dir, f), content);
  }
}

function runScript(script, dir, env = {}) {
  const r = spawnSync('node', [path.join(HERE, script)], {
    cwd: dir,
    encoding: 'utf8',
    env: { ...process.env, GITHUB_STEP_SUMMARY: '', BASE_SHA: 'main', HEAD_REF: 'agent/issue-7', ...env },
  });
  rmSync(dir, { recursive: true, force: true });
  return { code: r.status, out: r.stdout + r.stderr };
}

const SPEC = { 'docs/specs/issue-7.md': '# 仕様\n' };
const FEATURE = { 'app/src/screens/Todo.tsx': 'export const Todo = () => null;\n' };

// ---------- test-integrity ----------

test('integrity: 通常の変更は OK', () => {
  const r = runScript('test-integrity.mjs', makeRepo({ ...FEATURE, 'app/src/screens/__tests__/Todo.test.tsx': "it('c', () => {});\n" }));
  assert.equal(r.code, 0, r.out);
});

test('integrity: it.skip / it.only / xit の追加は NG', () => {
  for (const line of ["it.skip('x', () => {});", "it.only('x', () => {});", "xit('x', () => {});", "describe.skip('x', () => {});"]) {
    const r = runScript('test-integrity.mjs', makeRepo({ 'app/src/screens/__tests__/X.test.tsx': `${line}\n` }));
    assert.equal(r.code, 1, `${line}\n${r.out}`);
  }
});

test('integrity: 検査を抑制するコメントの追加は NG', () => {
  for (const c of ['// eslint-disable-next-line', '// @ts-ignore', '// @ts-expect-error', '/* istanbul ignore next */']) {
    const r = runScript('test-integrity.mjs', makeRepo({ 'app/src/screens/Todo.tsx': `${c}\nexport const a = 1;\n` }));
    assert.equal(r.code, 1, `${c}\n${r.out}`);
  }
});

test('integrity: テストファイルの削除・テストケース数の減少は検査しない', () => {
  const del = runScript('test-integrity.mjs', makeRepo({}, { remove: ['app/src/screens/__tests__/Home.test.tsx'] }));
  assert.equal(del.code, 0, del.out);
  const dec = runScript('test-integrity.mjs', makeRepo({ 'app/src/screens/__tests__/Home.test.tsx': "it('a', () => {});\n" }));
  assert.equal(dec.code, 0, dec.out);
});

test('integrity: 人間のブランチでは警告のみ', () => {
  const r = runScript('test-integrity.mjs', makeRepo({ 'app/src/screens/__tests__/X.test.tsx': "it.only('x', () => {});\n" }, { branch: 'feature/x' }), {
    HEAD_REF: 'feature/x',
  });
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /⚠️/);
});

// ---------- pr-policy ----------

test('policy: 形式・範囲が正しければ OK', () => {
  const r = runScript('pr-policy.mjs', makeRepo({ ...SPEC, ...FEATURE }), { PR_BODY: GOOD_BODY });
  assert.equal(r.code, 0, r.out);
});

test('policy: Closes #N がないと NG', () => {
  const r = runScript('pr-policy.mjs', makeRepo({ ...SPEC, ...FEATURE }), { PR_BODY: GOOD_BODY.replace('Closes #7', '') });
  assert.equal(r.code, 1, r.out);
});

test('policy: 別の Issue 番号では NG', () => {
  const r = runScript('pr-policy.mjs', makeRepo({ ...SPEC, ...FEATURE }), { PR_BODY: GOOD_BODY.replace('#7', '#8') });
  assert.equal(r.code, 1, r.out);
});

test('policy: 判断ログがテンプレートのままだと NG', () => {
  const body = GOOD_BODY.replace('| 保存先 | state | AsyncStorage | 仕様で永続化は対象外 |', '|  |  |  |  |');
  const r = runScript('pr-policy.mjs', makeRepo({ ...SPEC, ...FEATURE }), { PR_BODY: body });
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /判断ログ/);
});

test('policy: 仕様書がないと NG', () => {
  const r = runScript('pr-policy.mjs', makeRepo({ ...FEATURE }), { PR_BODY: GOOD_BODY });
  assert.equal(r.code, 1, r.out);
});

test('policy: 保護対象・範囲外のファイル変更は NG', () => {
  for (const f of ['app/jest.config.js', 'README.md', 'orchestrator/x.mjs', '.github/workflows/x.yml']) {
    const r = runScript('pr-policy.mjs', makeRepo({ ...SPEC, ...FEATURE, [f]: 'changed\n' }), { PR_BODY: GOOD_BODY });
    assert.equal(r.code, 1, `${f}\n${r.out}`);
  }
});

test('policy: 仕様書に書かれていない依存追加は NG、書かれていれば OK', () => {
  const pkg = JSON.stringify({ dependencies: { react: '19', zustand: '5' }, devDependencies: { jest: '30' } });
  const ng = runScript('pr-policy.mjs', makeRepo({ ...SPEC, 'app/package.json': pkg }), { PR_BODY: GOOD_BODY });
  assert.equal(ng.code, 1, ng.out);
  assert.match(ng.out, /zustand/);
  const ok = runScript('pr-policy.mjs', makeRepo({ 'docs/specs/issue-7.md': '状態管理に zustand を追加する。理由: ...\n', 'app/package.json': pkg }), {
    PR_BODY: GOOD_BODY,
  });
  assert.equal(ok.code, 0, ok.out);
});

test('policy: エージェント以外のブランチは検査しない', () => {
  const r = runScript('pr-policy.mjs', makeRepo({ 'README.md': 'x\n' }, { branch: 'feature/x' }), { HEAD_REF: 'feature/x', PR_BODY: '' });
  assert.equal(r.code, 0, r.out);
});

// ---------- diff-coverage ----------

function coverageRepo(lcovFor) {
  const dir = makeRepo({ 'app/src/lib/calc.ts': 'export function f(a: number) {\n  if (a > 0) {\n    return 1;\n  }\n  return 2;\n}\n' });
  const abs = path.join(dir, 'app/src/lib/calc.ts');
  write(dir, { 'app/coverage/lcov.info': lcovFor(abs) });
  return dir;
}

test('coverage: 変更行がすべて実行されていれば OK', () => {
  const r = runScript('diff-coverage.mjs', coverageRepo((f) => `SF:${f}\nDA:1,1\nDA:2,1\nDA:3,1\nDA:5,1\nend_of_record\n`));
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /100\.0%/);
});

test('coverage: 基準を下回ると NG（未実行行を表示）', () => {
  const r = runScript('diff-coverage.mjs', coverageRepo((f) => `SF:${f}\nDA:1,1\nDA:2,1\nDA:3,0\nDA:5,0\nend_of_record\n`));
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /50\.0%/);
  assert.match(r.out, /L3, L5/);
});

test('coverage: 基準値は変更できる', () => {
  const r = runScript('diff-coverage.mjs', coverageRepo((f) => `SF:${f}\nDA:1,1\nDA:2,1\nDA:3,0\nDA:5,0\nend_of_record\n`), {
    DIFF_COVERAGE_MIN: '50',
  });
  assert.equal(r.code, 0, r.out);
});

test('coverage: どのテストからも読み込まれない新規ファイルは NG', () => {
  const r = runScript('diff-coverage.mjs', coverageRepo(() => 'SF:/elsewhere/x.ts\nDA:1,1\nend_of_record\n'));
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /読み込まれていません/);
});

test('coverage: 型定義だけのファイル（Jest のカバレッジに載らない）は未実行に数えない', () => {
  const dir = makeRepo({
    'app/src/lib/calc.ts': 'export function f() {\n  return 1;\n}\n',
    'app/src/types/thing.ts': '/** もの */\nexport type Thing = {\n  // 名前\n  name: string;\n};\nexport interface Other { id: string }\n',
  });
  write(dir, { 'app/coverage/lcov.info': `SF:${path.join(dir, 'app/src/lib/calc.ts')}\nDA:1,1\nDA:2,1\nend_of_record\n` });
  const r = runScript('diff-coverage.mjs', dir);
  assert.equal(r.code, 0, r.out);
  assert.doesNotMatch(r.out, /thing\.ts/);
});

test('coverage: 実行されるコードがあるのに読み込まれないファイルは、型と一緒でも NG', () => {
  const dir = makeRepo({ 'app/src/types/thing.ts': 'export type Thing = { name: string };\nexport const DEFAULT = 1;\n' });
  write(dir, { 'app/coverage/lcov.info': 'SF:/elsewhere/x.ts\nDA:1,1\nend_of_record\n' });
  const r = runScript('diff-coverage.mjs', dir);
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /thing\.ts/);
});

test('coverage: lcov がなければ NG', () => {
  const r = runScript('diff-coverage.mjs', makeRepo(FEATURE));
  assert.equal(r.code, 1, r.out);
});

// ---------- license ----------

test('license: 許可リストと OR / AND の扱い', () => {
  const allow = new Set(['MIT', 'Apache-2.0']);
  assert.equal(isAllowed('MIT', allow), true);
  assert.equal(isAllowed('(MIT OR GPL-2.0)', allow), true);
  assert.equal(isAllowed('GPL-3.0', allow), false);
  assert.equal(isAllowed('(MIT AND GPL-3.0)', allow), false);
  assert.equal(isAllowed('(MIT AND Apache-2.0)', allow), true);
  assert.equal(isAllowed('', allow), false);
  assert.equal(isAllowed('UNKNOWN', allow), false);
});
