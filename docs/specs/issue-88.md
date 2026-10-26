# Issue #88 読んでる本の画面と、メモ・引用を書くシート

## 背景・目的

読んでいる途中の本の画面（`ReadingScreen`）を作り、読みながら（またはドッグイヤーを辿って）短いメモと引用を残せるようにする。データ（`MediaRecord.memos` / `quotes`、`MemoEntry` / `QuoteEntry`、型ガード `isMemoEntry` / `isQuoteEntry`）は #84 で用意済み。本棚の画面・背表紙（`Spine`）は #85 で用意済み。デザインは `docs/design-system/screens/README.md` の「読んでる本」「メモ・引用を書く」（`reading.png`、`note-sheet.png`）、部品 `MemoRow`・`Quote`・`BottomSheet`。未リリースのため保存データの後方互換・移行は考えない（読めないときに落ちないことだけ守る）。

## スコープ

### やること
- 読んでる本の画面 `ReadingScreen`（新ルート `/reading/[id]`）。背表紙、「読んでる · <M/D> から」（`ribbon`）、タイトル、「作者 · 本棚」、右上「編集」、「メモと引用」＋件数、メモ（`MemoRow`）と引用（`Quote`）をページ順に並べる、「＋ メモ・引用を書く」（点線ボタン）、下に固定の主ボタン「読み終えた」。
- メモ・引用を書くシート `NoteSheet`（`BottomSheet`）。メモ／引用の切り替え、ページ（任意）、本文、引用のときだけひとこと（任意）、主ボタン「残す」。閉じても書きかけは下書きとして残す。
- メモ・引用をタップすると同じシートが編集モードで開き、保存・削除できる。
- 本棚の画面で `status === 'in_progress'` の本をタップしたら `/reading/[id]` へ。それ以外は今までどおり `/records/[id]`。
- 「読み終えた」: #89 が未実装のため、ステータスを `completed`・`endDate` を今日にして保存し、`/records/[id]`（今の詳細）へ置き換え遷移する。
- 部品 `MemoRow` / `Quote`（`components/`）、純粋関数 `lib/notes.ts`、下書きの保存 `lib/noteDraftStore.ts`。

### やらないこと
- 読み終えた画面と書き出し（#89）。読み返す画面の作り直し。
- `RecordDetailScreen` の変更（`/records/[id]` はそのまま。メモ・引用の表示は #89 以降）。
- `tokens.ts` / `docs/design-system/` の変更、新しい依存の追加（なし）。

## 受け入れ条件

### 並び順・整形（`lib/notes.ts`、Jest）
- [ ] `buildNoteItems(record)` は `memos` と `quotes` を 1 つのリスト（`{ kind: 'memo' | 'quote', entry }`）にし、ページ順に並べる。ページは先頭の数字を読み取って昇順（「88」「p.88」「12-15」は 88 / 88 / 12）。数字を読み取れないページ・ページなし（null / 空）は最後に置き、同じグループ内は `createdAt` の昇順（書いた順。同時刻は配列の順）。
- [ ] `normalizePage(input)` は前後の空白を除き、空なら null。10 文字を超える入力は 10 文字までで切る（入力欄でも `maxLength={10}`）。
- [ ] `addNote` / `updateNote` / `removeNote`（`record` と入力を受けて `NewRecordInput` を返す。ほかの項目は変えない）。本文は前後の空白を除き、空なら追加・保存できない（呼ぶ側で「残す」を `disabled` にする）。引用のひとことは空なら null。メモ↔引用の種類を編集で切り替えると、元のエントリを消して新しい種類で追加する（`id` と `createdAt` は引き継ぐ）。

