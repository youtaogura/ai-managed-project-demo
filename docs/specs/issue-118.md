# Issue #118 見た目を直す: 本棚を作る・本棚を選ぶ

## 背景・目的

本棚を作るシート（`ShelfCreateSheet`）と本棚を選ぶシート（`ShelfPickSheet`）が、`docs/design-system/screens/shelf-new.png` `shelf-pick.png` と違う。`cd app && pnpm shots -- shelf-new shelf-pick` で今の画面を撮り（`app/.screenshots/`）、デザイン画像と見比べて、違いを直す。画像と部品の README が食い違うときは部品の README を優先し、色・余白・角丸・文字は `design/tokens.ts` のトークンで直す。画像の本・作者・文章（サンプル）の違いは直さない。`BottomSheet` `TextField` `Chip` `Button` は共通部品なので、直す点は README との差に限る。

## スコープ

### やること

画像と今のコードの読み比べで見つけた差（実装担当は撮影して確かめ、下に無い差も Issue の「確認する項目」を1つずつ見て、見つけたら直す）。

**本棚を作る**

| 項目 | 今 | 直す方向 |
|---|---|---|
| 見出し | 「本棚を作る」（`sectionTitle`＝14px の Sans） | 画像は大きな明朝「新しい本棚を作る」。BottomSheet README「見出しは明朝（`screen-title` を 20px 程度に小さくしたもの。迷ったら `book-title` の大きさを下げる）」に合わせる。`BottomSheet` の `title` の書体を `typography.bookTitle` ベース（サイズ 20 程度、`lineHeight` 比を保つ）の明朝にする。他のシートの見出しも同じ部品を使うので変わる（撮って確認、PR に書く） |
| 文言 | 見出し「本棚を作る」 | 作成時の既定の見出しを「新しい本棚を作る」にする。名前の変更で使う `title` prop は呼び出し元のまま |
| シートの形・背景・取っ手 | 角丸 20（`radius.sheet` と同値、定数が別）、取っ手 `lineStrong` 36×4、`scrim` | README は取っ手を `line`。定数 `SHEET_RADIUS` を `radius.sheet` に置き換え、取っ手色を `line` に。取っ手の位置・上の余白は画像と比べて調整 |
| 名前の入力欄 | 常に Sans | 画像は明朝。`TextField` の `variant="reading"`（明朝）を使う（README の「本のタイトル…は明朝。それ以外は UI の書体」とは食い違うが、Issue の確認項目「名前の入力欄（明朝）」と画像を優先。判断ログ参照）。枠はフォーカス中 `text-primary` が README、現状 `accent`（同色 `#2b2620`）なので変更不要 |
| 例のチップ | 高さ 36・角丸 10・枠 `lineStrong`・文字 `label` | Chip README: 高さ 36、`radius.full`、枠 `line`、左右余白 14、文字 `value` に変える（画像の例は丸いチップ）。`hitSlop` で 44px 以上は維持 |
| 見出し「例」と間隔 | `label` の `textSecondary` | 入力欄→「例」→チップ→ボタンの間隔を画像に近づける（`space` トークン） |
| 同じ名前のとき | `TextField` の `error`（`micro`） | README は `label`・`danger`、枠も `danger`。`TextField` のエラー文字を `label` にする（`micro` 10.5px では小さい）。他の画面のエラー表示も変わるので撮って確認 |
| 主ボタン「作る」 | `Button` | 幅いっぱい・高さ 48 以上・墨の面。使えないとき（`busy`）の見た目は `Button` README の無効の表に合わせる。違えば `Button` を直す |

**本棚を選ぶ**

| 項目 | 今 | 直す方向 |
|---|---|---|
| 見出しまわり | 見出し「本棚を選ぶ」のみ | 画像は 上に本のタイトル（`label`・`textSecondary`、1行で省略）、見出し「どの本棚に入れる？」（明朝）、その下に説明「いくつでも選べます。「すべての本」にはいつも入ります。」（`label`）。`ShelfPickSheet` に `bookTitle?: string` を足し、あれば一番上に出す。`RereadScreen` と `RecordForm`（入力中の `values.title`。空なら出さない）が渡す。見出しは `BottomSheet` の `title` に渡す（`accessibilityLabel` が変わるので既存テストを更新） |
| 行 | 高さ 44、区切りなし、名前は Sans の `body` | 画像は 高さ約 52〜56、下に `line` の区切り線（最後の行の下にも線、その下に作る入口）、名前は明朝の太字（`typography.starter` 等の既存の明朝スタイルから、サイズが合うものを選ぶ。合わなければ判断ログに提案）、冊数は右端で `label`・`textSecondary` |
| 冊数の書き方 | `3 冊` | 画像は「12 冊」。今のまま（半角スペースあり）で一致 |
| チェック | 22px、角丸 `radius.thumb`(2)、選択中は `accent` の面、チェック記号 | 画像は 角丸 6〜8 の角丸四角（44px 画像で約 22px）、未選択の枠 `lineStrong`、選択中は墨の面に紙色の ✓。角丸を `radius` トークンに無い値（約 6）にしたい場合は定数にせず判断ログに提案し、トークンの `radius.thumb` か近いものを使う（実装時に画像と見比べて決める） |
| 新しい本棚を作る入口 | 全幅の点線ボタン「＋ 本棚を作る」 | 画像は 行の形（左に小さな点線の角丸四角に「＋」、右に「新しい本棚を作る」を `body`・`textSecondary`）。タップ領域は 44px 以上。`accessibilityLabel` は「本棚を作る」のまま（既存の振る舞い。撮影シーンも `{ label: '本棚を作る' }` に依存するため、`scenes.cjs` を変えない） |
| 主ボタン | `Button`（`N つの本棚に入れる`） | 文言は一致。位置・余白を画像に近づける（一覧→作る入口→ボタンの間隔を `space` で） |
| 本棚がまだ無いとき | 「まだ本棚がありません」＋作る入口 | 変えない（画像は無い状態）。見た目だけ上の部品に揃える |

