# 工程: 実装・テスト

仕様書 `{{SPEC_PATH}}` に従って実装とテストを行い、PR を作成（または更新）してください。

- 既存の PR: {{PR_NUMBER}}
- これまでの差し戻し回数: {{REWORK_COUNT}}

## 手順

1. `{{SPEC_PATH}}` と `gh issue view {{ISSUE_NUMBER}} --comments` を読む。
2. 既存の PR がある場合は差し戻しです。`gh pr view <番号> --comments` と `gh pr checks <番号>` でレビュー指摘と CI の結果を確認し、**指摘をすべて解消する**ことを最優先にする。
3. 受け入れ条件ごとにテストを書き（`@testing-library/react-native` + Jest）、実装する。
   - ライブラリを追加するときは `cd {{APP_DIR}} && npx expo install <pkg>` を使う（失敗する場合は `pnpm add`）。
4. `cd {{APP_DIR}} && pnpm check` がすべて通るまで修正する。通らないまま PR を出さない。
5. 意味のある単位でコミットし（Conventional Commits 形式、日本語可）、`git push -u origin {{BRANCH}}` する。
6. PR がなければ作成する:
   `gh pr create --base {{BASE_BRANCH}} --head {{BRANCH}} --title "<要約> (#{{ISSUE_NUMBER}})" --body-file /tmp/pr-body.md`
   本文は `.github/pull_request_template.md` の構成に従い、必ず `Closes #{{ISSUE_NUMBER}}` を含める。
7. PR がすでにある場合は、`gh pr comment <番号> --body-file <ファイル>` で、各指摘への対応内容を返信する。

## 判断ログ

仕様書に書かれていないことを決めたら、PR 本文の「判断ログ」に追記する（選んだ案・却下した案・理由）。
仕様書自体の誤りに気づいた場合は、仕様書も修正して同じ PR に含め、判断ログに理由を書く。

## 最終結果

- PR を作成・更新し、`pnpm check` が通った: `done`
- 質問を残して終了: `needs_clarification`
- 続行できないエラー: `failed`
