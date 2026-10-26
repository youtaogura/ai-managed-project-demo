# Issue #41 【画面】記録の追加・編集フォームを新デザインにする

## 背景・目的

「すぐ記録できる」がデザインの原則。追加・編集のフォームを、デザイン（`docs/design-system/screens/README.md` の「追加・編集」、`record-form-new.png` / `record-form-edit.png`）に合わせ、迷わず短時間で入力できる並びにする。#35〜#37 で土台と基本部品（`Button` `ChipGroup` `TextField` `DateFieldButton` `BottomSheet` `AppText` `TextCover`）が入った。

### 現状（コード上の事実）
- `components/RecordForm.tsx` が旧スタイル（`theme.ts` の `colors` / `formColors`、`SegmentedControl`、`DateField`、`RatingInput`、`PhotoField`）で全項目を縦に並べ、`ScrollView` の中に保存・削除ボタンがある。削除確認は `Alert.alert`。
- `screens/RecordFormScreen.tsx` が読み込み（編集）・保存・削除を担当。保存・削除後は `router.back()`。
- `lib/recordForm.ts` にフォーム値・検証（`validateForm`）・`applyStatusChange`（「読み終わった」等で終えた日が空なら今日）・`toNewRecordInput`（本・漫画以外では出版社・ISBN を `null` にして保存）がある。`lib/statusLabel.ts` にステータスの「読／見」切り替えがある。
- `RatingInput`（`value: string` / `error` / `onChange`）は #38（PR #47、未マージ）で新デザインに作り直される。**名前と props は変わらない**ので、本 Issue は `RatingInput` をそのまま使い、中身には触れない（#38 マージ前でも動く）。
- 日付選択のライブラリは未導入。詳細画面は `app/records/[id].tsx`、編集は `app/record/[id].tsx`、追加は `app/record/new.tsx`。
- 撮影ツール `orchestrator/tools/ui-preview` の有無は実装担当が再確認すること（この工程では確認できていない）。

## スコープ

### やること
1. `RecordForm` を新デザインで作り直す（並びは下記「画面・振る舞い」）。
2. `PhotoField` を新デザインにする（書影 112×168 + 説明文 + `Button`）。
3. 日付の選択を、`DateFieldButton` ＋ 日付選択シート（`DatePickerSheet`、「今日」「クリア」を含む）に置き換える。
4. 削除の確認を `Alert` から `DeleteConfirmSheet`（ボトムシート）に置き換える。**#40 と共通の部品**として作る（判断ログ参照）。
5. 日付・作者欄の見出しを種別で切り替える関数を `lib/statusLabel.ts` に追加する。
6. 保存後の遷移を変える（追加 → 詳細、編集 → 前の画面）。
7. 既存テストを新しい文言・操作に合わせて更新する（テスト数は減らさない）。

### やらないこと
- ヘッダー（戻る・タイトル）の見た目の変更（Stack のタイトル `記録を追加` / `記録を編集` は今のまま。ヘッダーは別 Issue）
- キーボード表示時のレイアウト調整
- 項目の追加・削除、データモデル・`toNewRecordInput` の仕様変更
- `RatingInput` / `RatingStars` の変更（#38）、詳細画面（#40）
- 新しいライブラリの追加（**追加なし**）、トークン・`docs/design-system/` の変更
- `SegmentedControl` `DateField` `Thumbnail` 等は、他から使われているうちは削除しない（未使用になったものだけ削除。ただし `__tests__` が減る場合は、そのテストが対象部品と一緒に消えるだけで、他のテストは減らさない）

## 受け入れ条件

### 種別・ステータス
- [ ] 種別は `ChipGroup`（5 つ・`radiogroup`、選択中のみ `checked`）。タイトルより上に出る
- [ ] ステータスは `ChipGroup`（2 列・4 つ）。ラベルは本・漫画で「読みたい／読んでる／途中でやめた／読み終わった」、映画・ドラマ・アニメで「見たい／見てる／途中でやめた／見終わった」
- [ ] 種別を変えると、ステータスのラベルと日付の見出しが切り替わる。日付の見出しは本・漫画が「読み始めた日／読み終えた日」、それ以外が「見始めた日／見終えた日」
- [ ] 作者欄の見出しは本・漫画が「作者・著者」、それ以外が「監督など」

