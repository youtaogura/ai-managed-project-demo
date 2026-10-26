#!/usr/bin/env node
// ライセンス: 本番依存のライセンスが許可リスト（orchestrator/policy.json）に含まれるかを検査する。
// "(MIT OR GPL-2.0)" のような選択可能なライセンスは、いずれかが許可されていれば OK。
import path from 'node:path';

import { createReport, loadPolicy, repoRoot, sh } from './lib.mjs';

const allowed = new Set(loadPolicy().allowedLicenses);
const report = createReport('依存関係のライセンス');

export function isAllowed(expr, allow = allowed) {
  const cleaned = String(expr || '').replace(/[()]/g, ' ').trim();
  if (!cleaned) return false;
  // AND を含む場合はすべて許可されている必要がある
  return cleaned.split(/\s+OR\s+/i).some((alt) => alt.split(/\s+AND\s+/i).every((l) => allow.has(l.trim())));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const out = sh('pnpm', ['licenses', 'list', '--prod', '--json'], { cwd: path.join(repoRoot(), 'app') });
  const byLicense = JSON.parse(out);
  let total = 0;
  for (const [license, pkgs] of Object.entries(byLicense)) {
    total += pkgs.length;
    if (!isAllowed(license)) {
      for (const p of pkgs) report.error(`${p.name}@${p.versions.join(',')}: ${license}（許可リストにありません）`);
    }
  }
  report.note(`本番依存 ${total} パッケージ / ライセンス種別: ${Object.keys(byLicense).join(', ')}`);
  report.finish();
}
