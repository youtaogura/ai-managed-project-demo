# CLAUDE.md

このリポジトリは、GitHub Project の Issue を AI エージェント（Claude Code）が自律的に
要件整理 → 設計 → 実装 → テスト → レビュー → リリースまで進めるデモです。
エージェントはオーケストレーター（`orchestrator/`）からヘッドレスで起動されます。

## リポジトリ構成

- `app/` … React Native（Expo, TypeScript）アプリ。**エージェントが変更してよいのは主にここ**
- `docs/specs/` … Issue ごとの仕様書（`issue-<番号>.md`）
- `orchestrator/` `docker/` `.github/` `docker-compose.yml` `CLAUDE.md` … 人間だけが変更する（ガードでブロックされる）
- `app/jest.config.js` `app/eslint.config.js` `app/tsconfig.json` `app/.npmrc` `app/eas.json` … CI の閾値やルールを決めるため、これらも人間だけが変更する
- `docs/design-system/`（デザインシステムの正本）と、そこから生成する `app/src/design/tokens.ts` … 人間だけが変更する
- ルートの `.env.example` は、アプリの環境変数の段（`EXPO_PUBLIC_*`）だけエージェントが追記・変更してよい（`.env` などほかの環境変数のファイルは保護対象）
- 保護対象の一覧は `orchestrator/policy.json`（ガード hook・オーケストレーター・CI が共通で参照）

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
- スタイルは `StyleSheet.create`。色・文字・余白・角丸・サイズは下の「デザインシステム」に従う
- `any` と非 null アサーション（`!`）は使わない。外部入力は型ガードで絞り込む
- UI の文言は日本語
- ナビゲーションが必要になったら Expo Router を導入する（導入判断は仕様書の判断ログに書く）
- 状態管理はまず React の state / context で足りるか検討し、ライブラリ追加は仕様書で理由を説明できる場合のみ
- テストは振る舞い（表示・操作結果）を検証する。実装の内部構造に依存しない
- 環境変数を追加・変更したら、同じ PR でルートの `.env.example` の「アプリ」の段に追記する（用途、未設定のときの動き、値の取得方法、必須か任意か、EAS にも設定するか）。値は空にし、実際のキーは書かない。未設定でもアプリが壊れないようにする。実際の値の取得と `.env`・EAS への登録は人間が行うので、PR 本文に「人間の作業」として書く

## デザインシステム

UI を作る・変えるときは、**`docs/design-system/README.md`（ブランドブック）と、使う部品の `docs/design-system/components/<部品名>/README.md`、作る画面のデザイン `docs/design-system/screens/README.md`（画像付き）を最初に読む**こと。

- 黒い地に、アクセントは白だけ（色は書影・ポスターだけが持つ）。有彩色のアクセントや新しい色を足さない
- 値は `app/src/design/tokens.ts`（`colors` `typography` `space` `radius` `size` `shadows`）から使う。色・余白・角丸の数値を画面に直接書かない
- `src/theme.ts` は既存の画面との互換のための層。新しいコードは `src/design/tokens.ts` を直接使うか、`theme.ts` 経由でトークンを参照する
- タップできるものは `size.touchMin`（44）以上。アイコンだけのボタンには `accessibilityLabel` を付ける
- デザインシステムにない色・文字スタイル・部品が必要になったら、勝手に作らず、仕様書の判断ログに提案として書く（トークンの追加は人間が行う）

## CI（PR ごと。すべて通らないとマージされない）

| チェック | 内容 |
|---|---|
| `lint-typecheck` | ESLint（警告もエラー、`any` と `!` は禁止）、`tsc --noEmit` |
| `test-coverage` | Jest、全体カバレッジ（行・関数・文 80%、分岐 70%）、差分カバレッジ（変更行の 80% 以上） |
| `build` | `expo export` で Android / iOS 向けにバンドルできること |
| `dependencies` | `expo install --check`、expo-doctor、新たな high / critical 脆弱性がないこと、ライセンス許可リスト |
| `tooling` | オーケストレーターと CI スクリプト自体のテスト |
| `pr-policy` | テスト・検査の改ざん検知（skip/only、抑制コメント、テスト削除・減少）、PR 形式（`Closes #N`、判断ログ、仕様書）、変更範囲、依存追加が仕様書に記載されていること |

`pr-policy` の改ざん検知と形式チェックは、エージェントのブランチ（`agent/issue-*`）でだけ強制される。
CI は `package.json` の scripts を使わずツールを直接呼ぶ。テストや検査を緩めて通そうとしないこと。

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
