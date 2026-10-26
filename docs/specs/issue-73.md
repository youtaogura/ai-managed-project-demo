# Issue #73 アプリの環境変数の見本（app/.env.example）を作り、使っている環境変数をすべて載せる

## 背景・目的

アプリが読む環境変数（`EXPO_PUBLIC_*`）の見本がなく、設定漏れで機能が黙って無効になる（例: TMDb キー未設定だと映画・ドラマ・アニメの検索が出ない）。`app/.env.example` を作り、使っている変数をすべて載せる。コードと見本のずれは Jest で検出する。

### 現状（コード上の事実）
- `app/src/` 内の `process.env.*` 参照（テスト除く）は 2 つだけ:
  - `src/hooks/useMediaSearch.tsx`: `EXPO_PUBLIC_TMDB_API_KEY`（未設定なら TMDb 系の検索を出さない。#63）
  - `src/app/_layout.tsx`: `EXPO_PUBLIC_PREVIEW_INSETS`（`上,右,下,左` の px。未設定・不正値なら何もしない。#28）
- `app.json` / `eas.json` に環境変数の参照はない。`app.config.*` は存在しない。
- `app/.gitignore` は `.env` を無視済み（`.env.example` はコミットされる）。`app/README.md` は存在しない。
- ルートの `.env.example` はオーケストレーター用で変更しない。

## スコープ

### やること
1. `app/.env.example` を新規作成し、上記 2 変数を載せる。
2. `app/README.md` を新規作成し、`.env.example` → `.env` のコピー手順などを書く。
3. 「コードが参照する `EXPO_PUBLIC_*` がすべて `.env.example` に載っている」ことを検査する Jest テストを足す。

### やらないこと
- ルートの `.env.example` の変更、EAS への環境変数登録（人間が行う）
- 環境変数の名前変更、アプリの動作変更、アプリコードの変更
- 新しいライブラリの追加（**追加なし**）

## 受け入れ条件

### `app/.env.example`
- [ ] `src/` のコードが参照する `process.env.EXPO_PUBLIC_*` の名前がすべて、`KEY=` 形式（コメントアウトでない行）で載っている
- [ ] 各変数の直前にコメントがあり、用途・未設定のときの動き・取得方法・必須/任意・EAS に設定するか、を書いている
- [ ] 値はすべて空（`KEY=`）。値の後ろにコメントを書かない
- [ ] 実際のキーや秘密の値を含まない

### 一致検査テスト
- [ ] `src/` 配下（`__tests__` と `.d.ts` を除く）の `process.env.EXPO_PUBLIC_<NAME>` をすべて集め、`.env.example` に載っていなければ失敗する
- [ ] 逆方向: `.env.example` にあるが、コードで参照されていない変数があれば失敗する（古い見本を残さない）
- [ ] 検査ロジックは純関数（ソース文字列から変数名を抽出／`.env.example` から変数名と値を抽出）に切り出し、「載っていない変数がある」「余分な変数がある」「値が空でない」を検出できることを、ダミー入力でテストする（見本が正しくても検査自体の動作を確認するため）
- [ ] `.env.example` の全変数の値が空であることを検査する

### README
- [ ] `app/README.md` に、`cp .env.example .env` → 値を入れる、`.env` は git に入らないこと、EAS には人間が設定すること、変数を足したら `.env.example` にも書くこと、が書かれている

### 動作
- [ ] 既存のテストがすべて通る（アプリのコードは変更しない）

## 画面・振る舞い

UI の変更なし。実行時の挙動は変わらない。

## 設計

### 追加するファイル
| ファイル | 内容 |
|---|---|
| `app/.env.example` | 下記の内容 |
| `app/README.md` | 環境変数の設定手順（ほか、`pnpm check` 等の最小限の案内） |
| `app/src/lib/envExample.ts` | 純関数 `findEnvReferences(source: string): string[]`（`process.env.EXPO_PUBLIC_[A-Z0-9_]+` を重複なく抽出）、`parseEnvExample(text: string): { name: string; value: string }[]`（空行・`#` 始まりの行を除き `NAME=value` を分解） |
| `app/src/lib/__tests__/envExample.test.ts` | 純関数の単体テストと、実ファイルの一致検査 |

`app/src/lib/envExample.ts` は実行時のアプリでは使われないが、カバレッジ対象（`src/**`）なのでテストで 100% 実行する。実ファイルの検査は `fs` で `src/` を再帰的に走査し（`__dirname` 基準の相対パスで `app/` を解決）、`__tests__` ディレクトリと `.d.ts` を除外する。

