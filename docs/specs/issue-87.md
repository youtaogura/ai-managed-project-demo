# Issue #87 本の追加と登録・編集のフォームを書斎のデザインにする

## 背景・目的

本の追加（追加シート・バーコード・ISBN・タイトル検索）と、本の登録・編集のフォームを書斎のデザインに作り替える。デザインは `docs/design-system/screens/README.md` の「本を追加」「バーコード」「タイトルで探す」「本を登録・編集」（`add-sheet.png` `scan.png` `title-search.png` `book-form.png`）と、部品 `Spine` `Chip` `TextField` `Button` `BottomSheet`。感想・評価・写真はフォームで扱わず（読み終えたときと読み返す画面で扱う）、本の情報・背表紙の色・本棚に絞る。依存の #84（データ）・#85（背表紙の棚）は main に入っている。未リリースのため保存データの後方互換・移行は考えない（読めないときに落ちないことだけ守る）。

## スコープ

### やること
- 追加シート（`AddSheet`）: 見出し「本を追加する」、4 つの入口（バーコードを読み取る＝墨の主ボタン、タイトルで探す、ISBN を入力する、手で入力する）。各行に説明文を添える。
- `BarcodeScanScreen` `IsbnLookupScreen` `TitleSearchScreen`（と `NotFoundCard` `LookupSkeletonCard`）の見た目を書斎のトークンに合わせる。**流れ・状態・文言の出し分けは今のまま**。検索結果の行（`BookSearchRow`）は書影の代わりに小さな背表紙（幅 22px）にする。
- 本の登録・編集フォーム（`RecordForm`）の作り替え:
  - 上: 背表紙のプレビューと「背表紙の色」（`spine-1`〜`spine-10` の 10 色の丸）。
  - タイトル（必須・明朝）、作者、出版社、ISBN、ステータス（`Chip` 単一選択）、読み始めた日・読み終えた日、本棚（`Chip` 複数選択）。
  - 感想・評価・写真の欄は出さない。
  - 下に固定: 追加は「棚に並べる」、編集は「保存する」。編集のときだけ「この本を削除」（`danger` の文字ボタン）。
- 背表紙の色を保存できるようにする（`NewRecordInput` に任意の `spineColor`、リポジトリの `add`/`update`）。
- 取得した書誌情報（タイトル・作者・出版社・ISBN）が入った状態で開く流れは今どおり。

### やらないこと
- 書誌情報の取得元の変更。
- 本棚（タグ）の作成シート（#86 は未完了）。フォームの「＋ 本棚を作る」は、`onCreateShelf` が渡されたときだけ出す口を用意し、画面からはつながない（#86 でつなぐ）。
- 読んでる本・読み返す画面の作り直し（`RecordDetailScreen` は今のまま。写真・評価の機能もそのまま動く）。
- `src/design/tokens.ts` と `docs/design-system/` の変更。新しい依存の追加（なし）。

## 受け入れ条件

### 追加シート
- [ ] 見出し「本を追加する」。4 つの行（「バーコードを読み取る」「タイトルで探す」「ISBN を入力する」「手で入力する」）が出る。
- [ ] 各入口を押すと `onSelect` に `scan` / `search` / `isbn` / `manual` が渡り、`useAddSheet` でそれぞれ `/record/scan` `/record/search` `/record/isbn`、手入力は `onAdd`（`/record/new`）へ進む。
- [ ] 「バーコードを読み取る」だけ墨（`accent`）の面・`accentInk` の文字。ほかは `surface2` 相当の面と `lineStrong` の枠。

### 背表紙の色
- [ ] フォームの上に背表紙のプレビューが出る。タイトルを入力するとプレビューのタイトルが変わる。
- [ ] 「背表紙の色」に 10 色の丸が並ぶ。各丸は `accessibilityRole="radio"`、ラベル「背表紙の色 1」〜「10」、選択中は `accessibilityState.selected`。タップ領域は `size.touchMin` 以上。
- [ ] 色を押すと、プレビューの背表紙の面の色が `colors.spineN` に変わる。
- [ ] 追加の初期値は「既存の記録数 n に対する `spineColorForIndex(n)`」。編集の初期値は記録の `spineColor`。
- [ ] 保存すると選んだ色が記録の `spineColor` に保存される（追加・編集とも）。色を選ばず保存した追加は初期値の色、編集は元の色のまま。

