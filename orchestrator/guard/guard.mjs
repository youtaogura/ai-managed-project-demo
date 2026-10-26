#!/usr/bin/env node
// Claude Code PreToolUse hook.
// stdin で受け取ったツール呼び出しを検査し、禁止操作なら exit 2 でブロックする。
// exit 2 のとき stderr の内容が Claude に返され、Claude は別の方法を考える。
//
// コンテナ自体がホストとの隔離境界なので、ここで防ぐのは
// 「GitHub やリポジトリ運用を壊す操作」と「自分の指示書・監視の改ざん」。

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// 人間だけが変更してよいパス（リポジトリルートからの相対）。orchestrator/policy.json で管理する
const POLICY_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'policy.json');
const POLICY = JSON.parse(readFileSync(POLICY_FILE, 'utf8'));
export const PROTECTED_PATHS = POLICY.protectedPaths;
// テストの削除を許可するラベル。人間だけが付け外しする
const TEST_REMOVAL_LABEL = POLICY.testRemovalLabel;

const BASH_RULES = [
  { re: /\bsudo\b/, why: 'sudo は使用できません。' },
  { re: /\bgit\s+push\b[^|;&]*(\s--force\b|\s-f\b|\s--force-with-lease\b|\s\+\S)/, why: 'force push は禁止です。新しいコミットを積んでください。' },
  { re: /\bgit\s+push\b[^|;&]*\b(main|master)\b/, why: 'main への直接 push は禁止です。作業ブランチに push してください。' },
  { re: /\bgit\s+push\b[^|;&]*\s--(delete|mirror|all|tags)\b/, why: 'その git push オプションは禁止です。' },
  { re: /\bgit\s+push\b[^|;&]*\s:\S/, why: 'リモートブランチの削除は禁止です。' },
  { re: /\bgit\s+(worktree|filter-branch|filter-repo|replace)\b/, why: 'worktree や履歴書き換えはオーケストレーターの管理範囲です。' },
  { re: /\bgit\s+config\s+--(global|system)\b/, why: 'git のグローバル設定は変更できません。' },
  { re: /\bgit\s+(checkout|switch)\s+(-[bBcC]\s+)?(main|master)\b/, why: 'main ブランチには切り替えないでください。現在の作業ブランチで作業してください。' },
  { re: /\bgh\s+pr\s+(merge|close)\b/, why: 'PR のマージ・クローズはオーケストレーターが行います。' },
  { re: /\bgh\s+(repo|secret|variable|workflow|ruleset|auth|ssh-key|gpg-key|release)\b/, why: 'その gh サブコマンドは使用できません。' },
  { re: /\bgh\s+project\b/, why: 'Project のステータス変更はオーケストレーターが行います。' },
  { re: /\bgh\s+issue\s+(close|delete|transfer|lock|edit\b[^|;&]*--remove-label)/, why: 'その Issue 操作は禁止です。' },
  { re: /\bgh\s+api\b[^|;&]*(-X|--method)\s*(DELETE|PUT|PATCH)/i, why: 'gh api での更新・削除系リクエストは禁止です。' },
  { re: /\bgh\s+api\s+graphql\b[^|;&]*mutation/i, why: 'GraphQL mutation は禁止です。' },
  ...(TEST_REMOVAL_LABEL
    ? [{ re: new RegExp(TEST_REMOVAL_LABEL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), why: `\`${TEST_REMOVAL_LABEL}\` ラベルは人間だけが付け外しします。必要なら PR 本文の判断ログに理由を書いてください。` }]
    : []),
  { re: /\b(eas|eas-cli)\b[^|;&]*\b(submit|credentials|secret|env:create|env:delete|delete)\b/, why: 'その EAS 操作は禁止です。' },
  { re: /\b(curl|wget)\b[^|;&]*\|\s*(sudo\s+)?(ba|z)?sh\b/, why: 'ダウンロードしたスクリプトの直接実行は禁止です。' },
  { re: /\b(printenv|env)\s*($|\||>)/, why: '環境変数の一覧出力は禁止です（トークン漏えい防止）。' },
  { re: /\$\{?(GH_TOKEN|GITHUB_TOKEN|ANTHROPIC_API_KEY|CLAUDE_CODE_OAUTH_TOKEN|EXPO_TOKEN)\b/, why: 'トークンを参照するコマンドは禁止です。' },
  { re: /\bexpo\s+start\b|\bpnpm\s+(start|android|ios|web)\b/, why: '開発サーバーは起動しないでください。検証は pnpm check（lint / typecheck / test）で行います。' },
];

const STAGE_BASH_RULES = {
  // eas build はリリース工程以外では実行させない
  '*': [{ re: /\b(eas|eas-cli)\b[^|;&]*\bbuild\b/, why: 'EAS ビルドはリリース工程でのみ実行されます。' }],
};

// rm の対象に、作業ディレクトリと /tmp 以外の絶対パスやホーム・親ディレクトリが含まれていればブロック
function checkRm(command, cwd) {
  const segments = command.split(/[;&|]+/);
  for (const seg of segments) {
    const tokens = seg.trim().split(/\s+/);
    const i = tokens.findIndex((t) => t === 'rm' || t.endsWith('/rm'));
    if (i === -1) continue;
    for (const t of tokens.slice(i + 1)) {
      if (t.startsWith('-')) continue;
      const target = t.replace(/^["']|["']$/g, '');
      if (/^(~|\$HOME|\$\{HOME\})/.test(target) || target === '/' || target === '/*') {
        return 'ホームディレクトリやルートの削除は禁止です。';
      }
      if (target.split('/').includes('..')) return '親ディレクトリを辿る削除は禁止です。';
      if (target.startsWith('/')) {
        const abs = path.resolve(target);
        const root = cwd ? path.resolve(cwd) : null;
        const inside = abs.startsWith('/tmp/') || (root && abs.startsWith(root + path.sep));
        if (!inside) return `作業ディレクトリ外の削除は禁止です: ${abs}`;
      }
    }
  }
  return null;
}

export function checkBash(command, stage = '', cwd = '') {
  const rm = checkRm(command, cwd);
  if (rm) return rm;
  for (const rule of BASH_RULES) {
    if (rule.re.test(command)) return rule.why;
  }
  if (stage !== 'release') {
    for (const rule of STAGE_BASH_RULES['*']) {
      if (rule.re.test(command)) return rule.why;
    }
  }
  return null;
}

export function checkFilePath(filePath, cwd) {
  if (!filePath) return null;
  const abs = path.resolve(cwd || '/', filePath);
  const root = cwd ? path.resolve(cwd) : null;

  if (abs.startsWith('/tmp/')) return null;
  if (root && !(abs === root || abs.startsWith(root + path.sep))) {
    return `作業ディレクトリ (${root}) の外のファイルは編集できません: ${abs}`;
  }
  const rel = root ? path.relative(root, abs) : abs;
  for (const p of PROTECTED_PATHS) {
    if (p.endsWith('/') ? rel.startsWith(p) : rel === p || rel.startsWith(p + '.')) {
      return `${rel} は人間だけが変更できる保護対象です。必要なら PR 本文の判断ログに提案として書いてください。`;
    }
  }
  return null;
}

const FILE_TOOLS = ['Edit', 'Write', 'MultiEdit', 'NotebookEdit'];

export function evaluate(input, stage = process.env.AGENT_STAGE || '') {
  const tool = input.tool_name;
  const ti = input.tool_input || {};
  if (tool === 'Bash') {
    const command = String(ti.command || '');
    if (stage === 'review' && /\bgit\s+(commit|push|merge|rebase|reset)\b/.test(command)) {
      return 'レビュー工程ではコードを変更できません。指摘はレビューコメントに書いてください。';
    }
    return checkBash(command, stage, input.cwd);
  }
  if (FILE_TOOLS.includes(tool)) {
    const file = ti.file_path || ti.notebook_path;
    if (stage === 'review' && !path.resolve(input.cwd || '/', String(file || '')).startsWith('/tmp/')) {
      return 'レビュー工程ではファイルを編集できません（/tmp 以下のメモ用ファイルのみ可）。';
    }
    return checkFilePath(file, input.cwd);
  }
  return null;
}

// エントリポイント（import されたときは実行しない）
if (import.meta.url === `file://${process.argv[1]}`) {
  let input;
  try {
    input = JSON.parse(readFileSync(0, 'utf8') || '{}');
  } catch {
    process.exit(0); // 解析できない入力はブロックしない（Claude Code 本体の不具合で全停止しないため）
  }
  const reason = evaluate(input);
  if (reason) {
    process.stderr.write(`[guard] ブロックしました: ${reason}\n`);
    process.exit(2);
  }
  process.exit(0);
}
