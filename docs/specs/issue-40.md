# Issue #40 【画面】記録の詳細・作品の情報・削除の確認を新デザインにする

## 背景・目的

詳細画面は、記録した作品を眺めて満足する場所。デザイン（`docs/design-system/screens/README.md` の「詳細」、`record-detail.png` `record-detail-info.png` `delete-confirm.png`）に合わせ、書影を大きく見せ、出版社・ISBN・日時・削除は「作品の情報」に移す。

### 現状（コード上の事実）
- `screens/RecordDetailScreen.tsx`: 全項目を `Row` で縦に並べる旧デザイン。削除は `Alert.alert` で確認。写真の変更は詳細にはなく、編集画面（`PhotoField`）にだけある。
- ルート `app/records/[id].tsx` は `Stack.Screen options={{ title: '記録の詳細' }}`（ネイティブヘッダーあり）。`onEdit` で `/record/[id]` へ push、`onDeleted` / `onBack` で `router.replace('/')`。`__tests__/headers.test.tsx` が「記録の詳細」ヘッダーを検証している。
- 使える部品: `Cover`（写真→書影→文字の表紙のフォールバック）、`RatingStars`、`InfoCell` / `InfoCellRow`、`BottomSheet`、`Button`（primary / outline + `tone="danger"` / icon + `onImage`）、`AppText`、`lib/infoCellLabels`、`lib/haptics`（`triggerRatingHaptic`、expo-haptics 導入済み）、`lib/cover`（`getCoverColors`）。`tokens.ts` に `size.detailHeroHeight`(500)、`shadows.cover`、`colors.scrim`。
- `repository.update(id, NewRecordInput)` で記録を更新できる。`PhotoService`（`pick` / `save` / `remove`）と `usePhotoService` がある。

## スコープ

### やること
1. `RecordDetailScreen` を新デザインに作り直す（props `recordId / onEdit / onDeleted / onBack` は維持）。
2. 上部（高さ `size.detailHeroHeight`）: 暗い地に `Cover`（196×294、`shadows.cover`）。左上に戻る、右上に写真の変更（`Button variant="icon" onImage`、`accessibilityLabel`「戻る」「写真を変更」）。
3. タイトル（`screenTitle`）、「作者 · 種別」（作者がなければ種別のみ）、評価があれば `RatingStars`（表示用、`valueVariant="displayNumber"`、`size` 18）。評価がなければ星の段を出さない。
4. `InfoCell` 3 つ: ステータス（`getStatusLabel`）、始めた日、終えた日（ラベルは `infoCellLabels(kind)`）。日付が空なら `InfoCell` が「—」を出す。
5. 感想: `numberOfLines={3}`。感想がなければ段ごと出さない。
6. 下に固定: 「作品の情報」（`outline`）と「編集」（`primary`）。下はセーフエリア分の余白（`useBottomInset`）。
7. 作品の情報: 同じ画面の下側（スクロールの続き）。「作品の情報」ボタンでそこへスクロールする。内容: 小さな書影（56 幅）とタイトル、感想の全文（改行そのまま。感想なしなら段を出さない）、「作品の情報」見出しの下に 種別・作者（本・漫画は「作者・著者」、他は「監督など」）・出版社・ISBN・登録日時・更新日時の行（空の項目は行ごと出さない。出版社・ISBN は本・漫画のみ）、「この記録を削除」（`outline` + `tone="danger"`）。
8. 削除の確認: `BottomSheet`（`Alert` をやめる）。見出し「この記録を削除しますか？」、本文「「<タイトル>」の記録と、付けた写真が削除されます。元に戻せません。」、「キャンセル」（`outline`）と「削除する」（`outline` + `tone="danger"`）。シートの外タップ・スワイプも「キャンセル」と同じ扱い。「削除する」で `repository.delete` → 写真があれば `photoService.remove` → 触覚 1 回 → `onDeleted`。
9. 写真の変更: 右上ボタンで `BottomSheet`（見出し「写真を変更」）を開き、「カメラで撮影」「ライブラリから選択」（写真があれば「写真を削除」も）を出す。選択ロジックは `PhotoField` と同じ（権限拒否・保存失敗のメッセージ、設定を開く）。確定は即時保存: `repository.update` で `photoUri` を更新し、旧 `photoUri` は `photoService.remove`。選択ロジックは新規 hook `usePhotoPicker`（`hooks/usePhotoPicker.ts`）に切り出し、`PhotoField` も同 hook を使う（挙動は変えない）。
10. ルート `app/records/[id].tsx`: `Stack.Screen options={{ headerShown: false }}`（戻る・タイトルは画面内に持つ）。`headers.test.tsx` の該当行は「詳細はヘッダーを出さない」に更新する。
11. `lib/haptics.ts` に `triggerImpactHaptic()` を追加し、`triggerRatingHaptic` はそれを呼ぶ形にする（挙動不変）。
12. `lib/heroColor.ts`（新規）: `getHeroBackground(kind)`。種別の `cover-<kind>-bg` を黒（`colors.bg`）側へ寄せて暗くした色を返す。

