import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { config } from './config.mjs';
import { log } from './sh.mjs';

export function buildPrompt(stage, vars) {
  const read = (name) => readFileSync(path.join(config.promptsDir, name), 'utf8');
  const text = `${read('_common.md')}\n\n---\n\n${read(`${stage}.md`)}`;
  return text.replace(/\{\{(\w+)\}\}/g, (m, key) => (key in vars ? String(vars[key]) : m));
}

// エージェントの最終メッセージ末尾の `AGENT_RESULT: {...}` を取り出す
export function parseAgentResult(text) {
  const lines = String(text || '').trim().split('\n').reverse();
  for (const line of lines) {
    const m = line.match(/AGENT_RESULT:\s*(\{.*\})\s*`*\s*$/);
    if (!m) continue;
    try {
      const obj = JSON.parse(m[1]);
      if (typeof obj.outcome === 'string') return obj;
    } catch {
      // 壊れた JSON は無視して次の行を探す
    }
  }
  return null;
}

// claude -p をヘッドレスで実行し、{ outcome, summary, raw } を返す
export async function runAgent({ stage, issue, cwd, prompt }) {
  mkdirSync(config.logDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const base = path.join(config.logDir, `${stamp}_issue-${issue}_${stage}`);
  writeFileSync(`${base}.prompt.md`, prompt);

  if (config.dryRun) {
    log(`[dry-run] #${issue}: claude -p (${stage}) を ${cwd} で実行する予定。プロンプト: ${base}.prompt.md`);
    return { outcome: 'dry_run', summary: 'dry-run', raw: null };
  }

  const args = [
    '-p',
    prompt,
    '--output-format',
    'json',
    '--max-turns',
    String(config.maxTurns),
    '--dangerously-skip-permissions', // コンテナ内 + ガード hook 前提
    '--disallowedTools',
    'AskUserQuestion',
  ];
  if (config.claudeModel) args.push('--model', config.claudeModel);
  if (config.maxBudgetUsd) args.push('--max-budget-usd', config.maxBudgetUsd);

  log(`#${issue}: エージェント起動 (${stage})`);
  const started = Date.now();
  const { code, stdout, stderr, timedOut } = await spawnWithTimeout(config.claudeBin, args, {
    cwd,
    env: { ...process.env, AGENT_STAGE: stage, AGENT_ISSUE: String(issue) },
    timeoutMs: config.jobTimeoutMin * 60_000,
  });
  writeFileSync(`${base}.json`, stdout);
  if (stderr) writeFileSync(`${base}.stderr.log`, stderr);

  let raw = null;
  try {
    raw = JSON.parse(stdout);
  } catch {
    // 出力が JSON でない（起動失敗など）
  }
  const minutes = ((Date.now() - started) / 60_000).toFixed(1);
  const cost = raw?.total_cost_usd != null ? ` / $${raw.total_cost_usd.toFixed(2)}` : '';
  log(`#${issue}: エージェント終了 (${stage}) exit=${code} ${minutes}min${cost} turns=${raw?.num_turns ?? '?'}`);

  if (timedOut) return { outcome: 'failed', summary: `タイムアウト（${config.jobTimeoutMin}分）`, raw, log: base };
  if (!raw) return { outcome: 'failed', summary: `claude の出力を解析できませんでした (exit=${code})`, raw, log: base };
  if (raw.is_error || raw.subtype !== 'success') {
    return { outcome: 'failed', summary: `claude がエラー終了: ${raw.subtype}`, raw, log: base };
  }
  const result = parseAgentResult(raw.result);
  if (!result) return { outcome: 'failed', summary: 'AGENT_RESULT 行がありませんでした', raw, log: base };
  return { ...result, raw, log: base };
}

function spawnWithTimeout(cmd, args, { cwd, env, timeoutMs }) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { cwd, env, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', (d) => (stderr += d));
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
      setTimeout(() => child.kill('SIGKILL'), 10_000).unref();
    }, timeoutMs);
    child.on('error', (err) => {
      clearTimeout(timer);
      resolve({ code: -1, stdout, stderr: `${stderr}\n${err.message}`, timedOut });
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr, timedOut });
    });
  });
}
