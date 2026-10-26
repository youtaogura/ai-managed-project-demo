#!/usr/bin/env bash
# オーケストレーターの E2E リハーサル（トークン不要・GitHub に一切アクセスしない）
#
# 偽の gh（Project の状態を JSON で保持）と偽の claude（工程ごとに git 操作して結果を返す）を使い、
# ローカルの bare リポジトリを origin として、Ready → Done までの流れと異常系を確認する。
#
#   bash orchestrator/test/e2e/run.sh            # ホストで実行
#   docker compose run --rm --entrypoint bash orchestrator /opt/orchestrator/test/e2e/run.sh   # コンテナ内で実行
#
# KEEP=1 を付けると作業ディレクトリを残す。
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
ORCH="$(cd "$HERE/../.." && pwd)"
WORK="$(mktemp -d)"
if [[ "${KEEP:-0}" != "1" ]]; then trap 'rm -rf "$WORK"' EXIT; else echo "作業ディレクトリ: $WORK"; fi

export GIT_AUTHOR_NAME=e2e GIT_AUTHOR_EMAIL=e2e@example.com GIT_COMMITTER_NAME=e2e GIT_COMMITTER_EMAIL=e2e@example.com

# --- origin（bare）とエージェント専用クローンを用意 ---
mkdir -p "$WORK/seed"
cp -R "$ORCH" "$WORK/seed/orchestrator"
echo "# e2e" > "$WORK/seed/README.md"
git -C "$WORK/seed" init -q -b main
git -C "$WORK/seed" add -A
git -C "$WORK/seed" commit -qm init
git clone -q --bare "$WORK/seed" "$WORK/origin.git"
git clone -q "$WORK/origin.git" "$WORK/repo"

# --- 偽 Project の初期状態 ---
cat > "$WORK/state.json" <<'EOF'
{"items":[
 {"itemId":"I1","number":1,"title":"正常系: レビューで1回差し戻されてから完了","status":"Ready","state":"OPEN","labels":[]},
 {"itemId":"I2","number":2,"title":"質問を残して停止","status":"Ready","state":"OPEN","labels":[]},
 {"itemId":"I3","number":3,"title":"Backlog は触らない","status":"Backlog","state":"OPEN","labels":[]},
 {"itemId":"I4","number":4,"title":"保護ファイルを変更した PR はマージしない","status":"Implement","state":"OPEN","labels":[]},
 {"itemId":"I5","number":5,"title":"AGENT_RESULT が無ければ失敗扱い","status":"Ready","state":"OPEN","labels":[]},
 {"itemId":"I6","number":6,"title":"CI 失敗で差し戻されてから完了","status":"Implement","state":"OPEN","labels":[]},
 {"itemId":"I7","number":7,"title":"必須チェックが出ないまま時間切れで停止","status":"Implement","state":"OPEN","labels":[]}
],"prs":{},"log":[],"reviews":{}}
EOF

export PATH="$HERE/bin:$PATH"
export FAKE_STATE="$WORK/state.json" REPO_DIR="$WORK/repo" DATA_DIR="$WORK/data" LOG_DIR="$WORK/logs"
export GITHUB_REPOSITORY=youtaogura/ai-managed-project-demo PROJECT_NUMBER=1 GH_TOKEN=dummy ANTHROPIC_API_KEY=dummy
export CLAUDE_BIN="$HERE/bin/claude" SKIP_INSTALL=1 DRY_RUN=0 MAX_CONCURRENCY=2 MAX_REWORK=2
export FAKE_CLARIFY_ISSUE=2 FAKE_TOUCH_PROTECTED=4 FAKE_NO_RESULT=5 FAKE_CI_FAIL_ISSUE=6 FAKE_CI_MISSING_ISSUE=7
# CI 待ちのタイムアウトを 0 分にして、2回目の確認で時間切れになるようにする
export CI_TIMEOUT_MIN=0

# --- まず DRY_RUN で何も変更されないことを確認 ---
DRY_RUN=1 node "$ORCH/index.mjs" once >/dev/null
node -e '
  const s = require(process.argv[1]);
  if (s.log.length) { console.error("DRY_RUN なのに状態が変わりました", s.log); process.exit(1); }
' "$WORK/state.json"
echo "✔ DRY_RUN では Project を変更しない"
rm -rf "$WORK/data" "$WORK/logs"

# --- 本番相当で数サイクル回す ---
for i in $(seq 1 16); do
  node "$ORCH/index.mjs" once 2>&1 | sed -E 's/^[0-9T:.-]+Z /  /' | grep -vE 'ensure label|起動|終了' || true
done

# --- 結果の検証 ---
node - "$WORK" <<'EOF'
const fs = require('fs');
const { execFileSync } = require('child_process');
const work = process.argv[2];
const s = JSON.parse(fs.readFileSync(`${work}/state.json`, 'utf8'));
const item = (n) => s.items.find((i) => i.number === n);
let failed = 0;
const expect = (cond, msg) => { console.log(`${cond ? '✔' : '✘'} ${msg}`); if (!cond) failed++; };

expect(item(1).status === 'Done' && item(1).state === 'CLOSED', '#1 は Done になり Issue がクローズされる');
expect(s.log.includes('status #1: Review -> Implement'), '#1 はレビューで一度差し戻される');
expect(s.log.some((l) => l.startsWith('pr merge')), '#1 の PR がマージされる');
const branches = execFileSync('git', ['branch', '--list', 'agent/*'], { cwd: `${work}/origin.git` }).toString();
expect(!branches.includes('agent/issue-1'), '#1 のリモートブランチが削除される');
expect(!fs.existsSync(`${work}/data/worktrees/issue-1`), '#1 の worktree が削除される');
expect(item(2).status === 'Blocked' && item(2).labels.includes('needs-clarification'), '#2 は質問待ちで Blocked');
expect(item(3).status === 'Backlog' && !s.log.some((l) => l.includes('#3')), '#3（Backlog）は触られない');
expect(item(4).status === 'Blocked' && item(4).labels.includes('agent-failed'), '#4 は保護ファイル変更で Blocked');
expect(s.prs['agent/issue-4']?.open === true, '#4 の PR はマージされない');
expect(item(5).status === 'Blocked' && item(5).labels.includes('agent-failed'), '#5 は結果行なしで Blocked');
expect(s.log.some((l) => /^pr comment #\d+: .*CI チェックが失敗/.test(l)), '#6 は CI 失敗を PR にコメントして差し戻される');
expect(s.log.includes('status #6: Release -> Implement'), '#6 は Release から Implement に戻る');
expect(item(6).status === 'Done' && item(6).state === 'CLOSED', '#6 は修正後に Done になる（必須でないチェックの失敗は無視）');
expect(item(7).status === 'Blocked' && item(7).labels.includes('agent-failed'), '#7 は必須チェックが出ないまま時間切れで Blocked');
expect(s.prs['agent/issue-7']?.open === true, '#7 の PR はマージされない');

console.log(failed ? `\nNG: ${failed} 件失敗` : '\nOK: E2E リハーサル成功');
process.exit(failed ? 1 : 0);
EOF