### やらないこと
- 一覧から詳細への拡大の動き、共有ボタン。
- 書影の代表色の抽出（ライブラリ追加を含む）。トークンの追加。
- 編集画面（`RecordFormScreen`）内の削除導線の変更（#41）。

## 受け入れ条件

- [ ] 写真あり・書影 URL のみ・どちらもなしの記録で、上部にそれぞれ写真・書影・文字の表紙が出る
- [ ] 上部の地の色は種別の色を暗くしたもの（`getHeroBackground`）。取れない場合のフォールバックは判断ログ参照
- [ ] 評価・感想・日付が空のとき、星の段と感想の段は出ず、日付の `InfoCell` は「—」
- [ ] 評価ありで「レーティング 4.5」の画像（`RatingStars`）と数字が出る
- [ ] 本・漫画は「読み始めた／読み終えた」、映画・ドラマ・アニメは「見始めた／見終えた」
- [ ] 作者・種別が「夏目漱石 · 本」の形で出る（作者なしは種別のみ）
- [ ] 「作品の情報」に空でない項目だけが出る（出版社・ISBN は本・漫画のみ。更新日時・登録日時は常に出る）
- [ ] 感想は詳細上部では 3 行まで（`numberOfLines=3`）、作品の情報側では全文
- [ ] 「編集」で `onEdit(id)`、戻るで `onBack` が呼ばれる
- [ ] 「この記録を削除」で確認シートが出る。「キャンセル」では削除されずシートが閉じる。「削除する」で記録が消え、写真があれば `photoService.remove` が呼ばれ、触覚が 1 回、`onDeleted` が呼ばれる
- [ ] 削除に失敗したら「削除できませんでした」を出し、`onDeleted` は呼ばない
- [ ] 写真の変更ボタンからカメラ／ライブラリで選び、記録の `photoUri` が更新され、旧写真が削除される。キャンセルでは何も変わらない。権限拒否時はメッセージが出る。「写真を削除」で `photoUri` が null になる
- [ ] 記録が見つからないとき「記録が見つかりません」と「一覧へ戻る」、読み込み中は「読み込み中」
- [ ] `/records/[id]` ルートでネイティブヘッダーが出ない
- [ ] `pnpm check` が通る（カバレッジ維持、変更行 80% 以上）

## 画面・振る舞い

- 状態: loading → 見つからない / 表示。表示中の追加状態: 削除シート開閉、写真シート開閉、削除エラー、写真エラー。
- 縦構成: ScrollView（上部ヒーロー → タイトル群 → InfoCell 行 → 感想 3 行 → 作品の情報）＋ 画面下に固定バー（ボタン 2 つ、上端に `bg` 面）。ヒーローの戻る／写真変更はヒーロー上に絶対配置（上は `useSafeAreaInsets` 相当の余白。`useBottomInset` と同じ方式がなければヒーロー内の固定余白 `space['4']`＋ヘッダー相当の `space['6']`）。
- 「作品の情報」ボタン: 情報セクションの `onLayout` の y へ `scrollTo`。
- 編集から戻ったとき最新を読み込む挙動（`useFocusEffect`）は維持。

