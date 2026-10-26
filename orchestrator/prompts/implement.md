# 工程: 実装・テスト

仕様書 `{{SPEC_PATH}}` に従って実装とテストを行い、PR を作成（または更新）してください。

- 既存の PR: {{PR_NUMBER}}
- これまでの差し戻し回数: {{REWORK_COUNT}}
- `{{BASE_BRANCH}}` とのコンフリクト: {{BASE_SYNC}}

## 手順

1. `{{SPEC_PATH}}` と `gh issue view {{ISSUE_NUMBER}} --comments` を読む。
   コンフリクトありの場合は、次の手順に進む前に「{{BASE_BRANCH}} とのコンフリクト解消」を行う。
2. 既存の PR がある場合は差し戻しです。レビュー指摘と CI の結果を確認し、**指摘と CI の失敗をすべて解消する**ことを最優先にする。
   - レビュー: `gh pr view <番号> --comments`
   - CI: `gh pr checks <番号> --json name,bucket,link` で失敗したチェックを確認し、
     `link` の URL 中の run id を使って `gh run view <run-id> --log-failed` で失敗ログを読む
3. 受け入れ条件ごとにテストを書き（`@testing-library/react-native` + Jest）、実装する。
   - ライブラリを追加するときは `cd {{APP_DIR}} && npx expo install <pkg>` を使う（失敗する場合は `pnpm add`）。
4. `cd {{APP_DIR}} && pnpm check` がすべて通るまで修正する。通らないまま PR を出さない。
5. 意味のある単位でコミットし（Conventional Commits 形式、日本語可）、`git push -u origin {{BRANCH}}` する。
6. PR がなければ作成する:
   `gh pr create --base {{BASE_BRANCH}} --head {{BRANCH}} --title "<要約> (#{{ISSUE_NUMBER}})" --body-file /tmp/pr-body.md`
   本文は `.github/pull_request_template.md` の構成に従い、必ず `Closes #{{ISSUE_NUMBER}}` を含める。
7. PR がすでにある場合は、`gh pr comment <番号> --body-file <ファイル>` で、各指摘への対応内容を返信する。

## {{BASE_BRANCH}} とのコンフリクト解消

複数の Issue が並行して実装されるため、先にマージされた別 Issue の変更とコンフリクトするのは想定内です。
**コンフリクトを理由に止まらず、コミットログを辿って両方の意図を満たすように解消すること。**

1. `git fetch origin && git merge origin/{{BASE_BRANCH}}` で取り込む。
   rebase はしない（push 済みの履歴を書き換えると force push が必要になり、ガードで禁止されている）。
   PR は squash マージされるので、マージコミットは `{{BASE_BRANCH}}` の履歴には残らない。
2. コンフリクトしたファイルごとに、相手側の意図を調べる:
   - `git log --merge --oneline -- <ファイル>` で、両側でそのファイルを変更したコミットを一覧する
   - `{{BASE_BRANCH}}` 側のコミットは `<要約> (#<PR番号>)` 形式の squash コミット。
     `git show <コミット>` で差分を読み、`gh pr view <PR番号>` で元の Issue 番号（`Closes #N`）と PR 本文の判断ログを読む
   - 元の Issue の仕様書 `docs/specs/issue-<N>.md` を読み、その変更が満たそうとしている受け入れ条件を把握する
3. 解消の方針:
   - `{{BASE_BRANCH}}` 側の変更はレビューと CI を通ってリリース済みなので、その振る舞いを優先して残す。
     相手の受け入れ条件を壊さないように、**自分のブランチの変更の側を合わせる**
   - そのうえで、自分の Issue の受け入れ条件も満たす。両方の変更が同じものを追加している場合は統合して重複させない
   - `{{BASE_BRANCH}}` 側で追加・変更されたテストを消したり弱めたりしない（両方のテストが通る状態にする）
   - `pnpm-lock.yaml` がコンフリクトした場合は、`package.json` を解消してから `cd {{APP_DIR}} && pnpm install` で作り直す
4. `cd {{APP_DIR}} && pnpm check` が通ることを確認してから、マージコミットを作る。
   コミットメッセージには、どの Issue（`#N`）の変更とコンフリクトし、どう解消したかを書く。
5. `git push origin {{BRANCH}}` する（通常の push。force push はしない）。
6. PR 本文の判断ログに「コンフリクト解消」の行を追加する（相手の Issue・PR 番号、ファイル、選んだ解消方法と理由）。
   `gh pr edit <番号> --body-file <ファイル>` で更新する。
7. 解消後も、差し戻しの指摘や CI の失敗があれば通常どおり対応する。

`needs_clarification` で止めてよいのは、2つの Issue の**仕様自体が矛盾している**場合だけです
（例: 同じフィールドの型や意味が仕様書ごとに違い、どちらに合わせても一方の受け入れ条件を満たせない）。
その場合は Issue のコメントに、矛盾している仕様書の箇所と、推奨する解決案を書くこと。
テキスト上のコンフリクトやファイル配置の衝突は、すべて自分で解消すること。

## CI で検査されること（すべて通らないとマージされない）

| チェック | 内容 |
|---|---|
| `lint-typecheck` | ESLint（警告もエラー扱い、`any` と非 null アサーション `!` は禁止）、`tsc --noEmit` |
| `test-coverage` | Jest、全体カバレッジ（行・関数 80%、分岐 70%）、**変更行の 80% 以上がテストで実行されること**（差分カバレッジ） |
| `build` | `expo export` で Android / iOS 向けにバンドルできること |
| `dependencies` | Expo SDK との互換性、expo-doctor、**新たな** high / critical 脆弱性がないこと、ライセンスが許可リスト内 |
| `pr-policy` | 下記の改ざん検知と PR 形式 |

次のことをすると CI が失敗します。テストや検査を緩めて通そうとせず、コードを直すこと。

- テストの `.skip` / `.only` / `xit` / `fit`、テストファイルの削除、変更したテストファイルのテストケース数の減少
- `eslint-disable`、`@ts-ignore`、`@ts-expect-error`、`@ts-nocheck`、`istanbul ignore` などの抑制コメントの追加
- `app/` と `docs/specs/` 以外の変更。`app/jest.config.js` `app/eslint.config.js` `app/tsconfig.json` `app/.npmrc` `app/eas.json` の変更
- 仕様書に名前が書かれていない依存関係の追加（追加が必要なら、仕様書の設計に名前と理由を追記する）
- PR 本文に `Closes #{{ISSUE_NUMBER}}` がない、「判断ログ」が空（判断事項がなければ「判断事項なし」と理由を書く）

push 前に `cd {{APP_DIR}} && pnpm check && pnpm exec jest --coverage` で、少なくとも lint・型・テスト・カバレッジを確認すること。

## 判断ログ

仕様書に書かれていないことを決めたら、PR 本文の「判断ログ」に追記する（選んだ案・却下した案・理由）。
仕様書自体の誤りに気づいた場合は、仕様書も修正して同じ PR に含め、判断ログに理由を書く。

## 最終結果

- PR を作成・更新し、`pnpm check` が通った（コンフリクトありの場合は解消して push した）: `done`
- 質問を残して終了: `needs_clarification`
- 続行できないエラー: `failed`
