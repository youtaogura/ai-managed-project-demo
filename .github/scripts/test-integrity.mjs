#!/usr/bin/env node
// テストと検査の改ざん検知: テストを通すためにテストや静的検査を緩める変更を検出する。
//   BASE_SHA   比較元のコミット
//   HEAD_REF   PR のブランチ名。エージェントのブランチ（agent/issue-*）では違反をエラー、それ以外は警告にする
//   PR_LABELS  PR のラベル名の JSON 配列。policy.json の testRemovalLabel があれば、テストの削除・減少を許可する
import { addedLines, changedFiles, createReport, fileAt, isAgentBranch, isTestFile, loadPolicy, requireEnv } from './lib.mjs';

const base = requireEnv('BASE_SHA');
const enforce = isAgentBranch(process.env.HEAD_REF);
const report = createReport(`テストと検査の改ざん検知${enforce ? '' : '（人間のブランチのため警告のみ）'}`);
const flag = enforce ? report.error : report.warn;

// 機能を外すなどで、人間がテストの削除・減少を認めた PR（ラベルは人間だけが付ける）
const removalLabel = loadPolicy().testRemovalLabel;
const labels = (() => {
  try {
    const v = JSON.parse(process.env.PR_LABELS || '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
})();
const removalApproved = Boolean(removalLabel) && labels.includes(removalLabel);
const flagRemoval = (msg) => (removalApproved ? report.note(`${msg}（\`${removalLabel}\` ラベルにより許可）`) : flag(msg));

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
//    機能をまるごと外すときは、テスト対象のソースも同じ PR で削除される。その場合だけ削除を認める
//    （`dir/__tests__/Name.test.tsx` の対象は `dir/Name.<拡張子>` か `dir/Name/index.<拡張子>`）
const files = changedFiles(base).filter((f) => f.path.startsWith('app/') || f.oldPath?.startsWith('app/'));
const deleted = new Set(files.filter((f) => f.status === 'D').map((f) => f.path));
const SOURCE_EXTS = ['ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs'];
function testTargets(testPath) {
  const m = testPath.match(/^(.*?)(?:__tests__\/)?([^/]+?)\.(?:test|spec)\.[cm]?[jt]sx?$/);
  if (!m) return [];
  const [, dir, name] = m;
  return SOURCE_EXTS.flatMap((ext) => [`${dir}${name}.${ext}`, `${dir}${name}/index.${ext}`]);
}
const removedWithTarget = (testPath) => testTargets(testPath).find((t) => deleted.has(t));
const removedTests = new Set();
for (const f of files) {
  if (f.status === 'D' && isTestFile(f.path)) {
    const target = removedWithTarget(f.path);
    if (target) {
      removedTests.add(f.path);
      report.note(`テストファイルの削除（対象の \`${target}\` も削除されているため許可）: ${f.path}`);
    } else {
      flagRemoval(`テストファイルが削除されています: ${f.path}`);
    }
  }
  if (f.status === 'R' && isTestFile(f.oldPath) && !isTestFile(f.path)) {
    flag(`テストファイルがテスト以外のファイルに変更されています: ${f.oldPath} → ${f.path}`);
  }
}

// 4. テストケース数の減少（変更されたテストファイルについて、変更前後の it/test の数を比較。
//    対象ごと削除を認めたテストファイルは数えない）
const CASE_RE = /\b(?:it|test)(?:\.each\s*(?:`[^`]*`|\([^)]*\)))?\s*\(/g;
const count = (src) => (src ? (src.match(CASE_RE) || []).length : 0);
let before = 0;
let after = 0;
for (const f of files) {
  const oldPath = f.oldPath ?? f.path;
  if (removedTests.has(f.path)) continue;
  if (isTestFile(oldPath)) before += count(fileAt(base, oldPath));
  if (f.status !== 'D' && isTestFile(f.path)) after += count(fileAt('HEAD', f.path));
}
if (after < before) flagRemoval(`テストケース数が減っています（変更されたテストファイルで ${before} → ${after}）`);
else if (before || after) report.note(`変更されたテストファイルのテストケース数: ${before} → ${after}`);

report.finish();
