#!/usr/bin/env node
// テストと検査の改ざん検知: テストを通すためにテストや静的検査を緩める変更を検出する。
// テストの削除・テストケース数の減少は、コードを整理すれば正当に起こるので検査しない
// （改ざんのために削らないことはエージェントへの規約とし、レビューで確認する）。
//   BASE_SHA   比較元のコミット
//   HEAD_REF   PR のブランチ名。エージェントのブランチ（agent/issue-*）では違反をエラー、それ以外は警告にする
import { addedLines, createReport, isAgentBranch, isTestFile, requireEnv } from './lib.mjs';

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

report.finish();