### 読んでる本の画面（`ReadingScreen`）
- [ ] 背表紙（`Spine`）、「読んでる · <M/D> から」（`startDate` があるとき。無ければ「読んでる」だけ）、タイトル、「作者 · 本棚名」（作者なしは本棚名だけ、本棚なしは作者だけ、両方なしは行ごと出さない。本棚名は「、」でつなぐ）、「編集」ボタン（`/record/[id]` へ）を表示する。
- [ ] 「メモと引用」の見出しと件数（「4 件」）。0 件のときは件数を「0 件」とし、「まだ何もありません。気づいたことを、ひとこと残してみませんか」を出す。
- [ ] メモは `MemoRow`（左にページ「p.88」、無ければ「—」、右に本文）、引用は `Quote`（左に `ribbon` の線 2px、明朝、下にページ「p.142」、ひとことがあれば本文の下に出す）。見た目と構造が違うことをテストで確認する（引用は `testID="quote-line"` の線がある・メモにはない）。
- [ ] 記録が見つからない・読み込み失敗のときは「本が見つかりません」と戻る手段を出し、落ちない。`in_progress` 以外の記録を開いても、そのまま画面は表示する（ルートで振り分けるため通常は来ない）。ただしその場合「読み終えた」は出さない。
- [ ] 画面に戻るたび（`useFocusEffect`）記録を読み直す。
- [ ] 下に固定の「読み終えた」を押すと、`status: 'completed'`、`endDate` = 今日（`todayString()`）、ほかは変えずに `recordRepository.update` で保存し、`onFinished(id)` を呼ぶ（ルートは `/records/[id]` へ `replace`）。開始日が未設定のままでも変えない。保存失敗は「保存できませんでした。もう一度お試しください」を出して遷移しない。
- [ ] 戻る（`onBack`）。ルートでは本棚の画面（`/`）へ。

### メモ・引用を書くシート（`NoteSheet`）
- [ ] 上に本のタイトルと「閉じる」。「メモ」「引用」の切り替え（`accessibilityRole="tab"`、`selected`）。初期は「メモ」。
- [ ] ページ（任意）の入力欄（ラベル「ページ」、`placeholder`「なくても大丈夫」、数字キーボード）。
- [ ] 本文: メモのときは UI の書体、引用のときは左に `ribbon` の線（`testID="quote-line"`）を付けた明朝の入力欄。引用のときだけ「ひとこと（任意）」の入力欄を出す。
- [ ] 本文が空（空白だけ含む）のあいだ「残す」は `disabled`。押すと `onSubmit({ kind, page, text, comment })` を呼び、成功したら入力を空にして閉じる。保存失敗は「保存できませんでした。もう一度お試しください」をシート内に出して閉じず、入力は残す。
- [ ] 追加すると画面の一覧に即反映され、ページ順に並ぶ（ページなしは最後、書いた順）。

### 下書き
- [ ] 書きかけ（種類・ページ・本文・ひとこと のどれかが空でない）でシートを閉じる（「閉じる」・背景タップ・スワイプ）と、記録 ID ごとに下書きを保存する（`noteDraftStore`、`KeyValueStorage`、キー `noteDraft.v1.<recordId>`）。保存しない: すべて空のとき（保存済みの下書きは消す）。
- [ ] シートを開き直すと、下書きの内容が入力欄に復元される。画面を離れて戻っても（アプリの再起動も）残る。
- [ ] 「残す」が成功したら下書きを消す。編集モード（既存のメモ・引用の編集）では下書きを読まず・書かない。
- [ ] 下書きの読み込み・保存の失敗や壊れたデータでは落ちず、空の入力欄で開く。

### 編集・削除
- [ ] 一覧のメモ・引用をタップすると、同じ `NoteSheet` が編集モード（見出し「メモを直す」「引用を直す」、初期値は今の内容、主ボタン「保存する」）で開く。保存すると一覧が更新され、並び順も更新後のページで再計算される。
- [ ] 編集モードには「削除」（`danger` の文字ボタン）があり、押すと確認「このメモを削除しますか？」（引用は「この引用を…」）→「削除する」で消える。「キャンセル」では何も変わらない（`DeleteConfirmSheet` の作りに倣う）。削除・保存の失敗は画面を落とさず、シートにエラー文言（保存「保存できませんでした。もう一度お試しください」、削除「削除できませんでした。もう一度お試しください」）を出す。
- [ ] 追加・編集・削除でほかの項目（タイトル・ステータス・`shelfIds` など）は変わらない。

### 本棚の画面からの導線
- [ ] 本棚の画面（タブ `index`）で、読んでる本の背表紙をタップすると `/reading/<id>` を開く。読んでる以外（読みたい・読み終わった・途中でやめた）は `/records/<id>`。

