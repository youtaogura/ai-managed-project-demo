// CI スクリプト共通処理（外部依存なし）
import { execFileSync } from 'node:child_process';
import { appendFileSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const repoRoot = () => sh('git', ['rev-parse', '--show-toplevel']).trim();

export function sh(cmd, args, opts = {}) {
  return execFileSync(cmd, args, { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, ...opts });
}

export function loadPolicy() {
  const file = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'orchestrator', 'policy.json');
  return JSON.parse(readFileSync(file, 'utf8'));
}

export const matchesPath = (file, p) => (p.endsWith('/') ? file.startsWith(p) : file === p || file.startsWith(`${p}.`));

// 保護対象か（protectedExceptions に挙げたファイルは、保護対象のパターンに当たっても除く）
export const isProtectedPath = (file, policy = loadPolicy()) =>
  !(policy.protectedExceptions ?? []).includes(file) && policy.protectedPaths.some((p) => matchesPath(file, p));

// エージェントのブランチかどうか（エージェントのブランチだけルールを強制する）
export function isAgentBranch(ref, policy = loadPolicy()) {
  return Boolean(ref) && ref.startsWith(policy.agentBranchPrefix);
}

export function issueNumberFromBranch(ref, policy = loadPolicy()) {
  const m = String(ref || '').slice(policy.agentBranchPrefix.length).match(/^(\d+)/);
  return m ? Number(m[1]) : null;
}

// base...HEAD で変更されたファイル（リネームは新しいパスで返す）
export function changedFiles(base) {
  const out = sh('git', ['diff', '--name-status', '-M', `${base}...HEAD`]);
  return out
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [status, a, b] = line.split('\t');
      return { status: status[0], path: b ?? a, oldPath: b ? a : null };
    });
}

// base...HEAD で追加された行を { file -> [{ line, text }] } で返す
export function addedLines(base, pathspecs = []) {
  const out = sh('git', ['diff', '-U0', '--no-color', '-M', `${base}...HEAD`, '--', ...pathspecs]);
  const result = new Map();
  let file = null;
  let next = 0;
  for (const raw of out.split('\n')) {
    if (raw.startsWith('+++ ')) {
      file = raw === '+++ /dev/null' ? null : raw.slice(6); // "+++ b/path"
      if (file && !result.has(file)) result.set(file, []);
      continue;
    }
    const hunk = raw.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/);
    if (hunk) {
      next = Number(hunk[1]);
      continue;
    }
    if (!file) continue;
    if (raw.startsWith('+')) {
      result.get(file).push({ line: next, text: raw.slice(1) });
      next++;
    }
  }
  return result;
}

export function fileAt(ref, file) {
  try {
    return sh('git', ['show', `${ref}:${file}`], { stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    return null;
  }
}

export const isTestFile = (f) => /(^|\/)__tests__\/|\.(test|spec)\.[cm]?[jt]sx?$/.test(f);
export const isSourceFile = (f) => /\.[cm]?[jt]sx?$/.test(f);

// 結果の出力（標準出力 + GitHub のジョブサマリ）
export function createReport(title) {
  const errors = [];
  const warnings = [];
  const notes = [];
  return {
    error: (m) => errors.push(m),
    warn: (m) => warnings.push(m),
    note: (m) => notes.push(m),
    get errorCount() {
      return errors.length;
    },
    finish() {
      const lines = [`## ${title}`, ''];
      if (!errors.length) lines.push('✅ OK', '');
      for (const e of errors) lines.push(`- ❌ ${e}`);
      for (const w of warnings) lines.push(`- ⚠️ ${w}`);
      for (const n of notes) lines.push(`- ${n}`);
      const text = lines.join('\n');
      console.log(text);
      if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${text}\n\n`);
      process.exitCode = errors.length ? 1 : 0;
    },
  };
}

export function requireEnv(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`環境変数 ${name} が必要です`);
    process.exit(2);
  }
  return v;
}
