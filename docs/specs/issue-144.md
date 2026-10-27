# Issue #144 タイトル検索の作者が「村上, 春樹, 1949-」の形のまま入る

## 背景・目的

タイトルで探す（NDL サーチ）の候補は、`parseNdlResponse` が最初の `dc:creator`（または `author`）をそのまま `BookCandidate.author` にしている。NDL の典拠形式（「姓, 名, 生年-」）のまま一覧の行（`BookSearchRow`）と記録フォーム（`candidateParams` の `creator`）に入る。ふだんの書き方（「村上春樹」）にそろえる。共著は先頭 1 人しか取れていない点も直す。

## スコープ

### やること
- 作者名の整形関数 `normalizeAuthor` / `normalizeAuthors` を `src/lib/authorName.ts` に追加する
- `parseNdlResponse` で、全ての `dc:creator`（なければ `author`）を整形して `author` にする
- openBD（ISBN 検索）の `summary.author` にも同じ整形を通す（判断ログ参照）

### やらないこと
- 型（`BookCandidate` / `BookInfo`）の変更。`author` は `string | null` のまま
- 候補の並べ替え（`rankCandidates`）、検索ロジック、見た目の変更
- すでに保存済みの記録の作者の書き換え
- 読み仮名の付与、同姓同名の判別

## 受け入れ条件

- [ ] `normalizeAuthor('村上, 春樹, 1949-')` → `村上春樹`（姓名のカンマを詰め、生年を除く）
- [ ] 生年・没年の除去: `夏目, 漱石, 1867-1916` → `夏目漱石`、`1949-` / `1867-1916` / `1949-2020` の形を除く
- [ ] `村上春樹 著`、`村上春樹／著`、`村上春樹/著`、`ハルキ／訳`（役割語 著・編・訳・監修・原作・絵・画・写真・イラスト・編著・共著・監訳）は役割語を除く。複数の役割（`A／著 B／訳`）は 1 人ずつに分けて整形する
- [ ] `姓／名` ではなく役割区切りの `／` と区別する: 役割語が続かない `／` は区切りとして扱わない（そのまま残す）
- [ ] 日本語（かな・漢字を含む）の「姓, 名」は連結（`劉, 慈欣` → `劉慈欣`）、`姓 名`（空白区切り）は空白を除く（`村上 春樹` → `村上春樹`）
- [ ] ラテン文字のみの「Family, Given」は「Given Family」に並べ替える（`Liu, Cixin` → `Cixin Liu`）。カンマのないラテン文字名（`Stephen King`）はそのまま
- [ ] 空文字・空白のみ・整形後に空になるものは `null`
- [ ] `normalizeAuthors(['村上, 春樹, 1949-', '村上春樹 著'])` → `村上春樹`（整形後に同じものは 1 つにする）。複数人は `、` でつなぐ（`A、B`）
- [ ] `parseNdlResponse`: `dc:creator` が複数あるとき全員を `、` でつないだ `author` になる。実データの形（`村上, 春樹` と `村上春樹 著`）で `村上春樹`
- [ ] `parseNdlResponse`: `dc:creator` がなく `<author>` だけあるとき、`<author>` の値を整形する（`著者1 著` → `著者1`）
- [ ] `OpenBdProvider`: `summary.author` が `村上春樹／著 〇〇／訳` なら `村上春樹、〇〇` になる
- [ ] 一覧の行（`BookSearchRow`）と記録フォームの初期値（`creator`）が整形後の作者になる（既存の画面テストの期待値更新で確認）

## 画面・振る舞い

画面構成は変えない。一覧の行は「村上春樹 · 講談社 · 1987」と出て、「このタイトルで記録」で開くフォームの作者欄も「村上春樹」が入る。整形できない（空）の場合は従来どおり作者なし（`null`）。

## 設計

変更ファイル:
- `app/src/lib/authorName.ts`（新規）: 次を export する。
  - `normalizeAuthor(raw: string): string | null`
  - `normalizeAuthors(raws: string[]): string | null`
