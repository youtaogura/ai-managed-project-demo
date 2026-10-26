#!/usr/bin/env node
// 差分カバレッジ: PR で追加・変更された app/src のコード行のうち、テストで実行された行の割合を検査する。
//   BASE_SHA        比較元のコミット（PR の base）
//   LCOV_FILE       Jest が出力した lcov（既定: app/coverage/lcov.info）
//   DIFF_COVERAGE_MIN  最低割合（既定: policy.json の coverage.diffMinPercent）
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { addedLines, createReport, isTestFile, loadPolicy, repoRoot, requireEnv } from './lib.mjs';

const policy = loadPolicy();
const base = requireEnv('BASE_SHA');
const root = repoRoot();
const lcovFile = path.resolve(root, process.env.LCOV_FILE || 'app/coverage/lcov.info');
const min = Number(process.env.DIFF_COVERAGE_MIN || policy.coverage.diffMinPercent);
const report = createReport(`差分カバレッジ（基準 ${min}%）`);

// lcov を { repo 相対パス -> Map(line -> hits) } に変換
function parseLcov(text) {
  const files = new Map();
  let current = null;
  for (const line of text.split('\n')) {
    if (line.startsWith('SF:')) {
      // Jest は絶対パスを出力する。相対パスの場合は app/（Jest の rootDir）からの相対とみなす
      const raw = line.slice(3);
      const sf = path.isAbsolute(raw) ? raw : path.resolve(root, 'app', raw);
      current = new Map();
      files.set(path.relative(root, sf), current);
    } else if (line.startsWith('DA:') && current) {
      const [ln, hits] = line.slice(3).split(',');
      current.set(Number(ln), Number(hits));
    } else if (line === 'end_of_record') {
      current = null;
    }
  }
  return files;
}

if (!existsSync(lcovFile)) {
  report.error(`カバレッジファイルがありません: ${path.relative(root, lcovFile)}（jest --coverage が実行されていない可能性）`);
  report.finish();
} else {
  const coverage = parseLcov(readFileSync(lcovFile, 'utf8'));
  const changed = addedLines(base, ['app/src']);
  let coverable = 0;
  let covered = 0;
  const uncovered = [];

  for (const [file, lines] of changed) {
    if (isTestFile(file) || !/\.[jt]sx?$/.test(file)) continue;
    const hits = coverage.get(file);
    if (!hits) {
      // 計測対象に含まれていない（テストから一度も読み込まれていない）新規ファイル
      if (lines.some((l) => l.text.trim())) uncovered.push(`${file}（どのテストからも読み込まれていません）`);
      coverable += lines.filter((l) => l.text.trim()).length;
      continue;
    }
    const missing = [];
    for (const { line } of lines) {
      if (!hits.has(line)) continue; // 実行対象でない行（型定義・コメントなど）
      coverable++;
      if (hits.get(line) > 0) covered++;
      else missing.push(line);
    }
    if (missing.length) uncovered.push(`${file}: ${compress(missing)}`);
  }

  if (coverable === 0) {
    report.note('計測対象の変更行はありません。');
  } else {
    const pct = (covered / coverable) * 100;
    const summary = `変更行 ${coverable} 行中 ${covered} 行がテストで実行されました（${pct.toFixed(1)}%）`;
    if (pct + 1e-9 < min) report.error(`${summary}。基準 ${min}% を下回っています。`);
    else report.note(summary);
    for (const u of uncovered) report.note(`未実行: ${u}`);
  }
  report.finish();
}

function compress(nums) {
  const out = [];
  let start = nums[0];
  let prev = nums[0];
  for (const n of [...nums.slice(1), Infinity]) {
    if (n === prev + 1) {
      prev = n;
      continue;
    }
    out.push(start === prev ? `${start}` : `${start}-${prev}`);
    start = prev = n;
  }
  return `L${out.join(', L')}`;
}