### やらないこと

- `tokens.ts` / `docs/design-system/` / CI の変更。トークンに無い色・文字スタイルが要るときは判断ログに提案する
- ロジックの変更（選択・作成・保存・エラー・重複判定・並び順）。見た目と、見出し・説明の文言だけを変える
- 新しいライブラリ（**パッケージの追加なし**）
- 共通部品（`BottomSheet` `TextField` `Button` `Chip`）を直した結果、ほかの画面が変わる場合: 本棚以外の画面の意図しない変化は入れない。変わる画面（メモ・引用シート `note-sheet`、本を追加 `add-sheet`、本の登録 `book-form`、削除確認など `BottomSheet` を使うもの）を `pnpm shots` で撮って確かめ、PR 本文に書く

## 受け入れ条件

**本棚を作る**
- [ ] 本棚の画面の「＋ 本棚を作る」から開くと、見出し「新しい本棚を作る」、入力欄（ラベル「名前」）、例のチップ、「作る」ボタンが出る
- [ ] 例のチップを押すと名前の入力欄にその文言が入る。すでにある本棚名と同じ例は出ない（既存の振る舞い）
- [ ] すでにある名前で「作る」を押すと、入力欄の下にエラー文言が出て、`onSubmit` は呼ばれない（既存の振る舞い）
- [ ] 保存に失敗したらエラーが出て、シートは開いたまま、もう一度押せる
- [ ] 名前の変更（`title` `submitLabel` `initialName` を渡す使い方）では、渡した見出し・ボタン文言が出る
- [ ] 作る処理中は「作る」が押せない（`disabled`）

**本棚を選ぶ**
- [ ] `bookTitle` を渡すと、見出しの上に本のタイトルが出る。渡さない・空のときは出ない
- [ ] 見出し「どの本棚に入れる？」と説明「いくつでも選べます。「すべての本」にはいつも入ります。」が出る
- [ ] 各本棚の行に、名前・冊数（「N 冊」）・チェックボックス（role `checkbox`、`checked` の状態）が出る。行を押すと切り替わる
- [ ] 主ボタンの文言が 選択 0 件で「本棚に入れない」、N 件で「N つの本棚に入れる」。押すと `onSubmit` が選んだ ID を本棚の並び順で受け取り、成功したら閉じる。失敗したら「保存できませんでした」が出て開いたまま
- [ ] 入口「本棚を作る」（accessibilityLabel 同じ）から作成シートが開き、作った本棚が選択済みで一覧に出る
- [ ] 本棚が 0 件のとき「まだ本棚がありません」と作る入口だけが出て、主ボタンは出ない
- [ ] `RereadScreen` と `RecordForm` から開いたとき、本のタイトルが `bookTitle` として出る（`RecordForm` はタイトル未入力なら出ない）

**共通**
- [ ] `BottomSheet` の見出しがダイアログの `accessibilityLabel` として渡される（今のまま）。閉じる・スクリムタップ・スワイプの振る舞いは変わらない
- [ ] 撮り直した `shelf-new` `shelf-pick` を画像と見比べ、PR 本文に「確認する項目」（Issue 本文の全項目）について 一致 / 直した / 残した（理由）の表を書く
- [ ] `BottomSheet` `TextField` `Button` を使う他の画面（`note-sheet` `add-sheet` `book-form` ほか）を撮って、変わった点を PR 本文に書く
- [ ] `cd app && pnpm check` が通る

## 画面・振る舞い

- 本棚を作る: 暗い背景（`scrim`）の上に下から出るシート。取っ手、見出し（明朝）、「名前」ラベル＋入力欄（明朝）、「例」＋丸いチップ（折り返す）、「作る」ボタン。エラーは入力欄の下に赤（`danger`）で出て、入力を変えると消える。
- 本棚を選ぶ: 取っ手、本のタイトル（小さく）、見出し、説明、本棚の行（チェック・名前・冊数・区切り線）、「新しい本棚を作る」の行、主ボタン。保存エラーはボタンの上に `danger` で出る。
- 状態遷移・エラー時の振る舞いは変えない（見た目と文言だけ）。

