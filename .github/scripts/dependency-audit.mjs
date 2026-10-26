#!/usr/bin/env node
// 依存関係の脆弱性: base にはなかった high / critical の脆弱性が増えていたら失敗にする。
// 既存の脆弱性（Expo 本体の依存など、エージェントでは直せないもの）は警告として表示する。
//   BASE_SHA   比較元のコミット（未指定なら差分を取らず、報告のみ）
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { createReport, fileAt, repoRoot, sh } from './lib.mjs';

const base = process.env.BASE_SHA;
const appDir = path.join(repoRoot(), 'app');
const SEVERE = ['high', 'critical'];
const report = createReport('依存関係の脆弱性（high / critical）');

function audit(cwd) {
  let out;
  try {
    out = sh('pnpm', ['audit', '--prod', '--json'], { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) {
    out = e.stdout; // 脆弱性があると非 0 で終了する
  }
  const json = JSON.parse(out || '{}');
  if (json.error) throw new Error(`pnpm audit に失敗しました: ${json.error.message ?? JSON.stringify(json.error)}`);
  const found = new Map();
  for (const a of Object.values(json.advisories ?? {})) {
    if (!SEVERE.includes(a.severity)) continue;
    const id = a.github_advisory_id || String(a.id);
    found.set(id, `${a.severity} ${a.module_name}: ${a.title} (${id})`);
  }
  return found;
}

function auditAt(ref) {
  const pkg = fileAt(ref, 'app/package.json');
  const lock = fileAt(ref, 'app/pnpm-lock.yaml');
  if (!pkg || !lock) return new Map();
  const dir = mkdtempSync(path.join(tmpdir(), 'audit-base-'));
  try {
    writeFileSync(path.join(dir, 'package.json'), pkg);
    writeFileSync(path.join(dir, 'pnpm-lock.yaml'), lock);
    return audit(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

try {
  const head = audit(appDir);
  const before = base ? auditAt(base) : head;
  for (const [id, desc] of head) {
    if (before.has(id)) report.warn(`既存: ${desc}`);
    else report.error(`新規: ${desc}`);
  }
  for (const [id, desc] of before) if (!head.has(id)) report.note(`解消: ${desc}`);
  if (!head.size) report.note('high / critical の脆弱性はありません。');
} catch (e) {
  report.error(e.message);
}
report.finish();
