# オーケストレーター + Claude Code エージェント用イメージ
# - オーケストレーター本体とガード、Claude Code の管理設定は root 所有・書き込み不可で焼き込む
# - 実行ユーザーは非 root の agent
FROM node:22-bookworm-slim

ARG AGENT_UID=1000
ARG AGENT_GID=1000
ARG CLAUDE_CODE_VERSION=latest
ARG EAS_CLI_VERSION=latest

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates curl git gnupg jq tini \
 && curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg \
      -o /usr/share/keyrings/githubcli-archive-keyring.gpg \
 && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
      > /etc/apt/sources.list.d/github-cli.list \
 && apt-get update \
 && apt-get install -y --no-install-recommends gh \
 && rm -rf /var/lib/apt/lists/*

# 画面の撮影用（エージェントが Web 版を Playwright で撮影し、デザインと見比べる）
# - ブラウザは Debian の Chromium を使う。Playwright のバージョンに縛られないよう、
#   playwright / playwright-core からは executablePath に CHROMIUM_PATH を渡す（playwright install はしない）
# - fonts-noto-cjk はアプリのフォントが読み込まれる前や、読み込まない部分の日本語の代わり
RUN apt-get update \
 && apt-get install -y --no-install-recommends chromium fonts-noto-cjk \
 && rm -rf /var/lib/apt/lists/*

# CLI 類はグローバル（root 所有）にインストール。agent ユーザーからは書き換え不可
RUN npm install -g \
      @anthropic-ai/claude-code@${CLAUDE_CODE_VERSION} \
      eas-cli@${EAS_CLI_VERSION} \
      pnpm@10 \
 && npm cache clean --force

# 非 root ユーザー（node イメージ既定の node ユーザーと UID が衝突する場合は置き換える）
RUN if getent passwd ${AGENT_UID} >/dev/null; then userdel -r "$(getent passwd ${AGENT_UID} | cut -d: -f1)"; fi \
 && if getent group ${AGENT_GID} >/dev/null; then groupdel "$(getent group ${AGENT_GID} | cut -d: -f1)" || true; fi \
 && groupadd -g ${AGENT_GID} agent \
 && useradd -m -u ${AGENT_UID} -g ${AGENT_GID} -s /bin/bash agent

# マウントしたリポジトリの所有者がホスト側 UID でも git が拒否しないように
RUN git config --system safe.directory '*' \
 && git config --system init.defaultBranch main

# Claude Code の管理設定（プロジェクトやユーザー設定で上書きできない）
COPY docker/managed-settings.json /etc/claude-code/managed-settings.json

# オーケストレーター本体（エージェントが worktree 内の orchestrator/ を書き換えても実行中のものには影響しない）
COPY orchestrator /opt/orchestrator
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh

RUN chown -R root:root /opt/orchestrator /etc/claude-code \
 && chmod -R a-w /opt/orchestrator /etc/claude-code \
 && chmod 755 /usr/local/bin/entrypoint.sh \
 && mkdir -p /workspace/repo /data /logs \
 && chown agent:agent /workspace /workspace/repo /data /logs

USER agent
WORKDIR /home/agent

ENV REPO_DIR=/workspace/repo \
    DATA_DIR=/data \
    LOG_DIR=/logs \
    npm_config_store_dir=/data/pnpm-store \
    CHROMIUM_PATH=/usr/bin/chromium \
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 \
    DISABLE_AUTOUPDATER=1

ENTRYPOINT ["/usr/bin/tini", "--", "/usr/local/bin/entrypoint.sh"]
CMD ["loop"]