## 設計

| ファイル | 変更 |
| --- | --- |
| `screens/RecordDetailScreen.tsx` | 全面書き換え |
| `components/RecordInfoSection.tsx`（新規） | 作品の情報セクション（表示のみ。行は `{label, value}` の配列を `lib/recordInfo.ts` で組み立て） |
| `lib/recordInfo.ts`（新規） | `buildInfoRows(record)`: 空の項目を除いた行配列 |
| `lib/heroColor.ts`（新規） | `getHeroBackground(kind)` |
| `hooks/usePhotoPicker.ts`（新規） | `pick(source)` → `{ busy, error, choose, openSettings }`（`PhotoField` から切り出し） |
| `components/PhotoField.tsx` | `usePhotoPicker` を使う（見た目・挙動不変） |
| `lib/haptics.ts` | `triggerImpactHaptic` 追加 |
| `app/records/[id].tsx` / `__tests__/headers.test.tsx` | ヘッダー非表示 |

状態管理は React の state のみ。新しいライブラリは追加しない。

## テスト方針

- `screens/__tests__/RecordDetailScreen.test.tsx` を新デザインに更新: 表紙 3 種、空欄時の出し分け、ラベルの種別切り替え、作品の情報、編集・戻る、削除シート（キャンセル／削除する／失敗／触覚は `lib/haptics` を mock）、写真変更（`createMockPhotoService`）、見つからない／読み込み中。
- `lib/__tests__/recordInfo.test.ts`、`heroColor.test.ts`、`haptics.test.ts`（追加分）、`hooks` は画面・`PhotoField`（`RecordForm.test.tsx`）経由。
- `headers.test.tsx`: 詳細はヘッダーなし。

## 判断ログ

- **作品の情報を同じ画面の続きにする（別画面にしない）**: ルートや戻る挙動を増やさず、感想の全文と削除を同じ状態（`record`）で扱えるため。却下: 別ルート（データの再取得・テスト増）、シート（設計の「詳細の下側」と合わない）。
- **地の色は書影の代表色を取らず、種別色を暗くする**: 取得にはネイティブ画像ライブラリが必要で、Web/Jest での検証が難しく依存追加の負担が大きい。Issue も種別色での代替を許容。`surface-1` は種別色の計算が不要な場合の最終フォールバックだが、`MediaKind` は全件網羅するため通常は使わない。暗くする係数は定数（元色 45% + `bg` 55% の線形混合）。提案: 将来、代表色を取る場合は `expo-image-colors` 等を人間が評価して導入。
- **削除確認を `Alert` から `BottomSheet` に変更**: デザイン `delete-confirm.png` と部品 README の指定どおり。
- **写真の変更は即時保存**: 詳細に「保存」の段階がないため。失敗時はシート内にメッセージを出す。旧写真の削除は更新成功後。
- **`PhotoField` のロジックを hook に切り出す**: 「今と同じく撮影・選択できる」ことを保ちつつ重複を避ける。却下: 複製（保守が二重になる）。
- **触覚は `triggerImpactHaptic` を共通化**: 削除用に別実装を作らない。`triggerRatingHaptic` は互換のため残す。
- **トークン提案**: 詳細ヒーローの地の暗色化係数・戻る／写真ボタンの上余白はトークンにない。画面内の定数にし、必要なら人間がトークン化する。
- **見た目の確認**: 撮影ツール（`ui-preview`）の利用可否は実装工程で確認し、使えなければ PR 本文にその旨を書き「デザインどおり」とは書かない。