## 設計

変更するファイル（すべて `app/src/`、`scripts` は変更なし）:
- `components/BottomSheet.tsx` — 見出しを明朝・約 20px に、取っ手色 `line`、`SHEET_RADIUS` を `radius.sheet` に。`title` はこれまでどおり `string`
- `components/ShelfCreateSheet.tsx` — 既定の `title` を「新しい本棚を作る」に、入力欄を明朝（`variant="reading"`）に、例のチップを Chip README に合わせる（定数 `EXAMPLE_RADIUS` を `radius.full` に）。既存の `Chip` が使えるなら使い、無理なら見た目だけ揃える（`Chip` は選択式なので、押すと入力に入る例のチップは別の `Pressable` のままでよい）
- `components/ShelfPickSheet.tsx` — `bookTitle?: string` の追加、見出し・説明、行の高さ・区切り・書体、チェックの形、作る入口の行
- `components/TextField.tsx` — エラー文字を `label`、必要ならエラー時の枠が `danger` のままであることを確認（今も `danger`）
- `components/Button.tsx` — 無効の見た目が README と違うときだけ
- `screens/RereadScreen.tsx` `components/RecordForm.tsx` — `bookTitle` を渡す
- テスト: 下の「テスト方針」

状態管理・データ構造の変更なし。`bookTitle` は表示専用の prop。

## テスト方針

| 受け入れ条件 | テスト |
|---|---|
| 本棚を作る: 見出し・入力欄・例・ボタン、例のチップで入力、重複エラー、失敗、変更の使い方、処理中 | `components/__tests__/ShelfCreateSheet.test.tsx`（既存を更新。既定の見出し文言） |
| 本棚を選ぶ: `bookTitle` の出し分け、見出し・説明、行（冊数・checkbox・checked）、主ボタン文言、成功・失敗、作る入口、本棚 0 件 | `components/__tests__/ShelfPickSheet.test.tsx`（既存を更新） |
| `RereadScreen` / `RecordForm` が `bookTitle` を渡す | `screens/__tests__/RereadScreen.test.tsx`、`components/__tests__/RecordForm.test.tsx`（シートを開いてタイトルが出る） |
| `BottomSheet` の見出しとダイアログの扱い、エラー文字 | 既存の `BottomSheet.test.tsx` `TextField.test.tsx` を壊さない（見出しの `accessibilityLabel`、エラー文言の表示） |

スタイルの数値（角丸・色・余白）だけを確かめるテストは足さない。変更行の差分カバレッジ 80% 以上を満たすよう、新しい分岐（`bookTitle` の有無、タイトル空）は上のテストで通す。

## 判断ログ

- **見出しを明朝にする場所**: `BottomSheet` の `title` を直す（呼び出し元ごとに書体を変えない）。BottomSheet README が「見出しは明朝」と書いているため、他のシートの見出しも変わるが README どおりなので許容し、撮って PR に書く。却下案: 本棚の 2 つのシートだけ見出しを別に描く（README と食い違う部品が残る）。
- **名前の入力欄を明朝にするか**: 明朝にする。TextField README は「本のタイトル・書き出し・引用は明朝、それ以外は UI の書体」だが、Issue の確認項目と画像が「名前の入力欄（明朝）」であり、本棚の名前は本と自分の言葉にあたると解釈。`variant="reading"` は 16px・明朝 600 で画像と近い。却下案: Sans のまま（画像と違う）、新しい variant（部品の拡張が過剰）。
- **例のチップ**: README の Chip（高さ 36・`radius.full`・枠 `line`・文字 `value`）に揃える。画像は丸い枠のチップで一致する。
- **エラー文字**: `micro` から `label` に。TextField README が `label`・`danger` と書いているため。
- **本のタイトルの出し方**: `bookTitle` を追加（表示専用）。却下案: `ShelfPickSheet` が `useRecords` で自分で引く（シートが画面の状態を知るのは過剰、テストも重い）。
- **説明文**: 画像の「いくつでも選べます。「すべての本」にはいつも入ります。」は画面固有の UI 文言なので画像どおりにする。今の「「すべての本」にはいつも入ります」は、本棚が 1 件以上のときの説明としてこの 1 文に置き換える。
- **作る入口の文言**: 見た目の文言は「新しい本棚を作る」、`accessibilityLabel` は「本棚を作る」のまま（既存テスト・撮影シーンの互換）。
- **書体・角丸が合うトークンが無いとき**: 新しい文字スタイル・角丸は作らず、既存の近いトークンを使い、提案をここに追記する（実装担当）。
- **冊数の書き方・「すべての本」の扱い**: 今のまま（「N 冊」、「すべての本」は一覧に出さない）。README と画像に一致。
