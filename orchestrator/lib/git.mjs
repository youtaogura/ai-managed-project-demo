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

// origin 上の作業ブランチと base の関係を返す（事前に fetch しておくこと）
// { state: 'up_to_date' | 'behind' | 'conflict', files: コンフリクトするファイル }
export async function baseSyncState(issue) {
  const base = `origin/${config.baseBranch}`;
  const head = `origin/${branchFor(issue)}`;
  const exists = await git(['rev-parse', '--verify', '--quiet', head], config.repoDir, { allowFail: true });
  if (!exists.ok) return { state: 'up_to_date', files: [] }; // まだ push されていない（次の push は最新の base から）
  const ancestor = await git(['merge-base', '--is-ancestor', base, head], config.repoDir, { allowFail: true });
  if (ancestor.ok) return { state: 'up_to_date', files: [] };
  // 作業ツリーを触らずにマージを試す。終了コード 1 がコンフリクト、それ以外の失敗はエラー
  const tree = await git(['merge-tree', '--write-tree', '--name-only', '--no-messages', head, base], config.repoDir, {
    allowFail: true,
  });
  if (tree.ok) return { state: 'behind', files: [] };
  if (tree.code !== 1) throw new Error(`git merge-tree failed: ${tree.stderr.trim()}`);
  // 1行目はマージ結果のツリー、以降がコンフリクトしたファイル
  return { state: 'conflict', files: tree.stdout.trim().split('\n').slice(1).filter(Boolean) };
}

// コンフリクトしないことを確認済みの base を作業ブランチに取り込んで push する（force push はしない）
export async function mergeBaseAndPush(issue) {
  const { branch, wt } = await prepareWorktree(issue);
  const base = `origin/${config.baseBranch}`;
  await git(['merge', '--no-edit', '-m', `chore: ${config.baseBranch} を取り込む`, base], wt);
  await git(['push', 'origin', `HEAD:refs/heads/${branch}`], wt);
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
