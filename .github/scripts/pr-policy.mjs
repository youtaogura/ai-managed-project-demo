#!/usr/bin/env node
// PR の形式とスコープの検査（エージェントのブランチのみ）
//   BASE_SHA   比較元のコミット
//   HEAD_REF   PR のブランチ名
//   PR_BODY    PR 本文
import {
  changedFiles,
  createReport,
  fileAt,
  isAgentBranch,
  issueNumberFromBranch,
  loadPolicy,
  matchesPath,
  requireEnv,
} from './lib.mjs';

const policy = loadPolicy();
const base = requireEnv('BASE_SHA');
const ref = process.env.HEAD_REF || '';
const body = process.env.PR_BODY || '';
const report = createReport('PR の形式とスコープ');

if (!isAgentBranch(ref, policy)) {
  report.note(`エージェントのブランチ（${policy.agentBranchPrefix}*）ではないため検査しません: ${ref || '(不明)'}`);
  report.finish();
} else {
  const issue = issueNumberFromBranch(ref, policy);
  const specPath = `docs/specs/issue-${issue}.md`;

  // 1. Issue との紐付け
  const closes = new RegExp(`\\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\\s+#${issue}\\b`, 'i');
  if (!closes.test(body)) report.error(`PR 本文に \`Closes #${issue}\` がありません。`);

  // 2. 判断ログ（テンプレートの表に、空でない行が1つ以上あること）
  const section = body.split(/^##\s*判断ログ\s*$/m)[1]?.split(/^##\s/m)[0] ?? null;
  if (section === null) {
    report.error('PR 本文に「## 判断ログ」の見出しがありません。');
  } else {
    const rows = section
      .split('\n')
      .filter((l) => /^\s*\|/.test(l))
      .slice(2) // 見出し行と区切り行
      .filter((l) => l.split('|').slice(1, -1).some((c) => c.trim()));
    const bullets = section.split('\n').filter((l) => /^\s*[-*]\s+\S/.test(l));
    if (!rows.length && !bullets.length) report.error('「判断ログ」が空です。判断した内容がなければ「判断事項なし」と理由を書いてください。');
  }

  // 3. 仕様書
  const spec = fileAt('HEAD', specPath);
  if (spec === null) report.error(`仕様書 \`${specPath}\` がありません。`);

  // 4. 変更範囲
  const files = changedFiles(base);
  for (const f of files) {
    for (const p of [f.path, f.oldPath].filter(Boolean)) {
      if (policy.protectedPaths.some((pp) => matchesPath(p, pp))) {
        report.error(`保護対象のファイルが変更されています: \`${p}\``);
      } else if (!policy.agentAllowedPaths.some((ap) => matchesPath(p, ap))) {
        report.error(`エージェントが変更できる範囲（${policy.agentAllowedPaths.join(', ')}）の外です: \`${p}\``);
      } else if (p.startsWith('docs/specs/') && p !== specPath && f.status !== 'A') {
        report.warn(`他の Issue の仕様書が変更されています: \`${p}\``);
      }
    }
  }

  // 5. 追加された依存関係が仕様書に書かれていること
  const deps = (src) => {
    try {
      const j = JSON.parse(src);
      return new Set([...Object.keys(j.dependencies ?? {}), ...Object.keys(j.devDependencies ?? {})]);
    } catch {
      return new Set();
    }
  };
  const before = deps(fileAt(base, 'app/package.json'));
  const after = deps(fileAt('HEAD', 'app/package.json'));
  const addedDeps = [...after].filter((d) => !before.has(d));
  for (const d of addedDeps) {
    if (!spec || !spec.includes(d)) report.error(`依存関係 \`${d}\` が追加されていますが、仕様書に記載がありません（設計に名前と追加理由を書くこと）。`);
  }
  if (addedDeps.length) report.note(`追加された依存関係: ${addedDeps.join(', ')}`);
  report.note(`変更ファイル数: ${files.length}`);
  report.finish();
}
