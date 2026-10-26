# Issue #5 ISBN 入力で書誌情報を取得（openBD）

## 背景・目的

本・漫画は ISBN を入力するだけでタイトルや著者が入るようにして、記録の手間を減らす。書誌情報は openBD API（`GET https://api.openbd.jp/v1/get?isbn=<ISBN>`）から取得し、#3 で作った記録フォームに初期値として渡す。
将来、別 API への切り替えや追加（#7 のタイトル検索など）をしても、変更が「実装クラス」と「Provider を登録する 1 か所」で済むよう、取得処理はアプリ共通のインターフェースの背後に置く。依存: #3（フォームの初期値受け取り。`/record/new` が route params から `initialValues` を作る仕組みは実装済み）。

## スコープ

### やること
- ISBN の正規化・チェックディジット検証・ISBN-10 → ISBN-13 変換（純粋関数）
- 書誌情報の共通型 `BookInfo` と、ISBN で取得するインターフェース `BookLookupProvider`
- openBD の実装 `OpenBdProvider`（fetch、タイムアウト、レスポンスの型ガード、`summary` → `BookInfo` 変換）
- 「ISBN で探す」画面（`/record/isbn`）: 入力 → 取得 → 記録フォーム（`/record/new`）へ初期値付きで遷移
- 見つからない・通信エラー時のメッセージと、再試行 / 手入力への導線
- Provider を差し込む context / hook と、既定の Provider を登録する 1 か所
- 記録一覧に「ISBN で探して追加」ボタンを追加

### やらないこと
- バーコード読み取り、タイトル検索（別 Issue）
- 書影画像の端末への保存、書影の表示（URL を保持するだけ。表示・プレースホルダーは #4 以降の一覧/詳細で扱う）
- 取得結果のキャッシュ、複数 Provider の同時利用・フォールバック（インターフェースと登録箇所だけ拡張しやすくしておく）

## 受け入れ条件

### ISBN の正規化・検証（`lib/isbn.ts`）
- [ ] ハイフン・空白（全角空白・全角数字・全角ハイフンも）を無視して正規化する（例: `978-4-06-519981-7` → `9784065199817`）
- [ ] ISBN-13（`978`/`979` 始まり、チェックディジット正）を受け付ける
- [ ] ISBN-10（末尾 `X` / `x` 可、チェックディジット正）を受け付け、ISBN-13 に変換した値を返す（例: `4-06-519981-X` 形式の有効な ISBN-10 → 対応する 13 桁）
- [ ] 桁数が 10/13 以外、数字以外を含む、チェックディジット不正、`978`/`979` 以外で始まる 13 桁、は無効（`null`）

### 書誌情報の取得（`OpenBdProvider`。fetch をモック）
- [ ] 正規化後の ISBN-13 で `https://api.openbd.jp/v1/get?isbn=<ISBN-13>` を GET する
- [ ] 見つかった場合、`summary` の `title` `author` `publisher` `isbn` `cover` を `BookInfo`（`title` / `author` / `publisher` / `isbn` / `coverUrl`）に変換して `{ status: 'found', book }` を返す
- [ ] `cover` が空文字・欠落のとき `coverUrl: null`。`author` / `publisher` が空文字・欠落のときも `null`。`summary.isbn` が空のときは問い合わせた ISBN-13 を使う
- [ ] レスポンスが `[null]`（または空配列）のとき `{ status: 'not_found' }` を返す
- [ ] HTTP エラー（`ok: false`）、JSON 不正・想定外の形（`summary.title` が文字列でない等）、fetch の reject、タイムアウト（10 秒）のとき `{ status: 'error' }` を返す（例外は投げない）

