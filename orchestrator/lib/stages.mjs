import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { buildPrompt, runAgent } from './agent.mjs';
import { branchFor, config, worktreesDir } from './config.mjs';
import * as gh from './github.mjs';
import * as git from './git.mjs';
import { log, run, warn } from './sh.mjs';
import { clearIssueState, getIssueState, updateIssueState } from './state.mjs';

const S = config.status;

export function stageForStatus(status) {
  if (status === S.ready || status === S.spec) return 'spec';
  if (status === S.implement) return 'implement';
  if (status === S.review) return 'review';
  if (status === S.release) return 'release';
  return null;
}

// 着手できるアイテムか（質問待ち・失敗ラベル付きは人間の対応待ちなので触らない）
export function isEligible(item) {
  if (item.issue.state !== 'OPEN') return false;
  if (!stageForStatus(item.status)) return false;
  const blocking = [config.labels.clarification, config.labels.failed];
  return !item.issue.labels.some((l) => blocking.includes(l));
}

// 後工程を優先して、仕掛かり中のものから片付ける
const PRIORITY = { release: 0, review: 1, implement: 2, spec: 3 };
export const byPriority = (a, b) => PRIORITY[stageForStatus(a.status)] - PRIORITY[stageForStatus(b.status)];

const specPath = (issue) => `docs/specs/issue-${issue}.md`;
const footer = (res) => (res?.log ? `\n\n<sub>ログ: \`${path.basename(res.log)}.*\`</sub>` : '');

async function block(item, kind, message, res) {
  const label = kind === 'clarification' ? config.labels.clarification : config.labels.failed;
  const title = kind === 'clarification' ? '確認待ちで停止しました' : '自動処理を停止しました';
  await gh.addLabel(item.issue.number, label);
  await gh.commentIssue(
    item.issue.number,
    `🤖 **オーケストレーター: ${title}**\n\n${message}\n\n` +
      `対応後、\`${label}\` ラベルを外して Status を再開したい列に戻してください。${footer(res)}`,
  );
  await gh.setStatus(item, S.blocked);
}

async function rework(item, reason) {
  const n = item.issue.number;
  const rw = getIssueState(n).rework + 1;
  if (rw > config.maxRework) {
    return block(item, 'failed', `差し戻しが上限（${config.maxRework}回）に達しました。\n\n最後の理由: ${reason}`);
  }
  if (!config.dryRun) updateIssueState(n, { rework: rw });
  log(`#${n}: 実装へ差し戻し (${rw}/${config.maxRework}) - ${reason}`);
  await gh.setStatus(item, S.implement);
}

// エージェントの結果のうち、各工程で共通の扱い
async function handleCommon(item, res) {
  if (res.outcome === 'dry_run') return true;
  if (res.outcome === 'needs_clarification') {
    await block(item, 'clarification', `エージェントからの質問があります。上のコメントを確認してください。\n\n> ${res.summary ?? ''}`, res);
    return true;
  }
  if (res.outcome === 'failed') {
    await block(item, 'failed', `理由: ${res.summary ?? '不明'}`, res);
    return true;
  }
  return false;
}

function baseVars(item, extra = {}) {
  return {
    ISSUE_NUMBER: item.issue.number,
    ISSUE_TITLE: item.issue.title,
    REPO: config.repo,
    BRANCH: branchFor(item.issue.number),
    BASE_BRANCH: config.baseBranch,
    APP_DIR: config.appDir,
    SPEC_PATH: specPath(item.issue.number),
    ...extra,
  };
}

async function prepare(item) {
  const { wt } = await git.prepareWorktree(item.issue.number);
  await git.installDeps(wt);
  return wt;
}

// ---------------- 各工程 ----------------

async function specStage(item) {
  if (item.status === S.ready) await gh.setStatus(item, S.spec);
  const wt = await prepare(item);
  const res = await runAgent({
    stage: 'spec',
    issue: item.issue.number,
    cwd: wt,
    prompt: buildPrompt('spec', baseVars(item)),
  });
  if (await handleCommon(item, res)) return;
  if (res.outcome !== 'done') return block(item, 'failed', `想定外の結果: ${res.outcome}`, res);

  // 事後条件: 仕様書がブランチに push されていること
  await git.fetchOrigin();
  const check = await run('git', ['cat-file', '-e', `origin/${branchFor(item.issue.number)}:${specPath(item.issue.number)}`], {
    cwd: config.repoDir,
    allowFail: true,
  });
  if (!check.ok) return block(item, 'failed', `仕様書 \`${specPath(item.issue.number)}\` が push されていません。`, res);
  await gh.setStatus(item, S.implement);
}

async function implementStage(item) {
  const branch = branchFor(item.issue.number);
  const pr = await gh.findOpenPr(branch);
  const wt = await prepare(item);
  const res = await runAgent({
    stage: 'implement',
    issue: item.issue.number,
    cwd: wt,
    prompt: buildPrompt(
      'implement',
      baseVars(item, {
        PR_NUMBER: pr ? pr.number : 'なし（新規作成すること）',
        REWORK_COUNT: getIssueState(item.issue.number).rework,
      }),
    ),
  });
  if (await handleCommon(item, res)) return;
  if (res.outcome !== 'done') return block(item, 'failed', `想定外の結果: ${res.outcome}`, res);

  const created = await gh.findOpenPr(branch);
  if (!created) return block(item, 'failed', `ブランチ \`${branch}\` の PR が見つかりません。`, res);
  await gh.setStatus(item, S.review);
}

