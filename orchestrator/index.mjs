#!/usr/bin/env node
// 使い方:
//   node index.mjs doctor                     設定と接続の確認（何も変更しない）
//   node index.mjs status                     Project のアイテムと次に実行される工程を表示
//   node index.mjs run --issue 3 [--stage s]  指定 Issue の工程を1回だけ実行
//   node index.mjs once                       1回だけポーリングして、着手したジョブの完了を待つ
//   node index.mjs loop                       常駐してポーリングし続ける（既定）
// 環境変数 DRY_RUN=1 で、書き込み系とエージェント起動を行わずに計画だけ表示する。

import { existsSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';

import { config } from './lib/config.mjs';
import { checkImageFreshness, describeStale } from './lib/freshness.mjs';
import * as gh from './lib/github.mjs';
import * as git from './lib/git.mjs';
import { log, run, warn } from './lib/sh.mjs';
import { byPriority, isEligible, runJob, stageForStatus } from './lib/stages.mjs';

const running = new Map(); // issue number -> Promise

async function pollOnce() {
  // Project の設定（Status の選択肢など）の変更に追従するため、ポーリングごとに取り直す
  await gh.getProject({ refresh: true });
  const items = (await gh.listItems()).filter(isEligible).sort(byPriority);
  for (const item of items) {
    if (running.size >= config.maxConcurrency) break;
    const n = item.issue.number;
    if (running.has(n)) continue;
    const job = runJob(item).finally(() => running.delete(n));
    running.set(n, job);
  }
  return items.length;
}

async function loop() {
  log(`オーケストレーター起動: ${config.repo} / Project #${config.projectNumber} / 並列 ${config.maxConcurrency}${config.dryRun ? ' / DRY_RUN' : ''}`);
  await gh.ensureLabels();
  await warnIfStale();
  let stopping = false;
  const stop = () => {
    if (stopping) process.exit(1);
    stopping = true;
    log(`停止要求を受けました。実行中のジョブ（${running.size}件）の終了を待ちます。もう一度で強制終了します。`);
  };
  process.on('SIGTERM', stop);
  process.on('SIGINT', stop);

  while (!stopping) {
    try {
      await pollOnce();
    } catch (e) {
      warn('ポーリングに失敗しました', e.message);
    }
    for (let i = 0; i < config.pollIntervalSec && !stopping; i++) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  await Promise.allSettled(running.values());
  log('停止しました');
}

async function warnIfStale() {
  try {
    await git.fetchOrigin();
    const { checked, stale } = await checkImageFreshness();
    if (checked && stale.length) warn(describeStale(stale));
  } catch (e) {
    warn('イメージの鮮度を確認できませんでした', e.message.split('\n')[0]);
  }
}

async function once() {
  await gh.ensureLabels();
  await warnIfStale();
  const count = await pollOnce();
  log(`着手可能 ${count} 件 / 実行 ${running.size} 件`);
  await Promise.allSettled(running.values());
}

async function runSingle(issueNumber, stage) {
  const items = await gh.listItems();
  const item = items.find((i) => i.issue.number === issueNumber);
  if (!item) throw new Error(`#${issueNumber} は Project 上に見つかりません`);
  const s = stage || stageForStatus(item.status);
  if (!s) throw new Error(`#${issueNumber} の Status "${item.status}" には対応する工程がありません（--stage で指定できます）`);
  await runJob(item, s);
}

async function status() {
  const meta = await gh.getProject();
  const items = await gh.listItems();
  console.log(`Project: ${meta.title}`);
  for (const name of Object.values(config.status)) {
    const inCol = items.filter((i) => i.status === name);
    console.log(`\n[${name}] ${inCol.length}件`);
    for (const i of inCol) {
      const stage = isEligible(i) ? `→ 次の工程: ${stageForStatus(i.status)}` : '';
      const labels = i.issue.labels.length ? ` (${i.issue.labels.join(', ')})` : '';
      console.log(`  #${i.issue.number} ${i.issue.title}${labels} ${stage}`);
    }
  }
  const orphan = items.filter((i) => !Object.values(config.status).includes(i.status));
  if (orphan.length) console.log(`\n[Status 未設定/対象外] ${orphan.map((i) => `#${i.issue.number}`).join(' ')}`);
}

async function doctor() {
  let ok = true;
  const pass = (m) => console.log(`  ✔ ${m}`);
  const fail = (m) => {
    ok = false;
    console.log(`  ✘ ${m}`);
  };
  const note = (m) => console.log(`  - ${m}`);

  console.log('環境変数');
  for (const k of ['GITHUB_REPOSITORY', 'PROJECT_NUMBER', 'GH_TOKEN']) (process.env[k] ? pass : fail)(k);
  if (process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_CODE_OAUTH_TOKEN) pass('ANTHROPIC_API_KEY / CLAUDE_CODE_OAUTH_TOKEN');
  else fail('ANTHROPIC_API_KEY または CLAUDE_CODE_OAUTH_TOKEN');
  note(process.env.EXPO_TOKEN ? 'EXPO_TOKEN あり（リリース時に EAS ビルド）' : 'EXPO_TOKEN なし（リリース時の EAS ビルドはスキップ）');
  note(`DRY_RUN=${config.dryRun ? 'on' : 'off'}`);

  console.log('\nCLI');
  for (const [cmd, args] of [['claude', ['--version']], ['gh', ['--version']], ['git', ['--version']], ['pnpm', ['--version']], ['eas', ['--version']]]) {
    const r = await run(cmd, args, { allowFail: true });
    (r.ok ? pass : fail)(`${cmd} ${r.stdout.split('\n')[0]}`);
  }
  (existsSync('/etc/claude-code/managed-settings.json') ? pass : fail)('Claude Code 管理設定（ガード hook）');

  console.log('\nGitHub');
  const auth = await gh.authStatus();
  (auth.ok ? pass : fail)('gh 認証');
  try {
    const meta = await gh.getProject();
    pass(`Project: ${meta.title}`);
    const missing = Object.values(config.status).filter((s) => !meta.options[s]);
    if (missing.length) fail(`Status に不足している選択肢: ${missing.join(', ')}`);
    else pass(`Status の選択肢: ${Object.values(config.status).join(' / ')}`);
  } catch (e) {
    fail(`Project を取得できません: ${e.message.split('\n')[0]}`);
  }

  console.log('\nリポジトリ（エージェント専用クローン）');
  if (!existsSync(path.join(config.repoDir, '.git'))) {
    fail(`${config.repoDir} が git リポジトリではありません`);
  } else {
    const url = await git.originUrl();
    (url.toLowerCase().includes(config.repo.toLowerCase()) ? pass : fail)(`origin: ${url}`);
    // insteadOf による読み替え後の、実際に使われる URL
    const effective = (await run('git', ['ls-remote', '--get-url', 'origin'], { cwd: config.repoDir, allowFail: true })).stdout.trim();
    if (/^(git@|ssh:\/\/)/.test(effective)) {
      fail(`origin が SSH のままです（${effective}）。コンテナには SSH がないため、https の URL にしてください`);
    } else if (effective !== url) {
      note(`SSH の URL を https に読み替えて使います: ${effective}`);
    }
    try {
      await git.fetchOrigin();
      (await git.remoteBranchExists(config.baseBranch) ? pass : fail)(`origin/${config.baseBranch}`);
      const push = await run('git', ['push', '--dry-run', 'origin', `HEAD:refs/heads/${config.branchPrefix}doctor-check`], {
        cwd: config.repoDir,
        allowFail: true,
      });
      (push.ok ? pass : fail)(`push 権限${push.ok ? '' : `: ${push.stderr.trim().split('\n').pop()}`}`);
      const { checked, stale } = await checkImageFreshness();
      if (!checked) note('イメージの鮮度を確認できませんでした（origin/main に orchestrator/ がない）');
      else if (stale.length) fail(describeStale(stale));
      else pass(`イメージ内のオーケストレーターは ${config.baseBranch} と一致`);
    } catch (e) {
      fail(`fetch できません: ${e.message.split('\n')[0]}`);
    }
  }

  console.log(ok ? '\nOK: 起動できます' : '\nNG: 上の ✘ を解消してください');
  process.exitCode = ok ? 0 : 1;
}

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: { issue: { type: 'string' }, stage: { type: 'string' } },
});
const command = positionals[0] || 'loop';

const commands = {
  doctor,
  status,
  once,
  loop,
  run: () => {
    if (!values.issue) throw new Error('--issue を指定してください');
    return runSingle(Number(values.issue), values.stage);
  },
};

if (!commands[command]) {
  console.error(`unknown command: ${command} (doctor | status | run | once | loop)`);
  process.exit(2);
}

commands[command]().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
