# Issue #140: 使わなくなった言葉とコード（評価・レーティング・写真・書影）を整理する

## 背景・目的

読書専用・書斎の方針では「評価」とは書かず（`docs/design-system/README.md` の「書き方」: 「どうだった？」と聞き、点数に言葉を添える）、写真・書影も使わない。
しかし画面の文言、読み上げ、書き出し（CSV）の列名、写真機能のコード・依存が残っている。言葉とコードを方針に合わせる。

## スコープ

### やること

1. **文言の置き換え**（画面・読み上げ・並び順）
   - `RatingStars` の読み上げ（`accessibilityLabel`）: 値あり →「どうだった？ 4.5 よかった」（言葉は `getRatingWord`。言葉が付かない値はない）、なし →「どうだった？ まだ選んでいません」
   - `RatingStars` の `showValue` 表示の「未評価」→「まだ選んでいません」
   - `lib/format.ts` の `formatRating` の「未評価」→「まだ選んでいません」
   - 並び順 `rating_desc` / `rating_asc` のラベル（`SortSheet` が使う `sortRecords.ts` の `SORT_LABELS` と、`sortOrderLabel.ts`）:
     - `rating_desc`: 「どうだった？の高い順」
     - `rating_asc`: 「どうだった？の低い順」
     - 「レーティング」「評価」を使わない。`SortSheet` 内の「レーティング」表記があれば同様に直す
   - 本の削除の確認（`DeleteConfirmSheet`）: 「「〇〇」の記録（メモ・引用・書き出しを含む）が削除されます。元に戻せません」
   - 全削除の確認（`DeleteAllSheet`）: 「N 件の記録（メモ・引用・書き出しを含む）がすべて削除されます。元に戻せません」
   - このアプリについて（`AboutScreen`）: openBD の note を「書誌情報（ISBN から）」
   - 書き出し CSV（`csv.ts`）の列名「レーティング」→「どうだった？」
   - コード中のコメント・テストの説明文に残る「評価」も、画面に出ないものは任意（変更しなくてよい）。ただし `getRatingWord` のコメントは「どうだったの言葉」に直す
2. **写真機能のコードを外す**（どこからも画面に使われていない）
   - 削除: `hooks/usePhotoPicker.ts`、`hooks/usePhotoService.tsx`、`lib/photo/`（`ExpoPhotoService` `PhotoService` `index` とそのテスト）
   - `app/_layout.tsx` と `testProviders.tsx` から `PhotoServiceContextProvider` を外す。`testUtils.ts` の `createMockPhotoService` を削除
   - `RecordForm.tsx`（`photoService.remove` 呼び出し）、`DataScreen.tsx` と `lib/deleteAllRecords.ts`（`photoService` 引数と写真ファイル削除）から写真の処理を外す。`deleteAllRecords` は記録の削除だけを行う
   - 依存 `expo-image-picker` を `package.json` と `app.json` の plugins から外す。`expo-file-system` は書き出しの `ExpoFileService` が使うので残す
   - `src/generated/licenses.json` が生成物ならスクリプトで再生成する（手で編集しない。生成方法が分からなければ該当エントリの削除のみ）。許可リストの検査は `expo-image-picker` を外しても通ること
3. **書影のコードを外す**（画面は `TextCover` だけを表示し、`Cover` / `Thumbnail` はどこからも使われていない）
   - 削除: `components/Cover.tsx`、`components/Thumbnail.tsx`、`lib/thumbnail.ts`、`hooks/useCoverResolver.tsx`、`lib/coverLookup/`（本の検索のたびに openBD へ書影を取りに行く処理も止める）とそれぞれのテスト
   - `TitleSearchScreen` `IsbnLookupScreen` `RecordFormScreen` から書影の取得（`withCover` `fillCover` `useCoverResolver`）を外す。`app/_layout.tsx` `testProviders.tsx` から `CoverResolverContextProvider` を外す
   - `lib/cover.ts` と `TextCover`（文字の表紙）は書影ではなく表紙の描画なので残す。名前の変更はしない

### やらないこと

