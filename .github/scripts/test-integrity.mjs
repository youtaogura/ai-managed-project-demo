#!/usr/bin/env node
// テストと検査の改ざん検知: テストを通すためにテストや静的検査を緩める変更を検出する。
//   BASE_SHA   比較元のコミット
//   HEAD_REF   PR のブランチ名。エージェントのブランチ（agent/issue-*）では違反をエラー、それ以外は警告にする
import { addedLines, changedFiles, createReport, fileAt, isAgentBranch, isTestFile, requireEnv } from './lib.mjs';

const base = requireEnv('BASE_SHA');
const enforce = isAgentBranch(process.env.HEAD_REF);
const report = createReport(`テストと検査の改ざん検知${enforce ? '' : '（人間のブランチのため警告のみ）'}`);
const flag = enforce ? report.error : report.warn;

// 1. テストを無効化・限定する記述
const SKIP_RE = /\b(?:it|test|describe)\s*\.\s*(?:skip|only|todo)\b|\b(?:xit|xtest|xdescribe|fit|fdescribe)\s*\(/;
// 2. 静的検査・カバレッジ計測を黙らせるコメント
const SUPPRESS_RE = /eslint-disable|@ts-ignore|@ts-expect-error|@ts-nocheck|istanbul\s+ignore|c8\s+ignore|v8\s+ignore/;

const added = addedLines(base, ['app']);
for (const [file, lines] of added) {
  for (const { line, text } of lines) {
    if (isTestFile(file) && SKIP_RE.test(text)) {
      flag(`${file}:${line} テストを無効化・限定する記述が追加されています: \`${text.trim()}\``);
    }
    if (SUPPRESS_RE.test(text)) {
      flag(`${file}:${line} 検査を抑制するコメントが追加されています: \`${text.trim()}\``);
    }
  }
}

// 3. テストファイルの削除
const files = changedFiles(base).filter((f) => f.path.startsWith('app/') || f.oldPath?.startsWith('app/'));
for (const f of files) {
  if (f.status === 'D' && isTestFile(f.path)) flag(`テストファイルが削除されています: ${f.path}`);
  if (f.status === 'R' && isTestFile(f.oldPath) && !isTestFile(f.path)) {
    flag(`テストファイルがテスト以外のファイルに変更されています: ${f.oldPath} → ${f.path}`);
  }
}

// 4. テストケース数の減少（変更されたテストファイルについて、変更前後の it/test の数を比較）
const CASE_RE = /\b(?:it|test)(?:\.each\s*(?:`[^`]*`|\([^)]*\)))?\s*\(/g;
const count = (src) => (src ? (src.match(CASE_RE) || []).length : 0);
let before = 0;
let after = 0;
for (const f of files) {
  const oldPath = f.oldPath ?? f.path;
  if (isTestFile(oldPath)) before += count(fileAt(base, oldPath));
  if (f.status !== 'D' && isTestFile(f.path)) after += count(fileAt('HEAD', f.path));
}
if (after < before) flag(`テストケース数が減っています（変更されたテストファイルで ${before} → ${after}）`);
else if (before || after) report.note(`変更されたテストファイルのテストケース数: ${before} → ${after}`);

report.finish();