### 入力欄
- [ ] タイトルは `TextField`（必須表示）。空のまま保存すると欄の下に「タイトルを入力してください」が出て、`repository.add` / `update` は呼ばれない。入力すると消える
- [ ] 出版社と ISBN（`variant="isbn"`）は本・漫画のときだけ表示。映画・ドラマ・アニメでは表示されない
- [ ] 出版社・ISBN に入力した後で映画等に切り替えても、保存される値は `null`（今の `toNewRecordInput` のまま）。本・漫画に戻すと入力済みの値が復活している
- [ ] 感想は `TextField` の `multiline`（「（任意）」付き、プレースホルダー「感じたことを自由に」）
- [ ] ISBN・バーコード・タイトル検索から来たとき（`initialValues`）は、取得した値が入った状態で開く（今と同じ）

### 日付
- [ ] 日付 2 つ（開始・終了）が横に並ぶ `DateFieldButton`。値は `YYYY/MM/DD` で表示、空なら「選択してください」。内部の値は今までどおり `YYYY-MM-DD`
- [ ] 押すと日付選択シートが開く。シートには年・月・日の増減操作、「今日」「クリア」「決定」（名前は実装で決めてよいが、すべて `button` で名前が取れる）がある。「今日」で今日の日付が入り、「クリア」で空になり、決定でフォームに反映してシートが閉じる
- [ ] 存在しない日付（2 月 30 日など）は選べない（日は月の末日にクランプ）
- [ ] 「読み終わった／見終わった」「途中でやめた」を選んだとき、終えた日が空なら今日が入り、入っていれば変わらない。「読んでる／見てる」で開始日が空なら今日（今の `applyStatusChange` のまま）
- [ ] 日付欄の下に「「読み終わった」を選ぶと、終えた日に今日が入ります」（種別に応じて「見終わった」）を `micro` で出す
- [ ] 終えた日が開始日より前なら、終えた日の欄にエラー（`ERROR_DATE_ORDER`）が出て保存されない

### 写真・書影
- [ ] 上部に書影 112×168。写真 → 書影 URL → 文字の表紙（`TextCover`、タイトル・作者を反映）の順に出す（今の `getThumbnailCandidates` の優先順を使う）
- [ ] 「カメラで撮影」「ライブラリから選択」は `Button`（枠）。`photoUri` があるときだけ「写真を削除」（`danger`）も出る
- [ ] 説明文: 書影を取得していて写真がないとき「書影を取得しました。自分で撮った写真に変えることもできます」。画像がまったくないとき「ポスターがないので、タイトルから表紙を作っています。写真を付けるとこちらに表示されます」。写真があるときは出さない
- [ ] 権限が拒否されたときのメッセージと「設定を開く」は今のまま動く（`PhotoField` の既存テストが通る）

### レーティング・保存・削除
- [ ] レーティングは `RatingInput` をそのまま使う。不正値のエラーは今と同じ
- [ ] 下に固定の主ボタン（スクロールの外）。追加は「記録する」、編集は「保存する」。保存中は無効（`accessibilityState.disabled`）で二重に押せない
- [ ] 保存失敗時は「保存に失敗しました」をボタンの上に出す
- [ ] 追加を保存すると `repository.add` が呼ばれ、保存した記録の詳細（`/records/<id>`）へ `router.replace` で移る。編集を保存すると `repository.update` が呼ばれ `router.back()`
- [ ] 編集のときだけ、いちばん下に「この記録を削除」（`danger` の枠ボタン）。押すと削除確認シートが開く。シートは「この記録を削除しますか？」「「<タイトル>」の記録と、付けた写真が削除されます。元に戻せません。」、「キャンセル」と「削除する」。キャンセル（シートを閉じる操作も同じ）では何も削除されない。「削除する」で `repository.delete` が呼ばれ、写真ファイルが消え、一覧（`/`）へ `router.replace`。失敗時は「削除に失敗しました」
- [ ] 記録が見つからない・読み込み中の表示は新デザインの色・文字（`AppText`、`colors`）にする。文言は今のまま
- [ ] 最後の項目（感想）より下に主ボタン領域があり、主ボタン領域の下端に `useBottomInset()` の余白が入る（ホームインジケータと重ならない）。スクロール内容の末尾には主ボタンの高さ分の余白は不要（ボタンはスクロールの外）