### フォーム
- [ ] 感想・評価・写真の欄（「写真」「レーティング」「評価」）が出ない。
- [ ] タイトルが空（空白のみ含む）で「棚に並べる」「保存する」を押すと保存されず、タイトル欄の下に「タイトルを入力してください」が出る（`onSubmit` は呼ばれない）。入力すると消える。
- [ ] 見出しは「タイトル（必須）」。タイトル欄は明朝（`reading`）。出版社・ISBN は 2 列に並ぶ。
- [ ] ステータスは 4 つのチップ（読みたい・読んでる・途中でやめた・読み終わった）の単一選択（`accessibilityRole="radio"`）。ステータスを変えたときの日付の自動入力（`applyStatusChange`）は今のまま。
- [ ] 日付の入力・日付ピッカー・検証（形式、終了日が開始日以降）は今のまま。
- [ ] 「本棚」にチップが本棚の数だけ出る（複数選択、`accessibilityRole="checkbox"`）。選んだ本棚が保存時に `shelfIds` に入る。編集では元の `shelfIds` が選択済みで開く。本棚が 0 件のときはチップの代わりに「本棚はまだありません」。「「すべての本」にはいつも入ります」を添える。`onCreateShelf` を渡したときだけ点線の「＋ 本棚を作る」が出て、押すと呼ばれる。
- [ ] 実在しない本棚 ID（削除済み）が `shelfIds` に残っている記録を編集しても落ちず、保存時にその ID は落とす。
- [ ] 下に固定のボタン: 新規は「棚に並べる」、編集は「保存する」。保存中はボタンが無効で「処理中」のインジケーター。保存失敗で「保存に失敗しました」。
- [ ] 編集のときだけ一番下に「この本を削除」。押すと既存の削除確認シート、確定で削除、失敗で「削除に失敗しました」。削除した本に写真があれば、写真ファイルも消す。
- [ ] 編集で保存しても、フォームが扱わない値（評価・写真・書影 URL・ひとこと・書き出し・引用・メモ・自由記述・お気に入り）が消えない。
- [ ] バーコード・ISBN・タイトル検索から来たときに、取得した値（タイトル・作者・出版社・ISBN）が入っている（今のテストが通る）。

### 検索結果・各画面
- [ ] `BookSearchRow` は小さな背表紙（幅 22px）を出す。色は候補のタイトルから決める（同じタイトルなら同じ色。純関数）。タイトル（明朝）、「作者 · 出版社 · 年」（`label`）、右に「›」。
- [ ] `TitleSearchScreen` の下に「見つからないので手で入力する」ボタンと国立国会図書館サーチのクレジットが出る（今あるものはそのまま。なければ追加）。
- [ ] バーコード・ISBN・タイトル検索の画面の状態・文言が変わらない（今のテストが通る）。色・余白・角丸はトークン経由。

### 外すもの
- [ ] `PhotoField` `RatingInput`（と、それだけで使われる `lib/recordForm.ts` の評価関連の関数）とそのテストを削除する。`photoUri` の機能（`PhotoService` `usePhotoPicker` `RecordDetailScreen` の写真変更）は**残す**（判断ログ参照）。

## 画面・振る舞い

### 追加シート
`BottomSheet`（既存）の中に縦 4 行。行の高さは 64 以上、角丸 `radius.button`、左に太字のタイトルと下に `label` の説明、右に「›」。説明: バーコード「本の裏のバーコードを映すだけ」、タイトル「タイトルや作者の名前から」、ISBN「10 桁または 13 桁の番号」、手で入力「見つからない本、同人誌など」。アクセシビリティラベルのうち「本をタイトルで探す」「本を手で入力する」は、表示文言に合わせて「タイトルで探す」「手で入力する」に直す（テストも合わせる）。

