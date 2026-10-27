# Issue #91 読み返す画面（今の詳細画面を置き換える）

## 背景・目的

人に勧める前に、自分の感想を 30 秒で思い出せる「読み返す画面」（`RereadScreen`）を作る。書影が主役の今の詳細画面（`RecordDetailScreen`）を置き換える。

データ（`oneLiner` / `starters` / `quotes` / `memos` / `freeTexts` / `favorite` / `rating`）は #84、書き出しの続きを書く画面（`WriteScreen`、入口の `onWrite`）は #89 で main にある。デザインは `docs/design-system/screens/README.md` の「読み返す」（`reread.png`）と、部品 `Starter`（読み返すときの組み方）・`Quote`・`MemoRow`・`RatingStars`。未リリースなので保存データの後方互換・移行は考えない（読めないときに落ちないことだけ守る）。

## スコープ

### やること
- 新しい `RereadScreen`（ルートは既存の `/records/[id]` を差し替える）。上: 戻る・「編集」、タイトル（明朝・控えめ）、「作者 · 読んだ期間」。ひとこと（「」付き・一番大きく）、星・数字・言葉とお気に入りの印、書き出しの続き・引用・自由に書いた文章（書いた順）、メモ（ページ順）、本棚（タップで本棚を選ぶシート）、「書き出しの続きを書く」の入口。
- 何も書いていない本では「書き出しの続きを書く」への案内を出し、`WriteScreen` へ進める。
- 本棚の画面（`(tabs)/index`）は読んでる本以外（読み終えた・読みたい・途中でやめた）をタップしたらこの画面へ（現状の遷移先 `/records/<id>` のまま。画面の中身が変わる）。
- 今の詳細画面と、それだけが使う部品・関数を外す: `RecordDetailScreen`、`InfoCell`、`RecordInfoSection`、`infoCellLabels`、`recordInfo`、`heroColor`（他から使われていないことを `grep` で確認してから削除。使われていれば残す）と、それぞれのテスト。
- 純粋関数 `lib/reread.ts`（読んだ期間・時系列の並び・本文が空かどうか）。部品 `StarterText`（書き出し＋続きの一続き表示）、`RereadEntry` 相当は `RereadScreen` 内でよい。

### やらないこと
- `tokens.ts` / `docs/design-system/` の変更、新しい依存の追加（**なし**）。
- 保存データ（`MediaRecord`）の型変更。
- 記録の編集フォーム（`RecordForm`、削除・写真の扱いはそちらに既にある）の変更。
- 読んでる本の画面（`ReadingScreen`）、書き出しの続きを書く画面（`WriteScreen`）の変更。
- メモ・引用の編集（読み返す画面では表示のみ。編集は読んでる本の画面で行ってきたが、読み返す画面では行わない。判断ログ参照）。

## 受け入れ条件

### 表示の出し分け（`RereadScreen`、Jest）
- [ ] タイトルと、「作者 · 読んだ期間」を表示する。作者がなければ期間だけ、期間がなければ作者だけ、どちらもなければ行ごと出さない。
- [ ] `oneLiner` があるとき「`「<ひとこと>」`」を表示する。`null` や空白だけのときは出さない。
- [ ] `rating` があるとき星と数字と言葉（「4.2 よかった」。言葉は `getRatingWord`）を出す。`null` のときは星・数字・言葉を出さない。
- [ ] `favorite` のときだけ「お気に入り」の印を出す。
- [ ] 書き出しの続きは、書き出しの文と続きを**一続きの文章**として出す（同じ `AppText` の中に書き出し〈`ribbon`・太字〉と続きを入れ子で並べ、改行しない）。続きが空白だけのものは出さない。
- [ ] 引用は `Quote`（ページ・コメント付き）で出す。自由に書いた文章は書き出しなしの文章として出す。
- [ ] 書き出しの続き・引用・自由に書いた文章は `createdAt` の昇順（同じなら元の並び）に混ぜて出す。
- [ ] メモは「メモ」の見出しの下に `MemoRow` で出す。ページ順（ページなしは後ろ、同じなら `createdAt`）。メモが 0 件なら見出しごと出さない。
- [ ] ひとこと・星・お気に入り・書き出しの続き・引用・自由記述・メモは、それぞれあるときだけ出る（ない項目の見出しや空の枠を出さない）。
- [ ] 本棚の行（`SettingsRow`）に入っている本棚名（「、」区切り。なければ「まだ入れていません」）を出し、押すと `ShelfPickSheet` が開く。選んで送信すると `recordRepository.update` で `shelfIds` だけ変えて保存し、表示に反映する。保存失敗時はシート内にエラーを出す（`ShelfPickSheet` の既存の扱いに従う）。
- [ ] 「書き出しの続きを書く」の行（高さ 44 以上）を、`status === 'completed'` のとき常に出し、押すと `onWrite(id)`。completed 以外では出さない。
- [ ] 何も書いていない本（`oneLiner` なし・書き出しの続きなし・引用なし・自由記述なし・メモなし）では、案内「まだ何も書いていません。読み終えた直後の言葉を残しておくと、あとで人に勧めるときに助けになります」と主導線の「書き出しの続きを書く」ボタンを出す（completed のとき）。押すと `onWrite(id)`。completed 以外の本では案内を出さない。
- [ ] 「編集」で `onEdit(id)`、戻るで `onBack()`。
- [ ] 記録が見つからない・読み込み失敗のときは「本が見つかりません」と戻る手段を出し、落ちない。読み込み中は `accessibilityLabel="読み込み中"`。
- [ ] 画面に「評価」「問い」「お題」という言葉が出ない（`queryByText(/評価|問い|お題/)` が null。`accessibilityLabel` も確認）。
- [ ] フォーカスのたびに読み込み直す（書く画面から戻ったとき最新が出る）。