### 「ISBN で探す」画面（偽 Provider を差し込んでテスト）
- [ ] ISBN 入力欄と「探す」ボタンがある
- [ ] 無効な ISBN（桁数・チェックディジット不正）で「探す」を押すと「ISBN を正しく入力してください（10 桁または 13 桁）」を表示し、Provider は呼ばれない
- [ ] 有効な ISBN（ハイフン付き・ISBN-10 を含む）で「探す」を押すと、Provider が ISBN-13 で 1 回呼ばれる
- [ ] 取得中はローディング表示になり、「探す」ボタンは無効化される。連打しても Provider は 1 回しか呼ばれない
- [ ] 見つかったとき、`router.replace` で `/record/new` に `kind=book`・`title`・`creator`（= author）・`publisher`・`isbn`・`coverUrl`（あれば）を params として渡して遷移する
- [ ] 見つからないとき「見つかりませんでした」を表示し、「手入力で続ける」で `/record/new` に `kind=book`・`isbn`（正規化済み ISBN-13）だけ渡して遷移できる
- [ ] エラー時は「書誌情報を取得できませんでした。通信状況を確認してください」を表示し、「再試行」で同じ ISBN で再度 Provider を呼べる。「手入力で続ける」でも遷移できる
- [ ] 入力を編集するとエラー表示・結果表示は消える

### フォームへの反映
- [ ] 取得結果を params で受けた `/record/new` のフォームに、種別「本」・タイトル・作者・出版社・ISBN が入力済みで表示され、種別は変更できる。`coverUrl` は表示されないが保存時の `NewRecordInput.coverUrl` に含まれる（#3 の機能。ルート経由の結合テストで確認）
- [ ] `coverUrl` が無い場合は `null` で保存される

### 導線・構成
- [ ] 記録一覧に「ISBN で探して追加」ボタンがあり、押すと `/record/isbn` に遷移する（既存の「追加」は従来どおり `/record/new`）
- [ ] 画面・hook・フォームは `BookLookupProvider` インターフェースだけに依存し、openBD の URL・レスポンス型・変換は `OpenBdProvider` のファイルの外に出ない
- [ ] 既定の Provider の登録は 1 か所（`lib/bookLookup/index.ts` の `createDefaultBookLookupProvider`）だけ

## 画面・振る舞い

### 記録一覧
「追加」の隣（下）に「ISBN で探して追加」ボタン。→ `router.push('/record/isbn')`。

### ISBN で探す（`/record/isbn`、スタック画面、ヘッダ「ISBN で探す」）
上から: 説明文「ISBN（10 桁または 13 桁）を入力してください」、ISBN 入力欄（`accessibilityLabel="ISBN"`、`number-pad`）、「探す」ボタン、結果/エラー表示領域、「手入力で続ける」リンクボタン（常時表示。ISBN が入力済みで有効なら ISBN を引き継ぐ）。

状態: `idle` → `loading` → `idle`（遷移成功時は画面ごと置き換え）/ `not_found` / `error` / `invalid`。
- `invalid`: クライアント検証失敗。API は呼ばない。入力欄の下に赤字
- `loading`: ボタンに `ActivityIndicator`、ボタンと入力欄を無効化。実行中フラグ（ref）でも二重実行を防ぐ
- `not_found`: 「見つかりませんでした」＋「手入力で続ける」を強調表示（ISBN を引き継ぐ）
- `error`: エラー文＋「再試行」ボタン＋「手入力で続ける」
- 成功: `router.replace`（戻るで ISBN 画面に戻らず一覧に戻る。フォームを保存/戻ると一覧）
- アンマウント後の結果は無視する（`active` フラグ）

## 設計

### 追加・変更するファイル（すべて `app/` 配下）