### 本の登録・編集フォーム（上から）
1. 背表紙プレビュー（左）と「背表紙の色」の 10 色の丸（右。折り返してよい）、下に「棚に並べたときの色。あとから変えられます」（`label`・`textTertiary`）。プレビューは `Spine` を流用（押しても何もしない）。大きさは本の ID 由来なので、追加では固定のプレビュー用 ID、編集では記録の ID を使う。
2. タイトル（必須・明朝）、作者。
3. 出版社・ISBN（2 列）。
4. ステータス（`ChipGroup` 単一選択）。
5. 読み始めた日・読み終えた日（2 列）とヒント。
6. 本棚（`Chip` 複数選択）と注記。
7. 編集のみ「この本を削除」。
下に固定のフッター（上に `line` の線、主ボタン、エラー・処理中）。`keyboardShouldPersistTaps="handled"` は今のまま。

### 状態・エラー
- 新規はスクリーンが `repository.getAll()` で記録数を取って初期色を決める（読み込み中は `ActivityIndicator`、失敗したら記録数 0 とみなして `spine-1`）。編集は今までどおり記録を読み込む（なければ「記録が見つかりません」）。
- 本棚は `useShelfRepository().getAll()` で読む。失敗したら空配列。
- 保存・削除の失敗表示は今のまま。

## 設計

### 変更・追加するファイル（`app/src/` 以下）
- `types/record.ts`: `NewRecordInput` を `Omit<MediaRecord, 'id'|'createdAt'|'updatedAt'|'spineColor'> & { spineColor?: SpineColor }` にする。
- `lib/recordRepository.ts`: `add` は `input.spineColor ?? spineColorForIndex(records.length)`、`update` は `input.spineColor ?? current.spineColor`。`lib/validation.ts` の `isValidRecordInput` が `spineColor`（あれば `SPINE_COLORS` に含まれること）を許す。
- `lib/recordForm.ts`:
  - `RecordFormValues` から `rating` `photoUri` を外し、`spineColor` と `shelfIds` を加える。`RecordFormErrors` から `rating` を外す。
  - `createFormValues(initial, defaultSpineColor)` — `initial.spineColor` → `defaultSpineColor` の順。
  - `toNewRecordInput(values, carried)` — `rating` `photoUri` `coverUrl` は `carried` から引き継ぐ。`spineColor` `shelfIds` はフォームの値。
  - 評価の関数（`parseRating` `stepRating` `ratingFromPosition` `starFills` `formatRating` `crossesInteger`、`ERROR_RATING`）は、他から使われていないものを削除する（`grep` で確認。使われているものは残す）。
- `lib/bookSpineColor.ts`（新規）: `spineColorForTitle(title): SpineColor`（文字コードの和から決める）。
- `components/RecordForm.tsx`: 上記の構成に作り替え。写真の後片付けのロジックは削除し、削除時だけ `initialValues.photoUri` を `photoService.remove`。props に `initialSpineColor`、`shelves?: readonly Shelf[]`、`onCreateShelf?: () => void`、`recordId?: string`（プレビューの大きさ用）を追加。
- `components/SpineColorPicker.tsx`（新規）: 10 色の丸、`value` `onChange`。
- `components/Spine.tsx`: プレビュー用に `record` の型を `Pick<MediaRecord, 'id'|'title'|'creator'|'status'|'favorite'|'spineColor'>` に緩める。`onPress` は任意にしてよい。
- `components/Chip.tsx`: 複数選択用（`checkbox`）が無ければ追加する。
- `components/AddSheet.tsx` `BookSearchRow.tsx`（`Cover` をやめ小さな背表紙にする。`Spine` に `width` を渡せるようにするか `MiniSpine` を新設） `NotFoundCard.tsx` `LookupSkeletonCard.tsx`: 見た目。
- `screens/RecordFormScreen.tsx`: 新規の初期色・本棚の読み込み、`RecordForm` への受け渡し。
- `screens/BarcodeScanScreen.tsx` `IsbnLookupScreen.tsx` `TitleSearchScreen.tsx`: 見た目をトークンに合わせる（ロジックは変えない）。
- `app/record/new.tsx` `[id].tsx` の画面タイトルを「本を登録」「本を編集」にする。
- 削除: `components/PhotoField.tsx` `components/RatingInput.tsx` とそのテスト。
- 環境変数・依存の追加なし。

