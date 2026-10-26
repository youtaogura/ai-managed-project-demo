#!/usr/bin/env bash
set -euo pipefail

# git の https 認証に GH_TOKEN を使う
if [[ -n "${GH_TOKEN:-}" ]]; then
  gh auth setup-git >/dev/null 2>&1 || true
fi

git config --global user.name  "${GIT_AUTHOR_NAME:-ai-agent}"
git config --global user.email "${GIT_AUTHOR_EMAIL:-ai-agent@users.noreply.github.com}"

exec node /opt/orchestrator/index.mjs "$@"
