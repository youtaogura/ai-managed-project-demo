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
  });
  assert.match(p, /Issue: #7「ToDo 追加」/);
  assert.match(p, /docs\/specs\/issue-7\.md/);
  assert.match(p, /AGENT_RESULT/);
  assert.doesNotMatch(p, /\{\{\w+\}\}/);
});