### データ
`MediaRecord` は変更なし。フォームが保存するのは、title / creator / publisher / isbn / startDate / endDate / status / spineColor / shelfIds（と取得元 `source`）。

## テスト方針

| 受け入れ条件 | テスト |
| --- | --- |
| 追加シートの文言・4 入口・遷移 | `AddSheet.test.tsx`、`useAddSheet` を使う画面のテスト（既存を直す） |
| 色の選択・プレビュー・保存 | `SpineColorPicker.test.tsx`、`RecordForm.test.tsx`（色を押す→プレビューの面の色→`onSubmit` に `spineColor`）、`recordRepository.test.ts`、`validation.test.ts` |
| 初期色・編集の色 | `RecordFormScreen.test.tsx`（既存 n 件のとき `spineColorForIndex(n)`） |
| 評価・写真の欄がない | `RecordForm.test.tsx`（`queryBy…` が null） |
| タイトル必須のエラー | `RecordForm.test.tsx` |
| ステータス・日付・削除・保存失敗 | `RecordForm.test.tsx`（既存を移す） |
| 本棚チップ（複数選択・0 件・存在しない ID・`onCreateShelf`） | `RecordForm.test.tsx`、`RecordFormScreen.test.tsx` |
| 引き継ぎ | `recordForm.test.ts`（`toNewRecordInput`）、`RecordFormScreen.test.tsx` |
| 取得値が入って開く | `RecordFormScreen.test.tsx`・`screens.test.tsx`・各 Lookup 画面の既存テスト |
| 検索結果の背表紙 | `BookSearchRow.test.tsx`、`bookSpineColor.test.ts` |
| 各画面の状態・文言が変わらない | 既存の `BarcodeScanScreen` `IsbnLookupScreen` `TitleSearchScreen` のテスト |

撮影ツールは使えない前提で、PR 本文に「画像との見比べはしていない」と書き、表示される要素・文言・状態の出し分けを Jest で確認する。

## 判断ログ

- **写真の機能**: フォームから外すだけにし、`PhotoService` `usePhotoPicker` `RecordDetailScreen` の写真変更・`photoUri` のデータは残す。理由: 詳細画面は #88・#89 で作り直すため、そこで写真を使うか決める方が手戻りが少ない。却下: 写真機能を丸ごと削除（詳細画面・バックアップ・削除の後片付けに波及し、この Issue の範囲を超える）。フォームの `PhotoField` と一時コピーの後片付けは削除する。
- **背表紙の色の保存**: `NewRecordInput` に任意の `spineColor` を足す。却下: 保存後に別の更新で色だけ変える（二重書き込みで失敗時の整合が崩れる）。
- **新規の初期色**: 画面が記録数を読んで `spineColorForIndex(n)` を渡す。リポジトリ側の割り当ては「色が無いとき」の保険として残す。却下: フォーム内で都度リポジトリを読む（責務が増える）。
- **「＋ 本棚を作る」**: #86 が未完了で作成シートが無いので、`onCreateShelf` が渡されたときだけ出す。画面からはつながない。却下: 押しても何も起きないチップを常に出す（紛らわしい）。
- **フォームで扱わない値の引き継ぎ**: 評価・写真・書影 URL・ひとこと・書き出しなどは `initialValues` から引き継ぐ。評価の入力欄を外しても既存の評価を消さないため。
- **評価の関数**: `RatingInput` と一緒に使われなくなるものだけ削除。
- **プレビューの大きさ**: 新規はまだ ID が無いので固定のプレビュー用 ID。保存後の棚での大きさと違ってよい（色とタイトルの確認が目的）。
- **検索結果の背表紙の色**: 本の情報にまだ色が無いので、タイトルから決める（見た目のみ。保存しない）。
- **アクセシビリティラベルの変更**: 追加シートのラベルを表示文言に合わせる。既存テストも更新する。
- **デザインの提案**: 追加シートの説明文・色の丸は既存トークンで組めるので、トークンの追加は不要。