| ファイル | 内容 |
|---|---|
| `src/types/book.ts` | `BookInfo = { isbn: string; title: string; author: string \| null; publisher: string \| null; coverUrl: string \| null }`、`BookLookupResult = { status: 'found'; book: BookInfo } \| { status: 'not_found' } \| { status: 'error' }` |
| `src/lib/isbn.ts` | `normalizeIsbn(input): string`（空白・ハイフン除去、全角→半角、`x`→`X`）、`toIsbn13(input): string \| null`（検証 + ISBN-10 変換。無効なら `null`） |
| `src/lib/bookLookup/BookLookupProvider.ts` | `interface BookLookupProvider { lookupByIsbn(isbn13: string): Promise<BookLookupResult> }` |
| `src/lib/bookLookup/OpenBdProvider.ts` | `class OpenBdProvider implements BookLookupProvider`。コンストラクタで `fetchFn`（既定 `globalThis.fetch`）・`timeoutMs`（既定 10000）を受ける。`AbortController` でタイムアウト。レスポンスは `unknown` で受けて型ガード（`any` 不使用）。URL・レスポンス型・`summary` 変換はこのファイルに閉じる |
| `src/lib/bookLookup/index.ts` | `createDefaultBookLookupProvider(): BookLookupProvider`（現状 `new OpenBdProvider()`）。**Provider 登録の唯一の場所** |
| `src/hooks/useBookLookup.tsx` | `BookLookupContextProvider`（prop `provider?`、既定 `createDefaultBookLookupProvider()` を `useMemo`）と `useBookLookup(): BookLookupProvider`。`useRecordRepository` と同じ作り |
| `src/lib/isbnLookupParams.ts` | `bookInfoToParams(book): Record<string,string>`（`kind: 'book'` 付き、null は省略）、`isbnOnlyParams(isbn)` — `/record/new` の params 形式（#3 の `paramsToInitialValues` と対応）を 1 か所にまとめる |
| `src/screens/IsbnLookupScreen.tsx` | 上記画面。`useBookLookup()` と `router.replace` を使用 |
| `src/app/record/isbn.tsx` | 薄いルート（default export は Expo Router の例外。#2/#3 と同じ） |
| `src/app/_layout.tsx`（変更） | `BookLookupContextProvider` で包む。Stack に `record/isbn`（ヘッダ「ISBN で探す」）を追加 |
| `src/screens/RecordsScreen.tsx`（変更） | 「ISBN で探して追加」ボタン |
| `src/lib/recordForm.ts`（変更なし想定） | `paramsToInitialValues` は `kind/title/creator/publisher/isbn/coverUrl` に対応済み。そのまま使う |

### 状態管理・データ
- 画面内の `useState`（入力値・状態）のみ。ライブラリ追加なし。永続化なし（`BookInfo` は記録フォームの `NewRecordInput` に変換されて #3 の仕組みで保存される: `author → creator`、`coverUrl → coverUrl`）。
- 画面間の受け渡しは route params（文字列）。`BookInfo` をグローバルに保持しない。
- ISBN-10 → 13: 先頭に `978` を付け、先頭 9 桁で EAN-13 のチェックディジット（重み 1,3 交互）を再計算。

### 追加する依存
**なし**。HTTP は標準の `fetch`、タイムアウトは `AbortController`、遷移は導入済みの `expo-router`、画面は React Native 標準コンポーネント。

## テスト方針

| 受け入れ条件 | テスト |
|---|---|
| ISBN 正規化・検証・変換（全角、ハイフン、X、桁数、チェックディジット、978/979 以外） | `src/lib/__tests__/isbn.test.ts` |
| OpenBdProvider（URL、found の変換、cover/author/publisher 空、`summary.isbn` 空の代替、`[null]`、空配列、`ok:false`、不正 JSON・型不一致、reject、タイムアウト（`jest.useFakeTimers` + abort に反応する偽 fetch）） | `src/lib/bookLookup/__tests__/OpenBdProvider.test.ts`（`fetchFn` を注入） |
| params 変換 | `src/lib/__tests__/isbnLookupParams.test.ts` |
| ISBN 画面（無効入力、Provider 呼び出し回数と引数、ローディング・二重送信防止、found→`router.replace` の引数、not_found、error→再試行、手入力で続ける、入力変更でエラー消去） | `src/screens/__tests__/IsbnLookupScreen.test.tsx`（偽 Provider を `BookLookupContextProvider` で注入、`expo-router` は `jest.mock`） |
| 一覧のボタン導線 | `src/screens/__tests__/RecordsScreen.test.tsx` に追加 |
| フォームへの反映・保存（ルート経由） | `src/__tests__/tabs.test.tsx` に統合ケース（`renderRouter`、偽 Provider・インメモリ Repository）。難しい場合は `RecordFormScreen` に `initialValues` を渡す既存テスト + `paramsToInitialValues` のテストで代替し判断ログに残す |
| Provider のインターフェース依存 | 画面テストが偽 Provider だけで通ること自体で確認 |

