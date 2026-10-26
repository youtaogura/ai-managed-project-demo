import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.GITHUB_REPOSITORY = 'owner/repo';

const { buildPrompt, parseAgentResult } = await import('./agent.mjs');
const { byPriority, isEligible, stageForStatus } = await import('./stages.mjs');

test('AGENT_RESULT を最終行から読み取る', () => {
  const text = '作業しました。\n\nAGENT_RESULT: {"outcome": "done", "summary": "PR #3 を作成"}';
  assert.deepEqual(parseAgentResult(text), { outcome: 'done', summary: 'PR #3 を作成' });
});

test('コードブロック内や複数行でも最後の結果を使う', () => {
  const text = 'AGENT_RESULT: {"outcome":"failed"}\n```\nAGENT_RESULT: {"outcome":"approve","summary":"ok"}\n```';
  assert.equal(parseAgentResult(text).outcome, 'approve');
});

test('結果行がなければ null', () => {
  assert.equal(parseAgentResult('done!'), null);
  assert.equal(parseAgentResult('AGENT_RESULT: {broken'), null);
});

test('Status から工程を決める', () => {
  assert.equal(stageForStatus('Ready'), 'spec');
  assert.equal(stageForStatus('Spec'), 'spec');
  assert.equal(stageForStatus('Implement'), 'implement');
  assert.equal(stageForStatus('Review'), 'review');
  assert.equal(stageForStatus('Release'), 'release');
  assert.equal(stageForStatus('Backlog'), null);
  assert.equal(stageForStatus('Blocked'), null);
});

test('質問待ち・失敗ラベル付きとクローズ済みは対象外', () => {
  const item = (status, labels = [], state = 'OPEN') => ({ status, issue: { number: 1, state, labels } });
  assert.equal(isEligible(item('Ready')), true);
  assert.equal(isEligible(item('Ready', ['needs-clarification'])), false);
  assert.equal(isEligible(item('Implement', ['agent-failed'])), false);
  assert.equal(isEligible(item('Review', [], 'CLOSED')), false);
  assert.equal(isEligible(item('Backlog')), false);
});

test('後工程を優先する', () => {
  const items = ['Ready', 'Release', 'Implement', 'Review'].map((status) => ({ status }));
  assert.deepEqual(items.sort(byPriority).map((i) => i.status), ['Release', 'Review', 'Implement', 'Ready']);
});

test('CI は必須チェックだけで判定する', async () => {
  const { evaluateChecks } = await import('./github.mjs');
  const req = ['lint', 'test'];
  const c = (name, bucket) => ({ name, bucket });
  assert.equal(evaluateChecks([c('lint', 'pass'), c('test', 'pass')], req).state, 'pass');
  assert.equal(evaluateChecks([c('lint', 'pass'), c('test', 'skipping')], req).state, 'pass');
  // 必須でないチェックの失敗は無視する
  assert.equal(evaluateChecks([c('lint', 'pass'), c('test', 'pass'), c('other', 'fail')], req).state, 'pass');
  assert.deepEqual(evaluateChecks([c('lint', 'fail'), c('test', 'pending')], req), { state: 'fail', failed: ['lint'], missing: [] });
  assert.equal(evaluateChecks([c('lint', 'cancel'), c('test', 'pass')], req).state, 'fail');
  assert.equal(evaluateChecks([c('lint', 'pass'), c('test', 'pending')], req).state, 'pending');
  // まだ始まっていないチェックは待つ（チェックが1件もない場合も同じ）
  assert.deepEqual(evaluateChecks([c('lint', 'pass')], req), { state: 'pending', failed: [], missing: ['test'] });
  assert.equal(evaluateChecks([], req).state, 'pending');
  // 同名が複数ある場合は最後（最新）を使う
  assert.equal(evaluateChecks([c('lint', 'fail'), c('lint', 'pass'), c('test', 'pass')], req).state, 'pass');
});

const workflowsDir = new URL('../../.github/workflows/', import.meta.url);
const { existsSync } = await import('node:fs');
// コンテナ内（/opt/orchestrator）には .github が無いので、そこではスキップする
test('必須チェックは policy.json と CI のジョブ名に一致する', { skip: !existsSync(workflowsDir) }, async () => {
  const { readFileSync } = await import('node:fs');
  const { config } = await import('./config.mjs');
  const root = new URL('../../', import.meta.url);
  const workflows = ['ci.yml', 'pr-policy.yml']
    .map((f) => readFileSync(new URL(`.github/workflows/${f}`, root), 'utf8'))
    .join('\n');
  const jobNames = [...workflows.matchAll(/^\s{4}name:\s*(\S+)\s*$/gm)].map((m) => m[1]);
  for (const name of config.requiredChecks) assert.ok(jobNames.includes(name), `CI にジョブ ${name} がありません`);
});