## 画面・振る舞い

並び（上から）: 書影＋説明＋写真ボタン（横並び）→ 種別 → タイトル → 作者 → 出版社 → ISBN（後ろ 2 つは本・漫画のみ）→ ステータス → 日付 2 つ＋ヒント → レーティング → 感想 → （編集のみ）「この記録を削除」。固定フッター: 主ボタン（上に `line` の区切り線、背景 `bg`）。

- 色・余白・角丸・文字はすべて `design/tokens.ts` と `AppText`。画面の左右余白は `space[5]` 相当（画像に合わせて、近いトークンを実装者が選び、PR に書く）。
- 状態: 入力中 → 保存中（主ボタン無効＋進行表示）→ 成功（遷移）／失敗（メッセージ）。検証エラーは欄ごと。
- 編集の読み込み中は `ActivityIndicator`、記録なしは「記録が見つかりません」（今のまま）。
- 日付選択シート: `BottomSheet`（見出しは日付欄の見出し）。開いた時点の値（空なら今日）から始める。シート内の変更は「決定」まで反映しない。

## 設計

### 追加・変更するファイル
- `app/src/components/RecordForm.tsx`（作り直し。props は `initialValues` / `submitLabel` / `onSubmit` / `onDelete` を維持。`onSubmit` は保存した記録を返せるよう `Promise<MediaRecord | void>` に広げず、**遷移は `RecordFormScreen` 側**で行う）
- `app/src/components/PhotoField.tsx`（新デザイン。props は維持。書影表示は `Thumbnail` をやめ、`getThumbnailCandidates` ＋ `Image` ＋ `TextCover` にするか、`CoverCard` が使えればそれを使う。`Cover.tsx` / `CoverCard.tsx` の API を確認して選ぶ）
- `app/src/components/DatePickerSheet.tsx`（新規。`BottomSheet` 内に年・月・日それぞれ「−」「＋」の丸ボタンと現在値、「今日」「クリア」「決定」）
- `app/src/components/DeleteConfirmSheet.tsx`（新規。`visible` / `title`（記録名）/ `busy` / `onConfirm` / `onCancel`。#40 でも使う）
- `app/src/screens/RecordFormScreen.tsx`（遷移の変更、読み込み中・記録なしの見た目）
- `app/src/lib/statusLabel.ts`（`getDateLabels(kind)` → `{ start, end }`、`getCreatorLabel(kind)`、`getDateHint(kind)` を追加）
- `app/src/lib/date.ts` か `lib/recordForm.ts`（`formatDateDisplay('2026-10-01') → '2026/10/01'`、`daysInMonth`、`shiftDate` 等の純粋関数。置き場所は既存の慣習に合わせる）
- テスト: 各ファイルの `__tests__/`（下記）

### 状態管理
- フォーム値・エラー・保存中・失敗は今の `RecordForm` の `useState` をそのまま維持。写真の一時ファイル管理（`pendingNew` など）のロジックは変えない。
- 日付シートは `RecordForm` が `openDate: 'start' | 'end' | null` を持ち、`DatePickerSheet` は下書き（`{y, m, d} | null`）を内部 state で持つ。
- 削除確認は `confirmingDelete: boolean`。

### 新しい依存
なし。

## テスト方針