差分カバレッジ 80% のため、`OpenBdProvider` / `isbn.ts` / 画面の分岐は網羅する。jest・eslint・tsconfig・CI 設定は変更しない。

## 判断ログ

1. **ISBN 検索は独立した画面 `/record/isbn` とし、成功時に `router.replace('/record/new', params)` で記録フォームへ進める**
   - 却下: `/record/new` のフォーム内に検索欄を埋め込む（フォームが肥大化し、#6・#7 の入口も同じフォームに増えていく。検索結果を「初期値」として渡す Issue の主旨とも合わない）。却下: 検索結果をグローバル state / context 経由で渡す（route params は #3 で既に用意済みで、状態の持ち回りが不要）。
   - `replace` の理由: 保存後・戻る操作で ISBN 入力画面に戻らず一覧に戻れる。
2. **導線は一覧に別ボタン「ISBN で探して追加」を置く**（Issue の「追加時に『ISBN で探す』を選び」を、追加の選択肢として並べる形で解釈）。却下: 「追加」押下後に選択ダイアログ/シートを出す（タップが増え、Alert のボタンはテスト・見た目とも貧弱）。#6・#7 でボタンが増える場合は、そのとき「追加」の選択画面にまとめる想定。
3. **インターフェース名は `BookLookupProvider`、メソッドは `lookupByIsbn(isbn13)`、戻り値は判別共用体 `BookLookupResult`（found / not_found / error）**。Issue の例に合わせる。例外ではなく結果型にしたのは、「見つからない」と「通信エラー」で画面の振る舞いが異なり、呼び出し側の分岐漏れを型で防ぐため。却下: 例外で表現（画面側で try/catch と種類判別が必要）、`null` 返却（not_found と error を区別できない）。#7 のタイトル検索は別メソッド/別インターフェースで追加できる。
4. **Provider は引数に正規化済みの ISBN-13 を受ける**。正規化・検証・変換は Provider 共通の関心事なので `lib/isbn.ts` に置き、画面側で行う（API 実装ごとに重複させない）。
5. **React の context で Provider を注入し、既定の登録は `lib/bookLookup/index.ts` の 1 か所**（`useRecordRepository` と同じ慣習）。将来の切り替え・追加はそのファイルと実装クラスの変更で済む。
6. **タイムアウトは 10 秒**（Issue に値の指定なし。モバイル回線で十分かつ待たせすぎない値として推測）。`AbortController` で中断し `error` 扱い。
7. **`summary.isbn` が空のときは問い合わせた ISBN-13 を採用**。openBD の `summary.isbn` は通常入っているが、欠落時にフォームの ISBN が空になるのを避ける。`title` が文字列でない/空のレスポンスは異常として `error`（タイトルは記録の必須項目で、空では初期値の意味がない）。
8. **見つからない・エラー時の「手入力で続ける」は `kind=book` と有効な ISBN-13 のみを引き継ぐ**（Issue: 「ISBN を入力済みにした手入力フォームに進める」）。ISBN が無効なまま「手入力で続ける」を押した場合は ISBN なしで `kind=book` のフォームへ。
9. **種別の初期値は `book`**（Issue のとおり。フォーム上で漫画などに変更可能）。openBD は種別を判別できないため。
10. **書影の表示は行わず URL 保持のみ**（Issue「やらないこと」。表示とプレースホルダーは書影を見せる画面を作る #4 側）。
11. **エラー文言は推測で決定**: 「ISBN を正しく入力してください（10 桁または 13 桁）」「見つかりませんでした」「書誌情報を取得できませんでした。通信状況を確認してください」「再試行」「手入力で続ける」。
12. **追加依存なし**。HTTP クライアントのライブラリは入れず `fetch` を使う（却下: axios 等。単純な GET 1 本で、Jest でのモックも `fetchFn` 注入で足りる）。
13. **CLAUDE.md・jest 設定・CI 設定の変更は不要と判断**。
