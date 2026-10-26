# CLAUDE.md

このリポジトリは、GitHub Project の Issue を AI エージェント（Claude Code）が自律的に
要件整理 → 設計 → 実装 → テスト → レビュー → リリースまで進めるデモです。
エージェントはオーケストレーター（`orchestrator/`）からヘッドレスで起動されます。

## リポジトリ構成

- `app/` … React Native（Expo, TypeScript）アプリ。**エージェントが変更してよいのは主にここ**
- `docs/specs/` … Issue ごとの仕様書（`issue-<番号>.md`）
- `orchestrator/` `docker/` `.github/` `docker-compose.yml` `CLAUDE.md` … 人間だけが変更する（ガードでブロックされる）

## アプリの技術スタック

- Expo SDK（`app/package.json` の `expo` のバージョンを確認すること）/ React Native / TypeScript（strict）
- パッケージマネージャ: **pnpm**（`app/.npmrc` で `node-linker=hoisted`）
- テスト: Jest（`jest-expo` プリセット）+ `@testing-library/react-native`
- Lint: ESLint 9 + `eslint-config-expo`（`eslint-plugin-react` が ESLint 10 未対応のため 9 に固定）
- ビルド・配布: EAS Build（クラウド）。iOS/Android のネイティブディレクトリは生成物なのでコミットしない

Expo の API は SDK ごとに変わります。記憶に頼らず、`app/AGENTS.md` の指示に従って
バージョンに合ったドキュメントを確認してください。

## コマンド（すべて `app/` で実行）

```bash
pnpm check        # lint + typecheck + test。作業完了前に必ず通す
pnpm test         # Jest
pnpm typecheck    # tsc --noEmit
pnpm lint         # ESLint
npx expo install <pkg>   # ライブラリ追加（SDK 互換バージョンを解決する）
```

開発サーバー（`expo start` / `pnpm start`）は起動しないこと。

## コーディング規約

- ディレクトリ: `src/screens/`（画面）、`src/components/`（再利用 UI）、`src/hooks/`、`src/lib/`（ロジック）、`src/types/`
- テストは対象と同じ階層の `__tests__/` に `*.test.tsx` / `*.test.ts` で置く
- 関数コンポーネント + 名前付き export。`default export` は `App.tsx` のみ
- スタイルは `StyleSheet.create`。色やサイズを複数箇所で使うなら `src/theme.ts` に定数化
- `any` と非 null アサーション（`!`）は使わない。外部入力は型ガードで絞り込む
- UI の文言は日本語
- ナビゲーションが必要になったら Expo Router を導入する（導入判断は仕様書の判断ログに書く）
- 状態管理はまず React の state / context で足りるか検討し、ライブラリ追加は仕様書で理由を説明できる場合のみ
- テストは振る舞い（表示・操作結果）を検証する。実装の内部構造に依存しない

## Git / PR

- ブランチ: `agent/issue-<番号>`（オーケストレーターが用意する）
- コミット: Conventional Commits（`feat:` `fix:` `test:` `docs:` `refactor:` `chore:`）。本文は日本語可
- PR 本文は `.github/pull_request_template.md` に従い、**判断ログ**を必ず書く。`Closes #<番号>` を含める

## 自律実行ルール

- ユーザーに確認せず、自分で判断して最後まで進める
- 方針が複数ある場合は、既存コードの慣習と仕様書に最も合うものを選ぶ
- 迷った判断は判断ログ（仕様書または PR 本文）に、選んだ案・却下した案・理由を記録する
- 判断材料が足りず、どの案でも手戻りが大きい場合のみ、Issue に質問コメントを残して `needs_clarification` で終了する
- ステータス変更、マージ、Issue のクローズ、main への push はオーケストレーターの担当なので行わない