### `app/.env.example` の内容

```
# アプリが読む環境変数。cp .env.example .env でコピーして値を入れる（.env は git に入らない）
# EXPO_PUBLIC_ 付きの値はアプリに埋め込まれて配布物から読めるため、秘密にしたい値は入れないこと
# 注意: 値の後ろに # コメントを書かないこと（値の一部として読まれる場合がある）

# TMDb の API キー（任意・本番ビルド（EAS）にも設定する）
# 用途: 映画・ドラマ・アニメのタイトル検索（#63）
# 未設定のとき: これらの検索を出さない（ほかの機能は動く）
# 取得: https://www.themoviedb.org/settings/api で API キー（v3）か API 読み取りアクセストークン（v4）を発行
EXPO_PUBLIC_TMDB_API_KEY=

# プレビュー用のセーフエリアの再現（任意・開発/撮影用。本番ビルド（EAS）には設定しない）
# 用途: Web プレビューで端末の上,右,下,左の余白(px)を再現する（#28）。例: 59,0,34,0
# 未設定・不正な値のとき: 何もしない（通常どおり端末の値を使う）
# 取得: 外部サービス不要。値は自分で決める
EXPO_PUBLIC_PREVIEW_INSETS=
```

### データ構造・依存
- 追加ライブラリなし。Node の `fs` / `path` はテスト内でのみ使う（`@types/node` が未導入で型エラーになる場合は、既存の jest 型設定で `fs` が解決できるか確認し、できなければ `fs` を使わず `jest` の `require` 経由ではなく `expo-file-system` に頼らず、`.env.example` の読み込みに `require('fs')` を型付きで包む。実装担当が `pnpm typecheck` で確認して判断し、判断ログに書く）。

## テスト方針

| 受け入れ条件 | テスト |
|---|---|
| コードの参照がすべて載っている / 余分な変数がない | `envExample.test.ts` の実ファイル検査（`src/` 走査 × `.env.example`） |
| 検査自体が欠落・余分・非空の値を検出する | 同ファイルの純関数テスト（ダミー文字列: 載っていない、コメントアウトのみ、値あり、行末コメント） |
| 値がすべて空 | 実ファイル検査 |
| README・各変数のコメント | 自動検査しない（レビューで確認）。ただし変数ごとに直前にコメント行があることだけテストで確認する |
| 動作が変わらない | 既存テストが `pnpm check` で通る |

## 判断ログ

| # | 論点 | 選んだ案 | 却下した案 | 理由 |
|---|---|---|---|---|
| 1 | 検査の方向 | コード→見本（Issue の要件）に加え、見本→コードも検査 | コード→見本のみ | 古い変数が見本に残るのを防げる。コストが小さい |
| 2 | 参照の抽出方法 | 正規表現で `process.env.EXPO_PUBLIC_*` を抽出（`src/` のテスト除外） | TypeScript AST、`process.env[name]` の動的参照も検出 | Expo は `process.env.EXPO_PUBLIC_X` の静的な式だけをビルド時に埋め込むため、静的な形だけを対象にすれば十分（CLAUDE.md / #63 の方針と同じ） |
| 3 | 対象のプレフィックス | `EXPO_PUBLIC_` のみ | すべての `process.env.*` | `NODE_ENV` など Expo/Jest が使うものまで見本に載せる必要はない。アプリが読む設定は `EXPO_PUBLIC_*` と CLAUDE.md が定めている |
| 4 | 純関数の置き場所 | `src/lib/envExample.ts` | テスト内にロジックを書く | CLAUDE.md の構成（ロジックは `src/lib/`）に合う。差分カバレッジの対象になるので単体テストを書く |
| 5 | `README.md` | `app/README.md` を新規作成（環境変数の手順中心） | ルート README に書く | Issue の指定。ルートはオーケストレーター向け |
| 6 | 値の例 | `.env.example` の値は空。例はコメントに書く | `59,0,34,0` を値に入れる | Issue の「値は空にする」に従う。空の `EXPO_PUBLIC_PREVIEW_INSETS=` は `parsePreviewInsets` で「未設定」と同じ扱い（不正値は何もしない）のため動作は変わらない。実装担当は空文字で挙動が変わらないことを確認し、変わるなら判断ログに書く |
| 7 | 提案 | なし | | CLAUDE.md・policy の変更は不要 |