## 画面・振る舞い

### 読んでる本
上から: ヘッダー（戻る・「編集」）、背表紙（中央、棚板付きの小さな表示）、「読んでる · 10/18 から」（`ribbon`、`label`）、タイトル（`book-title`）、「作者 · 本棚」（`label`・`text-secondary`）、区切り線、「メモと引用」（`sectionTitle`）と件数、一覧、「＋ メモ・引用を書く」（`lineStrong` の点線枠、高さ 44 以上）。下に固定の主ボタン「読み終えた」（`bottomInset` を考慮）。スクロールするのは本文部分のみ。

### 状態
`record: MediaRecord | null`、`loading`、`sheet: { mode: 'new' } | { mode: 'edit', kind, id } | null`、`deleteTarget`、エラー文言。保存は常に `recordRepository.update(id, input)` で行い、成功した戻り値で `record` を置き換える（再読み込みしない）。

### シート
`BottomSheet`（`title` = 本のタイトル、`showCloseButton`）。メモ／引用の切り替え（`StatusTabs` と同じ下線のタブでなく、`Chip` 部品の見た目の 2 択）、ページ、本文（複数行、最小 4 行）、引用のときひとこと、「残す」。エラーは「残す」の上に `danger` で出す。キーボードで隠れないよう `KeyboardAvoidingView` の既存の使い方（`RecordForm` など）に合わせる。

## 設計

### 追加するファイル
- `src/lib/notes.ts`（`buildNoteItems` `normalizePage` `addNote` `updateNote` `removeNote`、`NoteDraft` 型）
- `src/lib/noteDraftStore.ts`（`createNoteDraftStore(storage)`: `load(recordId)` / `save(recordId, draft)` / `clear(recordId)`。`sortOrderStore` と同じ作り。値は型ガードで検証する）
- `src/hooks/useNoteDraftStore.tsx`（既存の `useSettings` / `useFileService` と同じ context 方式。`testProviders.tsx` にも差し込む。Provider は `_layout.tsx` に追加する。`storage` は既存のものを使う）
- `src/components/MemoRow.tsx` `src/components/Quote.tsx` `src/components/NoteSheet.tsx`
- `src/screens/ReadingScreen.tsx`
- `src/app/reading/[id].tsx`（ヘッダーなし。`onEdit` → `/record/[id]`、`onFinished` → `router.replace('/records/<id>')`、`onBack` → `router.replace('/')`）
- テスト: `lib/__tests__/notes.test.ts` `lib/__tests__/noteDraftStore.test.ts` `components/__tests__/{MemoRow,Quote,NoteSheet}.test.tsx` `screens/__tests__/ReadingScreen.test.tsx` `src/__tests__/reading-route.test.tsx`

### 変更するファイル
- `src/app/(tabs)/index.tsx` … `onOpen` を `(record)` 受けにするか、`RecordsScreen` の `onOpen` を `(id, status)` にして、`in_progress` なら `/reading/<id>` へ。変更は `RecordsScreen` の `onOpen(record.id)` → `onOpen(record)`（`MediaRecord` を渡す）とし、既存テストを更新する。
- `src/app/_layout.tsx`（Provider 追加）、`src/testProviders.tsx`。

### 状態管理・データ
React の state と context のみ。ライブラリ追加なし。データ構造の変更なし（`MemoEntry` / `QuoteEntry` のまま）。`id` は `recordRepository` と同じ生成方法（`Date.now()` 36 進 + 乱数）を `lib/notes.ts` に `generateId` として注入可能にして持つ（テストでは固定）。`createdAt` は `new Date().toISOString()`（注入可能）。`NoteDraft = { kind: 'memo' | 'quote'; page: string; text: string; comment: string }`。

