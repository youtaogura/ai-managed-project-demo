# AI Managed Project Demo

GitHub Project の Issue を、Claude Code がヘッドレスで
**要件整理・設計 → 実装・テスト → レビュー → リリース** まで自律的に進めるデモです。
アプリは React Native（Expo）で、`app/` にあります。

```
GitHub Project (Status)          オーケストレーター（Docker コンテナ 1 つ）
 Backlog   … 人間が起票・整理      ├─ Project をポーリング
 Ready     … 着手 OK ───────────▶ ├─ Issue ごとに git worktree を用意
 Spec      … 要件整理・設計中      ├─ claude -p を工程ごとに起動（最大 N 並列）
 Implement … 実装・テスト中        ├─ 結果に応じて Status を進める / 差し戻す / 止める
 Review    … 別セッションがレビュー └─ Release は LLM を使わず CI 確認 → マージ → EAS ビルド
 Release   … CI 待ち → マージ
 Done
 Blocked   … 質問待ち・失敗（人間が対応）
```

## 構成

| パス | 内容 |
|---|---|
| `app/` | Expo（TypeScript）アプリ。Jest + Testing Library、ESLint |
| `orchestrator/` | オーケストレーター（Node 22、外部依存なし） |
| `orchestrator/prompts/` | 工程別プロンプト（`_common.md` + `spec` / `implement` / `review`） |
| `orchestrator/guard/` | Claude Code の PreToolUse hook（危険操作・保護ファイル編集をブロック） |
| `orchestrator/test/e2e/` | 偽の gh / claude を使った E2E リハーサル（トークン不要） |
| `orchestrator/policy.json` | 保護対象パス・必須 CI チェック・ライセンス許可リスト（ガード・オーケストレーター・CI で共通） |
| `.github/workflows/` | CI（`ci.yml`）と PR ルール検査（`pr-policy.yml`） |
| `.github/scripts/` | CI 用スクリプト（差分カバレッジ、改ざん検知、PR 形式・範囲、脆弱性差分、ライセンス） |
| `docker/` | Dockerfile、エントリポイント、Claude Code 管理設定（hook 登録） |
| `CLAUDE.md` | エージェント向けの規約と自律実行ルール |

## 安全設計

- **ホスト保護**: コンテナは非 root・ルートファイルシステム読み取り専用・`cap_drop: ALL`・`no-new-privileges`。Docker ソケットはマウントしない。
- **マウントするのはエージェント専用クローンだけ**。普段の作業コピーはマウントしない。専用クローンではホスト側から git や npm を実行しない（`.git/hooks` や `package.json` の scripts 経由でホスト上でコードが実行されるのを防ぐため）。
- **指示書の改ざん防止**: 実行中のオーケストレーター・プロンプト・ガードはイメージ内の `/opt/orchestrator`（root 所有・書き込み不可）にあり、エージェントが worktree 内の `orchestrator/` を書き換えても影響しない。Claude Code の hook は `/etc/claude-code/managed-settings.json` で登録しているため、プロジェクト設定では無効化できない。
- **ガード hook**: force push、main への push、PR のマージ、Project 操作、トークン参照、作業ディレクトリ外の削除、保護ファイルの編集などをブロック。レビュー工程ではコード編集自体をブロック。
- **マージ前の最終チェック**: 保護対象（`orchestrator/` `docker/` `.github/` `CLAUDE.md`、CI の閾値を決める `app/jest.config.js` など）を変更した PR はマージせず Blocked にする。必須の CI チェックが通らない PR もマージしない。
- **CI はエージェントが手を出せない審判**: 設定ファイルは保護対象、CI は `package.json` の scripts を使わずツールを直接呼ぶ、エージェントのトークンには `workflow` スコープを付けない。
- **止まらずに記録して終了**: 判断は仕様書・PR の「判断ログ」に残す。判断できない場合だけ Issue に質問して `needs-clarification` ラベルで停止する。

## CI（PR ごと）

| ジョブ | 内容 |
|---|---|
| `lint-typecheck` | ESLint（警告もエラー、`any` と `!` 禁止）、`tsc --noEmit` |
| `test-coverage` | Jest、全体カバレッジ閾値（`app/jest.config.js`）、差分カバレッジ（変更行の 80% 以上） |
| `build` | `expo export` で Android / iOS 向けにバンドルできるか |
| `dependencies` | `expo install --check`、expo-doctor、base から**増えた** high / critical 脆弱性、ライセンス許可リスト |
| `tooling` | オーケストレーター（ユニット + E2E リハーサル）と CI スクリプトのテスト |
| `pr-policy` | 改ざん検知（skip/only、抑制コメント、テスト削除・減少）、PR 形式（`Closes #N`・判断ログ・仕様書）、変更範囲、依存追加の仕様書記載。**エージェントのブランチでのみ強制** |

既存の脆弱性（Expo 本体の依存など、エージェントでは直せないもの）は警告として表示し、失敗にはしません。
オーケストレーターは Release 工程で `policy.json` の `requiredChecks` だけを見てマージを判断し、
結果が `CI_TIMEOUT_MIN` 分出なければ Blocked にします。

---

## ローカルでの動作確認（push 前）

上から順に、必要なものが少ない確認から進めます。**1〜3 はトークン不要**です。

### 1. アプリ単体（Node 22 + pnpm）

```bash
cd app
pnpm install
pnpm check        # lint + typecheck + test
```

### 2. オーケストレーター単体と E2E リハーサル