test('イメージ内のオーケストレーターと main の差分を検出する', async () => {
  const { execFileSync } = await import('node:child_process');
  const fs = await import('node:fs');
  const os = await import('node:os');
  const path = await import('node:path');
  const { checkImageFreshness } = await import('./freshness.mjs');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'freshness-'));
  const repo = path.join(tmp, 'repo');
  const image = path.join(tmp, 'image');
  const git = (...a) => execFileSync('git', a, { cwd: repo });
  const files = { 'orchestrator/index.mjs': 'a\n', 'orchestrator/prompts/spec.md': 'b\n', 'orchestrator/test/e2e/run.sh': 'c\n' };
  for (const [f, c] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(repo, f)), { recursive: true });
    fs.writeFileSync(path.join(repo, f), c);
  }
  git('init', '-q', '-b', 'main');
  git('-c', 'user.name=t', '-c', 'user.email=t@e', 'commit', '-qm', 'x', '--allow-empty');
  git('add', '-A');
  git('-c', 'user.name=t', '-c', 'user.email=t@e', 'commit', '-qm', 'y');
  // イメージ側: index.mjs は同じ、spec.md は古い内容、test/ は無い
  fs.mkdirSync(path.join(image, 'prompts'), { recursive: true });
  fs.writeFileSync(path.join(image, 'index.mjs'), 'a\n');
  fs.writeFileSync(path.join(image, 'prompts/spec.md'), 'old\n');
  try {
    assert.deepEqual(await checkImageFreshness({ ref: 'main', repoDir: repo, dir: image }), { checked: true, stale: ['prompts/spec.md'] });
    fs.writeFileSync(path.join(image, 'prompts/spec.md'), 'b\n');
    assert.deepEqual(await checkImageFreshness({ ref: 'main', repoDir: repo, dir: image }), { checked: true, stale: [] });
    fs.rmSync(path.join(image, 'index.mjs'));
    assert.deepEqual((await checkImageFreshness({ ref: 'main', repoDir: repo, dir: image })).stale, ['index.mjs']);
    assert.equal((await checkImageFreshness({ ref: 'nope', repoDir: repo, dir: image })).checked, false);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('プロンプトの変数を埋め込む', () => {
  const p = buildPrompt('implement', {
    REPO: 'owner/repo',
    ISSUE_NUMBER: 7,
    ISSUE_TITLE: 'ToDo 追加',
    BRANCH: 'agent/issue-7',
    BASE_BRANCH: 'main',
    APP_DIR: 'app',
    SPEC_PATH: 'docs/specs/issue-7.md',
    PR_NUMBER: 'なし',
    REWORK_COUNT: 0,
    BASE_SYNC: 'なし',
  });
  assert.match(p, /Issue: #7「ToDo 追加」/);
  assert.match(p, /docs\/specs\/issue-7\.md/);
  assert.match(p, /AGENT_RESULT/);
  assert.doesNotMatch(p, /\{\{\w+\}\}/);
});

test('作業ブランチと base の関係（最新 / 遅れ / コンフリクト）を判定する', async () => {
  const { execFileSync } = await import('node:child_process');
  const fs = await import('node:fs');
  const os = await import('node:os');
  const path = await import('node:path');
  const { config } = await import('./config.mjs');
  const { baseSyncState } = await import('./git.mjs');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'base-sync-'));
  const seed = path.join(tmp, 'seed');
  const repo = path.join(tmp, 'repo');
  fs.mkdirSync(seed);
  const git = (cwd, ...a) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@e', ...a], { cwd, stdio: 'pipe' });
  const commit = (file, content, msg) => {
    fs.writeFileSync(path.join(seed, file), content);
    git(seed, 'add', '-A');
    git(seed, 'commit', '-qm', msg);
  };
  const saved = config.repoDir;
  try {
    git(seed, 'init', '-q', '-b', 'main');
    commit('a.txt', 'a\n', 'init');
    git(seed, 'checkout', '-q', '-b', 'agent/issue-1');
    commit('b.txt', 'mine\n', 'feat: #1');
    git(seed, 'checkout', '-q', 'main');
    git(tmp, 'clone', '-q', seed, repo);
    config.repoDir = repo;
    const state = async () => {
      git(repo, 'fetch', '-q', 'origin');
      return baseSyncState(1);
    };

    assert.deepEqual(await state(), { state: 'up_to_date', files: [] });
    assert.deepEqual(await baseSyncState(2), { state: 'up_to_date', files: [] }); // まだ push されていない
    commit('c.txt', 'c\n', '別の Issue (#2)');
    assert.deepEqual(await state(), { state: 'behind', files: [] });
    commit('b.txt', 'theirs\n', '同じファイルを追加 (#3)');
    assert.deepEqual(await state(), { state: 'conflict', files: ['b.txt'] });
  } finally {
    config.repoDir = saved;
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
