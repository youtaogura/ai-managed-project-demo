#!/usr/bin/env bash
set -euo pipefail

# git の https 認証に GH_TOKEN を使う
if [[ -n "${GH_TOKEN:-}" ]]; then
  gh auth setup-git >/dev/null 2>&1 || true
fi

# コンテナには SSH クライアントも鍵も無いので、GitHub の SSH URL を https に読み替える
# （エージェント専用クローンを SSH で clone していても動くように。ホストの git 設定には影響しない）
git config --global url."https://github.com/".insteadOf "git@github.com:"
git config --global --add url."https://github.com/".insteadOf "ssh://git@github.com/"

git config --global user.name  "${GIT_AUTHOR_NAME:-ai-agent}"
git config --global user.email "${GIT_AUTHOR_EMAIL:-ai-agent@users.noreply.github.com}"

exec node /opt/orchestrator/index.mjs "$@"
