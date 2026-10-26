import path from 'node:path';
import { fileURLToPath } from 'node:url';

const env = process.env;

const int = (v, d) => (v === undefined || v === '' ? d : Number.parseInt(v, 10));
const bool = (v) => ['1', 'true', 'yes'].includes(String(v ?? '').toLowerCase());

// GitHub Project の Status フィールドの選択肢名。
// 日本語名などに変えたい場合は STATUS_NAMES='{"spec":"要件整理・設計"}' のように上書きする。
const DEFAULT_STATUS = {
  backlog: 'Backlog', // 人間が起票・整理する場所。オーケストレーターは触らない
  ready: 'Ready', // 人間が「着手してよい」と判断したら置く
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
  claudeModel: env.CLAUDE_MODEL || '',
  claudeBin: env.CLAUDE_BIN || 'claude',
  dryRun: bool(env.DRY_RUN),
  skipInstall: bool(env.SKIP_INSTALL), // E2E テスト用: worktree での pnpm install を省略

  labels: {
    clarification: 'needs-clarification',
    failed: 'agent-failed',
  },

  // エージェントの PR が触れてはいけないパス（マージ前に検査）
  protectedPaths: ['orchestrator/', 'docker/', '.github/', 'docker-compose.yml', 'CLAUDE.md', '.env'],

  promptsDir: path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'prompts'),
};

export const worktreesDir = () => path.join(config.dataDir, 'worktrees');
export const branchFor = (issue) => `${config.branchPrefix}${issue}`;
export const worktreeFor = (issue) => path.join(worktreesDir(), `issue-${issue}`);