## テスト方針
- 並び順・追加・編集・削除・種類切り替え・ページ正規化: `notes.test.ts`（純粋関数）。
- 下書きの保存・復元・破損データ・失敗: `noteDraftStore.test.ts`。
- シートの入力・タブ・引用の線・「残す」の disabled・エラー表示・閉じたときの下書き保存・開き直しで復元・成功で消去: `NoteSheet.test.tsx`。
- 画面の表示（背表紙・開始日・作者 · 本棚・件数・空状態・メモと引用の区別）、追加してページ順に並ぶ、編集・削除（確認シート・キャンセル）、「読み終えた」の保存内容と遷移・失敗、読み込み失敗: `ReadingScreen.test.tsx`（インメモリ storage の本物のリポジトリを使う）。
- 導線: `RecordsScreen` と `(tabs)/index` のテストで、読んでる本→`/reading/<id>`、ほかは `/records/<id>`。`reading-route.test.tsx` でルートの遷移。
- 見た目の撮影ツールは使えない前提。表示要素・文言・状態ごとの出し分けを Jest で確認し、PR にその旨を書く。

## 判断ログ

- **下書きの保存先**: 選んだ案＝記録 ID ごとに `KeyValueStorage` へ保存（再起動後も残る）。却下＝画面の state だけで持つ（画面を離れると消え、「閉じても残す」の趣旨を満たさない）／`MediaRecord` に下書きのフィールドを足す（バックアップに混ざり、型・検証・CSV の変更が広がる）。
- **下書きは 1 記録につき 1 つ**: 複数の下書きは管理の画面が要るため持たない。編集モードでは下書きを使わず、新規追加のときだけ使う。
- **一覧は 1 つのリストにまとめてページ順**: Issue の「メモと引用（ページ順）」に合わせ、種類ごとに分けない。ページは先頭の数字で比較し、「12-15」のような範囲や「p.88」にも対応する。数字のないページ（「あとがき」など）はページなしと同じく最後。却下＝文字列比較（「9」が「88」より後ろになる）。
- **ページは文字列のまま保存**: 既存の型（`page: string | null`）と「ドッグイヤー：112, 140, 155」のような自由な書き方を守るため。
- **「読み終えた」**: #89 まではステータスと終了日を更新して `/records/[id]` へ `replace`。#89 では遷移先を差し替えるだけで済むよう `onFinished` props にした。開始日が未設定でも補完しない（既存 `applyStatusChange` は開始日を補うのは読んでるへ変えるときだけで、完了時は終了日のみのため）。評価・感想は求めない（#89）。
- **導線の判定は `RecordsScreen` の呼び出し側**: 振り分けは `(tabs)/index.tsx`（ルート）で行い、画面は `onOpen(record)` を呼ぶだけにする。却下＝`/records/[id]` 側で `in_progress` ならリダイレクト（二重に画面が積まれ、戻るが不自然）。
- **ルートは `/reading/[id]`**: 既存の `/records/[id]`（詳細）と並べ、#89 で読み返す画面が `/records/[id]` を置き換えやすい。
- **`RecordDetailScreen` は変更しない**: スコープ外（#89 以降）。メモ・引用がそこに出ないのは暫定。
- **種類の切り替えを編集でも許す**: 書き間違い（メモのつもりが引用）を直せるように。`id` と `createdAt` を引き継ぎ、書いた順を保つ。
- **ひとことの扱い**: 引用のみ。メモに切り替えるとひとことは破棄する（シートに出ないため）。
- **デザイン上の提案**: メモ／引用の切り替えに専用部品がないため `Chip` の選択状態の見た目を使う。専用部品（セグメント）が必要なら人間にトークン・部品の追加を提案する。
- **削除の確認は `NoteSheet` の中**（実装時の判断）: 確認を別シートにすると `Modal` が二重になるため、同じシートの中身を確認表示に切り替える（文言と「キャンセル」「削除する」は `DeleteConfirmSheet` に倣う）。`ReadingScreen` に `deleteTarget` の state は持たない。
- **`KeyboardAvoidingView`**（実装時の判断）: 既存コードに使用例がなかったため、iOS のみ `behavior="padding"` で `NoteSheet` の中身を包み、`ScrollView` に入れた。
- **ページ表示**: 数字で始まるページだけ「p.」を付け、「あとがき」などはそのまま出す（`formatPage`）。
- **メモ↔引用のタブ**: `Chip` 部品は `radio` ロールのため使えず、同じ見た目の Pressable（`accessibilityRole="tab"`）を `NoteSheet` に置いた。
