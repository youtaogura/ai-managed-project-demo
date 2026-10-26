import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const env = process.env;
const here = path.dirname(fileURLToPath(import.meta.url));
// ガード hook・CI と共通のポリシー
export const policy = JSON.parse(readFileSync(path.join(here, '..', 'policy.json'), 'utf8'));
const list = (v) => (v ? v.split(',').map((s) => s.trim()).filter(Boolean) : null);

const int = (v, d) => (v === undefined || v === '' ? d : Number.parseInt(v, 10));
const bool = (v) => ['1', 'true', 'yes'].includes(String(v ?? '').toLowerCase());

// GitHub Project の Status フィールドの選択肢名。
// 日本語名などに変えたい場合は STATUS_NAMES='{"spec":"要件整理・設計"}' のように上書きする。
const DEFAULT_STATUS = {
  backlog: 'Backlog', // 人間が起票・整理する場所。オーケストレーターは触らない
  ready: 'Ready', // 人間が「内容 OK」と判断したら置く。前提の Issue（blocked by）が終わるまでは着手しない
  spec: 'Spec', // 要件整理・設計中
  implement: 'Implement', // 実装・テスト中
  review: 'Review', // レビュー中（別セッション）
  release: 'Release', // マージとビルド待ち
  done: 'Done',
  blocked: 'Blocked', // 要確認（質問待ち・失敗）。人間が対応して元の列に戻す
};

let statusOverride = {};
try {
  statusOverride = env.STATUS_NAMES ? JSON.parse(env.STATUS_NAMES) : {};
} catch {
  throw new Error('STATUS_NAMES は JSON で指定してください');
}

const [repoOwner, repoName] = (env.GITHUB_REPOSITORY || '/').split('/');

export const config = {
  repo: env.GITHUB_REPOSITORY || '',
  repoOwner,
  repoName,
  projectOwner: env.PROJECT_OWNER || repoOwner,
  projectOwnerType: (env.PROJECT_OWNER_TYPE || 'user').toLowerCase(), // user | organization
  projectNumber: int(env.PROJECT_NUMBER, 0),
  statusField: env.STATUS_FIELD || 'Status',
  status: { ...DEFAULT_STATUS, ...statusOverride },

  baseBranch: env.BASE_BRANCH || 'main',
  branchPrefix: env.BRANCH_PREFIX || 'agent/issue-',
  repoDir: env.REPO_DIR || '/workspace/repo',
  dataDir: env.DATA_DIR || '/data',
  logDir: env.LOG_DIR || '/logs',
  appDir: env.APP_DIR || 'app', // リポジトリ内の React Native アプリの場所

  pollIntervalSec: int(env.POLL_INTERVAL_SEC, 60),
  maxConcurrency: int(env.MAX_CONCURRENCY, 2),
  maxTurns: int(env.MAX_TURNS, 80),
  maxBudgetUsd: env.MAX_BUDGET_USD || '',
  jobTimeoutMin: int(env.JOB_TIMEOUT_MIN, 45),
  maxRework: int(env.MAX_REWORK, 2),
  // base とのコンフリクトによる差し戻しの上限（レビュー・CI の差し戻しとは別に数える）
  maxConflictResolve: int(env.MAX_CONFLICT_RESOLVE, 3),
  // Release でマージ前に成功を確認する CI のジョブ名（.github/workflows のジョブ name と一致させる）
  requiredChecks: list(env.REQUIRED_CHECKS) ?? policy.requiredChecks,
  // 必須チェックの結果が出ないまま、この時間が過ぎたら Blocked にする
  ciTimeoutMin: int(env.CI_TIMEOUT_MIN, 30),
  claudeModel: env.CLAUDE_MODEL || '',
  claudeBin: env.CLAUDE_BIN || 'claude',
  dryRun: bool(env.DRY_RUN),
  skipInstall: bool(env.SKIP_INSTALL), // E2E テスト用: worktree での pnpm install を省略

  labels: {
    clarification: 'needs-clarification',
    failed: 'agent-failed',
  },

  // エージェントの PR が触れてはいけないパス（マージ前に検査）
  protectedPaths: policy.protectedPaths,
  protectedExceptions: policy.protectedExceptions ?? [],

  promptsDir: path.join(here, '..', 'prompts'),
};

export const worktreesDir = () => path.join(config.dataDir, 'worktrees');
export const branchFor = (issue) => `${config.branchPrefix}${issue}`;
export const worktreeFor = (issue) => path.join(worktreesDir(), `issue-${issue}`);