| 受け入れ条件 | テスト |
|---|---|
| 種別・ステータスのチップ、ラベル切り替え、作者欄見出し | `RecordForm.test.tsx`（種別チップを押して `getByRole('radio')` を確認） |
| `getDateLabels` 等 | `lib/__tests__/statusLabel.test.ts` |
| タイトル必須エラー・add 非呼出し | `RecordForm.test.tsx` / `RecordFormScreen.test.tsx` |
| 出版社・ISBN の出し分けと保存値 | `RecordForm.test.tsx` |
| 日付シート（開く・今日・クリア・決定・末日クランプ） | `DatePickerSheet.test.tsx`、`RecordForm.test.tsx` |
| 日付整形・シフトの純粋関数 | `lib/__tests__/` |
| 終えた日の自動入力 | `RecordForm.test.tsx`（空→今日、入力済み→不変） |
| 日付順エラー | `RecordForm.test.tsx` |
| 写真・書影の説明文、写真を削除の出し分け | `PhotoField.test.tsx`（既存があれば更新、なければ新規）、`RecordForm.test.tsx` |
| 保存後の遷移（追加→`replace('/records/<id>')`、編集→`back`） | `RecordFormScreen.test.tsx` |
| 削除確認（キャンセルで削除されない、削除する→delete・写真削除・`replace('/')`） | `DeleteConfirmSheet.test.tsx`、`RecordFormScreen.test.tsx` |
| 保存中の無効化・失敗表示 | `RecordForm.test.tsx` |
| 下端余白 | `RecordForm.test.tsx`（`SafeAreaInsetsContext` の bottom を与え、フッターの `paddingBottom` を検証。既存 `bottom-inset.test.tsx` の書き方に倣う） |

既存の `RecordForm.test.tsx` `RecordFormScreen.test.tsx` の文言（「保存」→「記録する」/「保存する」、`Alert` → シート、`DateField` の操作 → 日付シート）を更新する。評価操作（ドラッグ等）のテストはそのまま通ること。見た目は、`ui-preview` が使えれば `iphone` / `android` で `record-form-new` / `record-form-edit` に当たる画面を撮影して比較し、PR 本文に一覧と違いを書く。使えなければその旨を書き、「デザインどおり」とは書かない。

## 判断ログ

1. **日付選択の実装**: 自前の `DatePickerSheet`（`BottomSheet` ＋ 年月日の増減ボタン）。却下: `@react-native-community/datetimepicker`（依存追加、「未設定」を表現しづらい、Jest でモックが必要。#3 の判断と同じ）。却下: テキスト入力のまま（デザインは「タップで選択」）。
2. **本・漫画以外へ切り替えたときの出版社・ISBN**: 画面の state には残し（戻すと復活）、保存時には消す（今の `toNewRecordInput` のまま）。理由: データモデル・既存の挙動を変えない。非表示の欄の値が静かに保存されるより、保存データと画面の見た目が一致する方がよい。却下: 切り替え時に即クリア（誤タップで入力が失われる）。
3. **保存後の遷移**: 追加は `router.replace('/records/<id>')`（デザイン「保存したら詳細へ」。戻るで入力画面に戻らない）。編集は `router.back()`（詳細から来ているため）。削除は、戻り先の詳細が消えた記録を指すので `router.replace('/')`（詳細画面の削除と同じ）。
4. **削除確認シートの共通化**: #40 より先に進むので、この Issue で `DeleteConfirmSheet` を作る。#40 側は同名の部品があればそれを使う（コンフリクト時は props を維持して統合）。触覚フィードバックは #40 の担当範囲（デザインの「触覚 1 回」）に合わせ、ここでは入れない。提案: 触覚を共通化するなら `DeleteConfirmSheet` の `onConfirm` 後に呼ぶ形が自然。
5. **主ボタンの固定**: `ScrollView` の外に置くフッターにし、フッター自身が `useBottomInset()` を足す。却下: スクロール内の末尾に置く（デザインは固定）。
6. **`RatingInput` は #38 のものをそのまま使う**: #38 が props を維持する方針のため、この Issue で作り直さない。#38 より先にマージされても、後でも動く。
7. **ヘッダーはこの Issue の対象外**: 戻る／閉じる丸ボタンと中央タイトルのヘッダーは画面共通の変更で、別 Issue のため。
8. **画面の左右余白**: 画像から読み取った 16px 前後に最も近い `space` トークンを使う。トークンにない値は書かない。
9. **提案（人間向け）**: 日付選択シートの「−」「＋」ステッパーは暫定の見た目。デザインにネイティブのピッカーや専用の部品が加わった場合は差し替える。