async function reviewStage(item) {
  const pr = await gh.findOpenPr(branchFor(item.issue.number));
  if (!pr) return block(item, 'failed', 'レビュー対象の PR が見つかりません。');
  const wt = await prepare(item);
  const res = await runAgent({
    stage: 'review',
    issue: item.issue.number,
    cwd: wt,
    prompt: buildPrompt('review', baseVars(item, { PR_NUMBER: pr.number })),
  });
  if (await handleCommon(item, res)) return;
  if (res.outcome === 'approve') return gh.setStatus(item, S.release);
  if (res.outcome === 'changes_requested') return rework(item, res.summary ?? 'レビュー指摘');
  return block(item, 'failed', `想定外の結果: ${res.outcome}`, res);
}

// リリースは判断の余地がないので LLM を使わず決定的に処理する
async function releaseStage(item) {
  const n = item.issue.number;
  const branch = branchFor(n);
  const pr = await gh.findOpenPr(branch);
  if (!pr) return block(item, 'failed', 'リリース対象の PR が見つかりません。');

  const touched = (await gh.prFiles(pr.number)).filter((f) =>
    config.protectedPaths.some((p) => (p.endsWith('/') ? f.startsWith(p) : f === p || f.startsWith(`${p}.`))),
  );
  if (touched.length) {
    return block(item, 'failed', `PR #${pr.number} が保護対象のファイルを変更しています:\n\n${touched.map((f) => `- \`${f}\``).join('\n')}`);
  }

  const checks = await gh.prChecksState(pr.number);
  if (checks === 'pending' || checks === 'none') {
    log(`#${n}: PR #${pr.number} の CI 待ち (${checks})`);
    return;
  }
  if (checks === 'fail') {
    await gh.commentPr(pr.number, '🤖 オーケストレーター: CI が失敗したため実装工程に差し戻します。');
    return rework(item, 'CI が失敗');
  }

  await gh.mergePr(pr.number);
  if (!config.dryRun) {
    await git.deleteRemoteBranch(branch);
    await git.removeWorktree(n);
    clearIssueState(n);
  }
  await gh.closeIssue(n);
  log(`#${n}: PR #${pr.number} をマージしました`);

  const buildNote = await easPreviewBuild();
  if (buildNote) await gh.commentIssue(n, `🤖 オーケストレーター: ${buildNote}`);
  await gh.setStatus(item, S.done);
}

// EXPO_TOKEN と EAS の projectId が揃っているときだけ、main の内部配布ビルドを依頼する
async function easPreviewBuild() {
  if (!process.env.EXPO_TOKEN) return null;
  if (config.dryRun) {
    log('[dry-run] eas build --profile preview を実行する予定');
    return null;
  }
  const wt = path.join(worktreesDir(), '_release');
  try {
    await git.fetchOrigin();
    if (!existsSync(path.join(wt, '.git'))) {
      await run('git', ['worktree', 'add', '--detach', wt, `origin/${config.baseBranch}`], { cwd: config.repoDir });
    } else {
      await run('git', ['checkout', '--detach', `origin/${config.baseBranch}`], { cwd: wt });
    }
    const appPath = path.join(wt, config.appDir);
    const appJson = JSON.parse(readFileSync(path.join(appPath, 'app.json'), 'utf8'));
    if (!appJson?.expo?.extra?.eas?.projectId) return 'EAS の projectId が未設定のためビルドはスキップしました（`eas init` が必要）。';
    await git.installDeps(wt);
    const { stdout } = await run(
      'eas',
      ['build', '--platform', 'android', '--profile', 'preview', '--non-interactive', '--no-wait', '--json'],
      { cwd: appPath },
    );
    const builds = JSON.parse(stdout);
    const id = builds?.[0]?.id;
    return id ? `EAS の preview ビルドを開始しました（build id: \`${id}\`）。` : 'EAS ビルドを開始しました。';
  } catch (e) {
    warn('EAS build failed', e.message);
    return `EAS ビルドの開始に失敗しました: ${e.message.slice(0, 500)}`;
  }
}

const HANDLERS = { spec: specStage, implement: implementStage, review: reviewStage, release: releaseStage };

export async function runJob(item, stage = stageForStatus(item.status)) {
  const handler = HANDLERS[stage];
  if (!handler) throw new Error(`unknown stage: ${stage}`);
  log(`#${item.issue.number}: 開始 [${stage}] "${item.issue.title}"`);
  try {
    await handler(item);
  } catch (e) {
    warn(`#${item.issue.number}: ${stage} で例外`, e.message);
    try {
      await block(item, 'failed', `オーケストレーターで例外が発生しました:\n\n\`\`\`\n${e.message.slice(0, 1500)}\n\`\`\``);
    } catch (e2) {
      warn('停止処理にも失敗しました', e2.message);
    }
  }
}