- 保存済みデータの形（`MediaRecord.coverUrl` / `photoUri`、`recordGuard`、バックアップの形式）は変えない。既存ユーザーのデータと、過去のバックアップの読み込みを壊さないため。`photoUri` / `coverUrl` は「使わない互換用の欄」として残し、新しく値を入れない（`recordForm` は引き継ぐだけ）。型から消す整理は、データ移行を伴うので別 Issue にする
- `OpenBdProvider`（書誌情報の取得）が返す `book.coverUrl`、`isbnLookupParams` の `coverUrl` 受け渡しは互換欄に沿うので残す。ただし `OpenBdCoverProvider` は外す
- 内部の識別子（`rating` フィールド、`RatingStars` などのコンポーネント名、`rating_desc` のキー、`testID`）はリネームしない。保存済みの並び順の設定やデータとの互換のため。画面と読み上げに出る文言だけを直す
- `ReviewScreen` / `RatingBreakdown` の既存の見た目（「どうだった？」系の文言になっている部分）は、検索して「評価」等が出る箇所だけ直す
- CSV の読み込み（インポート）は JSON バックアップであり CSV は取り込まない。そのため列名変更による互換の問題はない（実装時に `importBackup.ts` が CSV の列名を参照していないことを確認する）

## 受け入れ条件

- [ ] `RatingStars` の読み上げが「どうだった？ 4.5 よかった」「どうだった？ まだ選んでいません」で、「レーティング」「未評価」を含まない
- [ ] `formatRating`（`lib/format.ts`）の null が「まだ選んでいません」を返す
- [ ] 並び順シートと並び順の表示の文言に「レーティング」「評価」が出ず、「どうだった？の高い順／低い順」が出る
- [ ] 本の削除・全削除の確認文に「写真」が出ず、「メモ・引用・書き出しを含む」が出る
- [ ] このアプリについてに「書影」が出ず、openBD は「書誌情報（ISBN から）」と表示される
- [ ] CSV の見出し行に「レーティング」がなく「どうだった？」がある。値の列順は変わらない
- [ ] 主要な画面（読んでる・読み終わった・設定・並び順シート・このアプリについて・データ管理・削除の確認・記録の詳細）を描画し、テキストと `accessibilityLabel` に「評価」「レーティング」「未評価」「写真」「書影」が含まれない（横断テスト 1 本）。「評価」は `getRatingWord` の周辺以外の画面で出ないこと
- [ ] 写真機能（`usePhotoPicker` `usePhotoService` `lib/photo`）と書影機能（`Cover` `Thumbnail` `thumbnail.ts` `useCoverResolver` `lib/coverLookup`）のファイルがない。`expo-image-picker` が `package.json` と `app.json` にない
- [ ] 記録の追加・編集・全削除が写真・書影なしで動く（既存テストを新しい引数に合わせて更新）
- [ ] 既存データ（`photoUri` / `coverUrl` が入った記録）とバックアップの読み込みが従来どおり成功する（`recordGuard` / `importBackup` の既存テストが通る）
- [ ] `pnpm check` が通る。カバレッジ閾値を下げない

## 画面・振る舞い

画面構成と操作は変えない。変わるのは次の文言だけ。

| 場所 | 変更前 | 変更後 |
|---|---|---|
| 並び順（設定・並び順シート・一覧の表示） | レーティングの高い順／低い順（`SortSheet` は評価が高い順／低い順） | どうだった？の高い順／低い順 |
| 星の読み上げ | レーティング 4.5 ／ レーティング 未評価 | どうだった？ 4.5 よかった ／ どうだった？ まだ選んでいません |
| 星の横の表示（値なし） | 未評価 | まだ選んでいません |
| 削除の確認 | 「〇〇」の記録と、付けた写真が削除されます | 「〇〇」の記録（メモ・引用・書き出しを含む）が削除されます |
| 全削除の確認 | N 件の記録と、付けた写真がすべて削除されます | N 件の記録（メモ・引用・書き出しを含む）がすべて削除されます |
| このアプリについて | openBD: 書誌情報・書影（ISBN から） | openBD: 書誌情報（ISBN から） |
| CSV 見出し | レーティング | どうだった？ |

エラー時の振る舞い: 書影を取りに行かなくなるため、ネットワーク失敗による書影関連のエラー・空振りがなくなる。本の検索・ISBN 検索・記録の保存の成功／失敗の振る舞いは変わらない。

## 設計