### ルート・置き換え（Jest）
- [ ] `/records/<id>` が `RereadScreen` を出し、「編集」→ `/record/<id>`（push）、「書き出しの続きを書く」→ `/write/<id>`（push）、戻る・削除後の行き先は従来どおり `/`（`replace`）。
- [ ] 本棚で読み終えた・読みたい・途中でやめた本をタップすると `/records/<id>` で読み返す画面が開く。読んでる本は `/reading/<id>` のまま。
- [ ] 振り返りのお気に入りの背表紙・「書き出しの続きを書く」の保存後の遷移先が `/records/<id>` の読み返す画面になる（`finished-write-route.test.tsx` `records-routes.test.tsx`）。
- [ ] 今の詳細画面が残っていない: `RecordDetailScreen.tsx` とそのテスト、`InfoCell`・`RecordInfoSection` などの専用部品が存在せず、`pnpm check` が通る。

### 純粋関数（Jest）
- [ ] `buildRereadEntries(record)` が書き出しの続き・引用・自由記述を時系列に並べた配列を返す（空の続き・空の文章は除く）。
- [ ] `buildRereadPeriod(record)` が `startDate`・`endDate` から「2026/10/1–10/20」の形を返す（同じ日は「2026/10/20」、片方だけなら「2026/10/1 から」「2026/10/20」、両方なしは `null`、年が違う終了日は「2025/12/28–2026/1/3」）。
- [ ] `hasRereadContent(record)` が上記の「何も書いていない」を判定する。

## 画面・振る舞い

### 画面構成（`reread.png`）
上から（スクロールは全体。下に固定のボタンは置かない）:
1. 上の行: 戻る「‹」（`accessibilityLabel="戻る"`、44 以上）と、右に「編集」。`useTopInset` を考慮（`ReadingScreen` と同じ作り）。
2. タイトル（`bookTitle` 相当の明朝、`textSecondary`）、「作者 · 期間」（`label`、`textSecondary`）。
3. ひとこと（`oneLine`、「」付き、`textPrimary`）。
4. 星（`RatingStars`、数字・言葉つき）と、右に「お気に入り」の印（`ribbon` の枠のピル）。
5. 区切り線（`line`）。以降、書き出しの続き（書き出しは `starter` の `ribbon`、続きは `reading` の明朝。罫線付き: 各行の下に `line` を引く見た目は、`reread.png` に合わせて文章の下罫線 1 本まででよい。判断ログ）、引用（`Quote`）、自由記述（`reading` の明朝）を書いた順に。
6. 区切り線、「メモ」（`label`、`textSecondary`）と `MemoRow`。
7. 本棚の行、「書き出しの続きを書く」の行（completed のみ）。何も書いていない本では 3〜6 の代わりに案内とボタン。
8. 下の余白に `useBottomInset`。

### 状態
`record`、`loading`、`shelfOpen`。`useFocusEffect` で `repository.getAll()` から読む（今の詳細画面と同じ作り。失敗は空配列扱いで「本が見つかりません」）。本棚の保存だけ `repository.update`。

### エラー時
読み込み失敗は「見つからない」と同じ表示。本棚の保存失敗は `ShelfPickSheet` の仕組みでシート内に出す（画面は落とさない）。

## 設計

### 追加するファイル
- `src/screens/RereadScreen.tsx`
- `src/components/StarterText.tsx` … props: `starter: string`、`text: string`。`AppText variant="reading"` の中に `AppText variant="starter"`（`ribbon`）を入れ子にして一続きに組む。`accessibilityLabel` は書き出しと続きをつないだ文。
- `src/lib/reread.ts` … `buildRereadEntries`（`type RereadEntry = { kind: 'starter' | 'quote' | 'free'; entry }` の union）、`buildRereadPeriod`、`hasRereadContent`。メモの並びは既存 `buildNoteItems` を使わずメモだけ並べる必要があるため、`lib/notes.ts` に `sortMemos(memos)` を切り出し（`buildNoteItems` からも使う）。日付は `lib/date.ts` の `parseDateParts`。
- テスト: `lib/__tests__/reread.test.ts`、`components/__tests__/StarterText.test.tsx`、`screens/__tests__/RereadScreen.test.tsx`。

