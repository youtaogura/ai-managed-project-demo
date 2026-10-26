import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';

import { branchFor, config, worktreeFor, worktreesDir } from './config.mjs';
import { log, run } from './sh.mjs';

const git = (args, cwd = config.repoDir, opts = {}) => run('git', args, { cwd, ...opts });

// worktree の追加・削除は同じリポジトリに対して並行に走ると壊れるので直列化する
let lock = Promise.resolve();
function serialized(fn) {
  const next = lock.then(fn, fn);
  lock = next.catch(() => {});
  return next;
}

export async function fetchOrigin() {
  await git(['fetch', 'origin', '--prune']);
}

export async function remoteBranchExists(branch) {
  const { stdout } = await git(['ls-remote', '--heads', 'origin', branch]);
  return stdout.trim().length > 0;
}

// Issue 用の worktree を用意し、リモートの最新状態に揃える
export function prepareWorktree(issue) {
  return serialized(async () => {
    const branch = branchFor(issue);
    const wt = worktreeFor(issue);
    mkdirSync(worktreesDir(), { recursive: true });

    await fetchOrigin();
    const hasRemote = await remoteBranchExists(branch);
    const start = hasRemote ? `origin/${branch}` : `origin/${config.baseBranch}`;

    if (!existsSync(path.join(wt, '.git'))) {
      await git(['worktree', 'prune']);
      await git(['worktree', 'add', '-B', branch, wt, start]);
      log(`#${issue}: worktree を作成しました (${branch} <- ${start})`);
    } else if (hasRemote) {
      // 前回の中断などで残った未 push の変更は捨てて、リモートに揃える
      await git(['reset', '--hard', start], wt);
      await git(['clean', '-fd'], wt); // .gitignore 対象（node_modules）は残す
    }
    if (!hasRemote) {
      // まだ push されていないブランチは、常に最新の main から始める
      await git(['reset', '--hard', start], wt);
    }
    return { branch, wt };
  });
}

export async function installDeps(wt) {
  const appPath = path.join(wt, config.appDir);
  if (config.skipInstall || !existsSync(path.join(appPath, 'package.json'))) return;
  const frozen = existsSync(path.join(appPath, 'pnpm-lock.yaml')) ? ['--frozen-lockfile'] : [];
  log(`pnpm install (${appPath})`);
  await run('pnpm', ['install', ...frozen], { cwd: appPath });
}

export function removeWorktree(issue) {
  return serialized(async () => {
    const wt = worktreeFor(issue);
    if (existsSync(wt)) await git(['worktree', 'remove', '--force', wt], config.repoDir, { allowFail: true });
    await git(['worktree', 'prune'], config.repoDir, { allowFail: true });
    await git(['branch', '-D', branchFor(issue)], config.repoDir, { allowFail: true });
  });
}

export async function deleteRemoteBranch(branch) {
  await git(['push', 'origin', '--delete', branch], config.repoDir, { allowFail: true });
}

export async function originUrl() {
  const { stdout } = await git(['remote', 'get-url', 'origin'], config.repoDir, { allowFail: true });
  return stdout.trim();
}
