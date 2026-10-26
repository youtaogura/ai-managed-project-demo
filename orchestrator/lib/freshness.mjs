// イメージに焼き込まれたオーケストレーターが、origin/main の orchestrator/ と一致しているかを調べる。
// main を pull した後に `docker compose build` を忘れると、古いコード・プロンプト・ポリシーのまま動いてしまうため。
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { config } from './config.mjs';
import { run } from './sh.mjs';

const selfDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

// 返り値: { checked: boolean, stale: string[] }（stale は内容が異なる・存在しないファイル）
export async function checkImageFreshness({ ref = `origin/${config.baseBranch}`, repoDir = config.repoDir, dir = selfDir } = {}) {
  const ls = await run('git', ['ls-tree', '-r', '--name-only', ref, 'orchestrator/'], { cwd: repoDir, allowFail: true });
  if (!ls.ok) return { checked: false, stale: [] };
  const stale = [];
  for (const file of ls.stdout.split('\n').filter(Boolean)) {
    const rel = file.slice('orchestrator/'.length);
    if (rel.startsWith('test/')) continue; // テスト用ファイルは動作に影響しない
    const local = path.join(dir, rel);
    if (!existsSync(local)) {
      stale.push(rel);
      continue;
    }
    const remote = await run('git', ['show', `${ref}:${file}`], { cwd: repoDir, allowFail: true });
    if (!remote.ok || remote.stdout !== readFileSync(local, 'utf8')) stale.push(rel);
  }
  return { checked: true, stale };
}

export function describeStale(stale) {
  const list = stale.slice(0, 5).join(', ') + (stale.length > 5 ? ` ほか ${stale.length - 5} 件` : '');
  return `イメージ内のオーケストレーターが ${config.baseBranch} と異なります（${list}）。` +
    'main を pull した後は `docker compose build` で再ビルドしてください。';
}