```bash
cd orchestrator
node --test                 # ユニットテスト（ガード・結果解析・工程判定・CI 判定）
bash test/e2e/run.sh        # 偽の gh / claude で Ready → Done と異常系を確認
```

`OK: E2E リハーサル成功` と表示されれば、ポーリング・worktree 作成・工程遷移・差し戻し・マージ後の掃除・停止処理が動いています。

### 3. コンテナのビルドとコンテナ内での確認

```bash
cp .env.example .env        # この時点ではトークンは空のままでよい（DRY_RUN=1 になっている）
mkdir -p agent-logs
# AGENT_REPO_PATH は一旦このディレクトリなど、存在するパスにしておく
docker compose build

# コンテナ内のツールチェーンで E2E リハーサル
docker compose run --rm --entrypoint bash orchestrator /opt/orchestrator/test/e2e/run.sh

# 保護が効いていることの確認
docker compose run --rm --entrypoint bash orchestrator -c '
  id;                                                     # uid が agent（非 root）であること
  touch /opt/orchestrator/x 2>&1 | tail -1;               # 書き込めないこと
  touch /etc/x 2>&1 | tail -1;                            # ルート FS が読み取り専用であること
  echo "{\"tool_name\":\"Bash\",\"tool_input\":{\"command\":\"git push origin main\"}}" \
    | node /opt/orchestrator/guard/guard.mjs; echo "guard exit=$?"   # 2 ならブロック
'
```

### 4. GitHub 側の準備（ここからトークンが必要）

1. このリポジトリを push する（初回コミット）。
2. **GitHub Project（ボード）** を作成し、リポジトリをリンクする。
3. Project の **Status** フィールドの選択肢を次の名前にする（変える場合は `.env` の `STATUS_NAMES`）:
   `Backlog` `Ready` `Spec` `Implement` `Review` `Release` `Done` `Blocked`
4. main にブランチ保護（または Ruleset）を設定し、必須ステータスチェックに
   `lint-typecheck` `test-coverage` `build` `dependencies` `tooling` `pr-policy` を指定する（一度 CI が動いた後で選択できる）。
5. トークンを用意して `.env` に設定する:
   - `GH_TOKEN`: classic PAT（scopes: `repo`, `project`）。ユーザー所有の Project v2 は fine-grained PAT では操作できない場合があります。
   - `ANTHROPIC_API_KEY`、または `claude setup-token` で発行した `CLAUDE_CODE_OAUTH_TOKEN`
   - `PROJECT_NUMBER`: Project の URL `.../projects/<番号>`
6. **エージェント専用クローン**を作り、`.env` の `AGENT_REPO_PATH` に設定する（https で clone すること）:
   ```bash
   git clone https://github.com/youtaogura/ai-managed-project-demo ~/agent-work/ai-managed-project-demo
   ```

### 5. 接続確認（まだ何も変更しない）

```bash
docker compose build                                   # .env を変えたら不要、コードを変えたら再ビルド
docker compose run --rm orchestrator doctor            # 設定・認証・Project・push 権限を確認
docker compose run --rm orchestrator status            # ボードの内容と次の工程を表示
docker compose run --rm --entrypoint claude orchestrator -p "OK とだけ返して" --max-turns 1   # Claude の認証確認
```

### 6. 1 工程ずつ実行する

小さな Issue を 1 件作り（Issue テンプレート「機能追加」を使用）、Project で **Ready** に置きます。

```bash
docker compose run --rm orchestrator once                      # DRY_RUN=1: 何をするかだけ表示
docker compose run --rm -e DRY_RUN=0 orchestrator run --issue 1   # 要件整理・設計を 1 回だけ実行
```

成果物（Issue コメント、`docs/specs/issue-1.md`、ログ `agent-logs/*.json` と `*.prompt.md`）を確認し、
必要ならプロンプトを調整して `docker compose build` し直します。
同じコマンドを繰り返すと Implement → Review → Release と 1 工程ずつ進みます。

### 7. 常駐させる

`.env` の `DRY_RUN=0` にしてから:

```bash
docker compose up -d
docker compose logs -f
docker compose down          # 実行中の工程の終了を待ってから停止
```

---

## 運用

- **質問への回答**: Blocked の Issue にエージェントの質問コメントが付いています。Issue に回答を書き、`needs-clarification` ラベルを外して、Status を再開したい列（通常は止まった工程）に戻します。
- **失敗時**: `agent-failed` ラベルとオーケストレーターのコメントを確認し、ログ（`agent-logs/`）を見て対処後、ラベルを外して列を戻します。
- **差し戻し**: レビュー指摘・CI 失敗で Implement に戻ります。`MAX_REWORK` 回を超えると Blocked。
- **コスト・暴走の抑制**: `MAX_TURNS`、`JOB_TIMEOUT_MIN`、`MAX_CONCURRENCY`、`MAX_BUDGET_USD`（API キー利用時）。
- **リリース**: CI 通過を確認して squash マージし、Issue をクローズ。`EXPO_TOKEN` があり `app/` で `eas init` 済みなら、Android の内部配布ビルド（`preview`）を依頼します。

## 既知の制約（デモのため）

- iOS ビルドや E2E（エミュレータ）テストはコンテナ内では行わない。検証は lint / typecheck / Jest。
- コンテナのネットワークは制限していない。必要ならプロキシや egress 制限を追加する。
- オーケストレーターとアプリが同じリポジトリにある。本番運用ではオーケストレーターを別リポジトリに分けることを推奨。
- GitHub の仕様上、同じアカウントの PR は Approve できないため、レビュー結果はコメントで投稿し、判定はオーケストレーターが受け取る。