- 新規ファイル・依存の追加はない（**新しいライブラリは不要**）
- 変更: `components/RatingStars.tsx` `lib/format.ts` `lib/sortRecords.ts` `lib/sortOrderLabel.ts` `components/SortSheet.tsx` `components/DeleteConfirmSheet.tsx` `components/DeleteAllSheet.tsx` `screens/AboutScreen.tsx` `lib/csv.ts` `lib/ratingWord.ts`（コメント）
- 変更（写真・書影の除去）: `app/_layout.tsx` `testProviders.tsx` `testUtils.ts` `components/RecordForm.tsx` `screens/DataScreen.tsx` `lib/deleteAllRecords.ts` `screens/TitleSearchScreen.tsx` `screens/IsbnLookupScreen.tsx` `screens/RecordFormScreen.tsx` `lib/recordRepository.ts`（`photoUri` の引き継ぎはデータ互換のため残す）
- 削除: 上記スコープ 2・3 のファイルとテスト
- 依存の削除: `expo-image-picker`（`package.json` / `app.json` / `pnpm-lock.yaml`）。`pnpm remove expo-image-picker` を使う。`expo install --check` と expo-doctor が通ることを確認する。`app.json` は人間専用ファイルの一覧にないので変更してよい（実装時に `orchestrator/policy.json` で確認。保護されていれば `app.json` の変更は PR の判断ログに提案として書く）
- 削除したコードに依存する `import` が残っていないことは `pnpm typecheck` と `pnpm lint` で確認する

## テスト方針

| 受け入れ条件 | テスト |
|---|---|
| 星の読み上げ、`formatRating` | `components/__tests__/RatingStars` 相当・`lib/__tests__/format.test.ts` を更新（なければ追加） |
| 並び順の文言 | `sortRecords` `sortOrderLabel` `SortSheet` のテストを更新 |
| 削除の確認文 | `DeleteConfirmSheet` / `DeleteAllSheet`（または `DataScreen`・記録の詳細）のテストを更新 |
| このアプリについて | `AboutScreen.test.tsx` を更新 |
| CSV 見出し | `lib/__tests__/csv.test.ts` を更新 |
| 禁止語がない | `src/__tests__/forbidden-words.test.tsx` を新規（主要画面を `testProviders` で描画し、`toJSON()` の文字列と `accessibilityLabel` を走査して禁止語がないことを確認） |
| ファイルがない・依存がない | `pnpm typecheck` `pnpm lint`（import 残りの検出）、CI の `dependencies` チェック |
| 記録の追加・編集・全削除 | `RecordFormScreen` `DataScreen` `deleteAllRecords` の既存テストを新しい引数に合わせて更新 |
| データ互換 | `recordGuard` `importBackup` の既存テストが無変更で通る |

写真・書影のテストを消すのは、対象の機能を外したため。PR 本文の判断ログに、消したテストと理由（外した機能）を書く。

## 判断ログ

- **「どうだった？の高い順」にした**（却下: 「点数の高い順」＝点数という言葉が堅い、「よかった順」＝言葉の区切りと紛らわしい）。ブランドブックが評価を「どうだった？」と呼ぶため、それに合わせた
- **星の読み上げに言葉を足した**。点数だけでは意味が伝わらず、画面の見た目（点数に言葉を添える）と読み上げをそろえるため。Issue の案どおり
- **「未評価」は「まだ選んでいません」にした**（却下: 「なし」＝何がないのか分からない）。`RatingSlider` の読み上げ「未選択」と同じ意味合い
- **CSV の列名は「どうだった？」にした**。CSV は書き出し専用で取り込み側が列名を使わないので互換の問題がない（要確認の点は上記のとおり実装時に確かめる）。却下: 列名「点数」は意味がずれる
- **内部名（`rating` `RatingStars` `rating_desc`）はリネームしない**。保存済みデータ・並び順の設定との互換と、変更量の大きさに対して画面上の利益がないため。却下: 全面リネーム＋データ移行
- **`coverUrl` / `photoUri` のデータ欄は残し、機能だけ外した**。過去のバックアップや保存済みデータを壊さないため。却下: 型から消す（移行が必要。別 Issue）
- **書影の取得処理も外す**。画面が `TextCover` しか表示せず、`Cover` `Thumbnail` はどこからも使われていない。取得しても使わない通信になっているため。Issue の「写真・書影は使わない」の方針に沿う。却下: 取得処理を残す（使わない通信とコードが残り、「このアプリについて」の文言とも矛盾する）
- **`expo-image-picker` を外す**。写真機能が使われておらず、権限ダイアログ用の plugin だけが残る状態を避ける。`expo-file-system` は書き出しが使うので残す
- **禁止語の検査は画面を描画する横断テストにした**。ソースの grep は日本語のコメントや内部名と区別が難しく、画面に出る文言を直接確かめる方が Issue の受け入れ条件（画面のテキストを検索するテスト）に合う