### 変更するファイル
- `src/app/records/[id].tsx` … `RereadScreen` を使う（ヘッダーなし）。props は従来どおり。
- `src/lib/notes.ts` … `sortMemos` を export。
- `src/__tests__/records-routes.test.tsx` ほかルートのテスト … 新しい画面の文言に合わせて更新（詳細画面専用の文言に依存している箇所）。

### 削除するファイル（ほかで使われていないことを確認して）
`src/screens/RecordDetailScreen.tsx`、`src/screens/__tests__/RecordDetailScreen.test.tsx`、`src/components/InfoCell.tsx`（+ test）、`src/components/RecordInfoSection.tsx`、`src/lib/infoCellLabels.ts`（+ test）、`src/lib/recordInfo.ts`（+ test）、`src/lib/heroColor.ts`（+ test）、ほか `grep` で参照が `RecordDetailScreen` だけになったもの（`DeleteConfirmSheet` は `RecordForm` が使うので残す）。`needsCover` / `useCoverResolver` は検索系画面が使うので残す。テストファイルを削除するときは対応するソースも同じ PR で削除する（`pr-policy`）。

### 状態管理・データ
React の state のみ。**新しい依存はなし**。データ構造の変更なし。

### 既存部品の使い方
`RatingStars`（`valueVariant="displayNumber"` はやめ、数字と言葉の見た目は `reread.png` の「4.2 よかった」に合わせる。既存の props で足りなければ `RatingStars` の呼び出し側で数字・言葉を並べる）、`Quote`、`MemoRow`、`SettingsRow`、`ShelfPickSheet`、`useShelfPick`、`Button`、`AppText`、`Chip` 風のピルは `StyleSheet` で組む（新しい色は足さない）。

## テスト方針
- 純粋関数・並び: `reread.test.ts`（期間の各形、時系列、空の除外、メモ順、何も書いていない判定）。
- 一続きの組み方: `StarterText.test.tsx`（書き出しと続きが 1 つの `Text` に入る）。
- `RereadScreen.test.tsx`: インメモリ storage の本物のリポジトリで、各要素が「あるときだけ」出ること、星・言葉・お気に入り、時系列、メモ順、案内（completed / それ以外）、`onWrite` `onEdit` `onBack`、本棚の選択と保存、見つからない、禁止語、フォーカスでの再読み込み。
- ルートテスト: `/records/<id>` への遷移（本棚・振り返り・書き終えたあと）、編集・書く画面への push。
- 見た目の撮影ツールは使えない前提。表示要素・文言・出し分けを Jest で確認し、PR にその旨を書く。
- 削除したファイルの分、テスト数が減るため、PR 本文の判断ログに「詳細画面専用のため対応するソースごと削除」と書く。

## 判断ログ

- **ルートは `/records/[id]` のまま中身を差し替える**: 選んだ案＝パスを変えず `RereadScreen` を出す。却下＝`/reread/[id]` を新設して古いルートを消す（#89 の遷移先、本棚、振り返り、テストなど参照が多く、利点が名前だけ）。Issue の「今の詳細画面へのルートが残っていない」は、旧画面への配線が残らないことと解釈。
- **メモ・引用は読み返す画面では表示のみ**: `reread.png` に編集の導線がなく、「30 秒で思い出す」ための画面。編集は「編集」（記録の編集フォーム）と、読んでる本の画面で足りる。却下＝タップで `NoteSheet` を開く（`onPress` つきの `Quote`/`MemoRow` を使えば可能だが、読み終えた本の言葉を安易に変える導線になる。必要なら別 Issue）。
- **写真の変更・本の削除の導線は外す**: 書影が主役でなくなり写真は使わない（design の「書影は使わない」）。削除と写真は `RecordForm`（編集）に既にある。
- **メモのページ順は `lib/notes.ts` の並びと同じ規則**（ページ数字昇順、ページなしは後ろ、同じなら `createdAt`）。`sortMemos` を切り出して共有し、並びのルールを二重に持たない。
- **罫線付きの組み方**: `reread.png` は各行の下に細い線がある（便箋風）。RN の `Text` では行ごとの線を安定して引けないため、実装は文章ブロックの下に 1 本の `line` の罫線とする。行ごとの罫線が必要なら人間に提案（デザイン上の提案）。
- **「お気に入り」の印**: デザインシステムに専用部品がないため、既存トークン（`ribbon` の枠・角丸・`label`）で `StyleSheet` に組む。専用部品が必要なら人間に追加を提案する。
- **何も書いていない本の判定**は `oneLiner`・`starters`・`quotes`・`freeTexts`・`memos` のすべてが空。評価だけ付いている本も「何も書いていない」扱いで案内を出す（星は上に出る）。案内は completed のときだけ（読みたい・途中でやめた本に「書き出しの続き」を促さない）。
- **期間の表記**: `reread.png` の「2026/10/1–10/20」に合わせ、開始年を付け、終了が別年のときだけ終了にも年を付ける。同じ日は 1 つだけ。
- **「書き出しの続きを書く」の行は、書いてある本でも常に出す**（Issue どおり「あとから足す入口」）。何も書いていないときは行ではなくボタンで目立たせる（同じ `onWrite`）。