- `app/src/lib/bookSearch/ndl/parseNdlResponse.ts`: `extractAuthor` を、`dc:creator` の全テキストを `normalizeAuthors` に渡す形に変える。なければ `author` を 1 件として渡す。
- `app/src/lib/bookLookup/OpenBdProvider.ts`: `author: optionalText(summary.author)` を `normalizeAuthors` 経由にする（文字列でなければ `null`）。
- テスト: `src/lib/__tests__/authorName.test.ts`（新規）、`parseNdlResponse.test.ts` / `OpenBdProvider.test.ts` / 関連画面テストの期待値更新。

`normalizeAuthor` の手順（上から順に）:
1. 前後の空白を除く。空なら `null`
2. 役割語を分ける: 正規表現で `(区切り)(役割語)` を境に 1 人ずつに分ける。単独の `normalizeAuthor` は「1 人分」を受け取る前提で、役割分割は `normalizeAuthors` が行う（`／` `/` `、` 区切り + 役割語、または末尾の ` 著` など）。具体的な分割は実装担当がテスト駆動で決めてよいが、上の受け入れ条件の入力例は全て満たすこと
3. 末尾の生年・没年 `,?\s*\d{4}-(\d{4})?` を除く
4. カンマで分けて姓・名にする。日本語を含めば連結、ラテン文字のみなら `Given Family` の順にする
5. 日本語を含む名前の中の空白（全角含む）を除く

ライブラリの追加はなし。

## テスト方針

- 整形の各規則（姓名・生年・役割語・外国名・空・重複・複数人）→ `authorName.test.ts`
- NDL の実応答の形（受け入れ条件の `dc:creator` 複数、`author` のみ）→ `parseNdlResponse.test.ts`
- openBD の「〇〇／著 〇〇／訳」→ `OpenBdProvider.test.ts`
- 行の表示・フォーム初期値 → 既存の `BookSearchRow.test.tsx` / `TitleSearchScreen.test.tsx` の期待値更新
- 変更行は全て上のテストで実行されるため、差分カバレッジ 80% を満たせる

## 判断ログ

| 論点 | 選んだ案 | 却下した案 | 理由 |
|---|---|---|---|
| 整形の置き場所 | 共通の `lib/authorName.ts` を NDL・openBD の両方から使う | NDL パーサ内だけで整形 | openBD も「〇〇／著」で同じ問題があり、考え方をそろえられる |
| 「姓, 名」の日本語 | 連結（村上春樹） | 空白で残す（村上 春樹） | Issue の期待例が「村上春樹」。ふだんの書き方 |
| 外国人著者（Liu, Cixin） | ラテン文字のみなら `Cixin Liu` に並べ替え | `Liu, Cixin` のまま / `Liu Cixin` | 日本の書籍では名・姓の順で書くことが多く、読み手にとって自然。カンマ有無でラテン名の書き方がばらつくのを防ぐ |
| 外国人の漢字名 | 日本語と同じく連結（劉慈欣） | 並べ替え | 漢字名は姓名順・連結が一般的 |
| 「姓／名」 | `／` は役割語（著・訳…）が続くときだけ区切り。それ以外は触らない | `／` を常に姓名区切りとして連結 | NDL・openBD では `／` は「著」「訳」の前の区切りとして出るため。誤判定で別人を連結するリスクを避ける |
| 共著 | 全員を `、` でつなぐ。整形後に同じ名前は 1 つ | 先頭 1 人のみ（現状） | Issue の例。NDL は同じ人が「村上, 春樹」と「村上春樹 著」で重複して出るため重複除去が必要 |
| 役割語 | 除去（著・訳なども） | 残す | 「作者」欄に入る値として不要。翻訳者も `、` でつなぐ（作者欄にいると探しやすい） |
| 型の変更 | しない（`author` は文字列のまま） | 配列にする | 影響範囲が大きく、画面は 1 行表示のみ |
| 保存済み記録 | 書き換えない | 移行する | スコープ外。新規の取り込みから直る |
