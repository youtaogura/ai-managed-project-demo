# Issue #55 記録を書き出す・読み込む（バックアップと機種変更）

## 背景・目的

記録は端末の AsyncStorage にだけ保存されているため、機種変更・故障・アプリの削除で失われる。記録をファイルに書き出して保管し、別の端末で読み込めるようにする。

デザイン: `docs/design-system/screens/README.md`「データ」「記録を書き出す」「記録を読み込む」（`settings-data.png` `export.png` `import.png`）。

### 現状（コード上の事実）
- 記録は `lib/recordRepository.ts`（`RECORDS_STORAGE_KEY` に JSON 配列を 1 キーで保存。書き込みは `serialize` で直列化）。検証は `lib/recordGuard.ts` の `parseRecords` / `isMediaRecord`（不正な要素は捨てる）。
- 設定は `lib/settingsStore.ts`（`parseSettings` はフィールドごとに検証し、不正は既定値）、`hooks/useSettings.tsx`（`update(patch)`、起動時に 1 回 load）。
- `SettingsScreen` は `SettingsCard` / `SettingsRow` で構成。「データ」の行は未実装。`expo-file-system`（`lib/photo/ExpoPhotoService.ts`）は導入済み。ファイル共有・選択のライブラリは未導入。
- 外部依存（カメラ・写真）は `PhotoService` のようにインターフェース + Context で差し替え可能にしており、テストはそのフェイクで書く。同じ作りにする。
- `app/src/app/` は Expo Router（`(tabs)` と Stack の画面）。

## スコープ

### やること
1. 設定画面に最後のカード「データ」（2 行目に「書き出し・読み込み · 最後に書き出した日 <日付>」。未書き出しは「まだ書き出していません」）。タップで「データ」画面へ。
2. 「データ」画面: 記録の件数、「記録を書き出す」（2 行目に最後に書き出した日）、「記録を読み込む」、説明文「記録はこの端末の中にだけ保存されています。機種変更の前には書き出してください。」
3. 書き出し: `BottomSheet` で件数と 2 形式（JSON バックアップ／CSV）。選ぶとファイルを作って共有メニューを開く（Web はダウンロード）。成功したら書き出した日時を保存。
4. 読み込み: ファイル選択 → 検証 → `BottomSheet`（ファイル名・件数・書き出した日・方式・設定を読み込むか）→ 実行。失敗・不正ファイルは何も変えずにエラーを出す。
5. 中途失敗で記録が中途半端にならない（原子的な書き込み）。

### やらないこと
- クラウドバックアップ・端末間同期、写真の画像の書き出し、CSV / 他アプリ形式の読み込み
- 「すべての記録を削除」（#56。データ画面の最下部は #56 が足す）
- 写真ファイルの掃除（判断ログ 6）

## 受け入れ条件

### バックアップ形式（`lib/backup.ts`）
- [ ] `buildBackup(records, settings, exportedAt)` は `{ format: 'ai-managed-records-backup', version: 1, exportedAt, records, settings }` を返す。全記録の `photoUri` は `null` にする（他の項目は同一）。入力は書き換えない
- [ ] 書き出し → JSON 文字列化 → `parseBackup` で読み戻すと、`photoUri` 以外のすべての項目が元の記録と一致する
- [ ] `parseBackup(text)` は `{ ok: true, backup }` か `{ ok: false, reason }`（`reason`: `not_json` / `not_backup` / `too_new` / `invalid`）を返す。例外を投げない
  - JSON でない → `not_json`／オブジェクトでない・`format` が違う・`version` が整数でない → `not_backup`／`version` が現行（1）より大きい → `too_new`／`records` が配列でない、または**1 件でも** `isMediaRecord` を通らない → `invalid`（一部だけ読む、はしない）
  - 同じ `id` が複数あるときは `invalid`
  - `settings` は任意。あれば `parseSettings` 相当でフィールドごとに検証（不正は既定値）。なければ `null`
  - `exportedAt` が日時文字列でなければ `invalid`

### CSV（`lib/csv.ts`）
- [ ] 先頭に UTF-8 の BOM（`﻿`）、改行は `\r\n`、末尾にも改行
- [ ] ヘッダー行（日本語）: 種別・タイトル・作者・出版社・ISBN・ステータス・始めた日・終えた日・レーティング・感想・登録日時・更新日時。1 記録 1 行、全記録が入る
- [ ] 種別・ステータスは日本語ラベル（`KIND_LABELS` / `getStatusLabel`）。null は空欄。レーティングは数値
- [ ] カンマ・改行・ダブルクオートを含む値は `"` で囲み、`"` は `""` にする。パースし直すと元の値に戻る（テストにはテスト内の簡易 CSV パーサーを使う）
- [ ] 0 件でもヘッダー行だけのファイルになる
- [ ] 表計算ソフトの数式インジェクション対策として、文字列の先頭が `=` `+` `-` `@` のセルは先頭に `'` を付ける（レーティングの数値は対象外）

### リポジトリ（`recordRepository`）
- [ ] `importRecords(records, mode)`（`mode`: `'merge' | 'replace'`）を追加
- [ ] `merge`: ファイルにない今の記録は残り、同じ `id` はファイルの内容（`createdAt` `updatedAt` もファイルの値）になる。ただし同じ `id` の今の記録に `photoUri` があり、ファイル側が `null` のときは今の `photoUri` を残す
- [ ] `replace`: 今の記録がファイルの記録だけになる
- [ ] 戻り値は読み込み後の件数。保存は 1 回の `setItem`（原子的）。`setItem` が失敗したら reject し、保存済みの記録は変わらない
- [ ] 書き込みは既存どおり直列化される（他の add/update と競合しない）

### 読み込みの実行（`lib/importBackup.ts`）
- [ ] `applyImport({ repository, settingsStore, backup, mode, includeSettings })`: 記録を `importRecords`、`includeSettings && backup.settings` なら設定を保存
- [ ] 設定の保存に失敗したら、記録を読み込み前の内容に戻して reject する（記録だけ変わった状態にしない）
- [ ] `includeSettings` が false のとき設定は変わらない

### 最後に書き出した日（`lib/exportStore.ts`）
- [ ] `createExportStore(storage)` の `loadLastExportedAt(): Promise<string | null>` / `saveLastExportedAt(iso)`。キーは `lastExportedAt.v1`（`AppSettings` には入れない。判断ログ 3）
- [ ] 保存がない・日時として不正・storage の例外のとき `null`
- [ ] 日付の表示は既存の `lib/format.ts` に合わせる（例: `2026年10月26日`）

### ファイル入出力（`lib/fileService/`）
- [ ] `FileService` インターフェース: `saveAndShare({ filename, mimeType, content }): Promise<'shared' | 'cancelled'>` / `pickTextFile(): Promise<{ name: string; text: string } | null>`（キャンセルは `null`）
- [ ] `hooks/useFileService.tsx`: `FileServiceContextProvider`（`service` を差し替え可）と `useFileService()`。`_layout.tsx` の Providers に追加
- [ ] Expo 実装: `expo-file-system` でキャッシュに書いて `expo-sharing` の共有メニューを開く／`expo-document-picker` で選び `expo-file-system` で UTF-8 として読む。Web 実装: `Blob` + `<a download>` でダウンロード／`<input type="file">`。実装は Jest ではモック越しに最低限（成功・キャンセル・共有不可）を検証
- [ ] 共有が使えない端末（`Sharing.isAvailableAsync()` が false）は例外を投げ、画面側で「共有を開けませんでした」を出す
- [ ] ファイル名: `記録バックアップ-YYYYMMDD.json` / `記録一覧-YYYYMMDD.csv`（ローカル日付）。ASCII のみを求める環境のため実装は `records-backup-YYYYMMDD.json` / `records-YYYYMMDD.csv` とする（判断ログ 4）

### 設定画面
- [ ] 最後のカードに「データ」の行。2 行目は「書き出し・読み込み · 最後に書き出した日 2026年10月26日」、未書き出しは「まだ書き出していません」。`accessibilityRole="button"`、44px 以上。タップでデータ画面へ遷移する
- [ ] 他の行（使う種別・上に大きく出す作品）は変わらない

### データ画面（`screens/DataScreen.tsx`、ルート `app/data.tsx`）
- [ ] 記録の件数が表示される（使わない種別の記録も含む全件。0 件は「0」）
- [ ] 「記録を書き出す」の 2 行目に最後に書き出した日（なければ「まだ書き出していません」）。「記録を読み込む」の行。説明文が出る
- [ ] 「記録を書き出す」で `BottomSheet`（見出し「記録を書き出す」、閉じるボタン、件数、説明文に「自分で撮った写真は含まれません」）。選択肢「バックアップ（JSON）」（補足: 記録と設定をすべて含む。このアプリで読み込める）、「表形式（CSV）」（補足: 表計算ソフトで見る用。読み込みには使えない）
- [ ] 形式を選ぶと `saveAndShare` が呼ばれ、内容は上記の形式、MIME は JSON が `application/json`、CSV が `text/csv`。成功後にシートが閉じ、最後に書き出した日が保存され、画面の表示が今日の日付に更新される
- [ ] `saveAndShare` が `'cancelled'` を返したら日時を更新しない。例外のときも更新せず、「書き出せませんでした。もう一度お試しください」を出す
- [ ] 記録が 0 件のとき: JSON は書き出せる（設定のバックアップになる）。CSV 選択肢は無効（`accessibilityState.disabled`）で「記録がありません」と補足する
- [ ] 「記録を読み込む」で `pickTextFile`。キャンセル（`null`）なら何も出さない
- [ ] 選んだファイルが `parseBackup` に失敗したら、記録・設定を何も変えず、理由別の文言を `BottomSheet` ではなく画面上のエラー表示（`accessibilityRole="alert"`）で出す: `not_json`／`not_backup` 「このアプリのバックアップファイルではありません」、`invalid` 「ファイルが壊れているため読み込めません」、`too_new` 「新しいバージョンのアプリで書き出されたファイルです。アプリを更新してください」
- [ ] 検証に成功したら読み込みシート（見出し「記録を読み込む」）にファイル名・「N 件の記録」・書き出した日を出す。方式は「今の記録に追加する」（初期選択。補足: 同じ記録はファイルの内容で上書き）／「今の記録と置き換える」（補足: 今ある記録は削除）。設定の選択「設定も読み込む」「設定は読み込まない」（初期は読み込む。ファイルに設定がなければこの選択は出さない）。「キャンセル」「読み込む」
- [ ] 「キャンセル」で何も変わらずシートが閉じる
- [ ] 「読み込む」で `applyImport` が呼ばれ、成功するとシートが閉じ、件数が更新され、「N 件の記録を読み込みました」を出す
- [ ] `applyImport` が失敗したら、シートを閉じてエラー「読み込めませんでした。記録は変わっていません」を出し、記録・設定は読み込み前のまま
- [ ] 読み込みで設定が変わったとき、`useSettings` の状態にも反映される（`useSettings` に `replace(settings)` を足すか `update` に全フィールドを渡す。判断ログ 5）
- [ ] 読み込み後、記録一覧など他画面は最新の記録を表示する（既存の `useRecords` の再読み込みの仕組みに従い、必要なら読み込み完了を通知する）

## 画面・振る舞い

- 設定 →（「データ」）→ データ画面（Stack。戻る丸ボタンと中央タイトル「データ」。他の Stack 画面の作りに合わせる）。
- 書き出し: 行タップ → 形式シート → 形式タップ → 作成 → 共有メニュー → 完了でシートを閉じる。作成中はシート内の選択肢を無効にして二重実行を防ぐ。
- 読み込み: 行タップ → ファイル選択 → 検証（失敗: エラー表示で終わり）→ 確認シート →「読み込む」→ 完了。実行中は「読み込む」を無効にする。
- エラー・完了メッセージは次の操作を始めたら消す。

## 設計

### 追加・変更するファイル
| ファイル | 内容 |
|---|---|
| `src/types/backup.ts` | `BackupFile` 型、`BACKUP_FORMAT` `BACKUP_VERSION`、`ImportMode`、`ParseBackupResult` |
| `src/lib/backup.ts` | `buildBackup` `parseBackup` |
| `src/lib/csv.ts` | `recordsToCsv` |
| `src/lib/exportStore.ts` | 最後に書き出した日の保存 |
| `src/lib/importBackup.ts` | `applyImport`（ロールバック付き） |
| `src/lib/recordRepository.ts` | `importRecords` を追加（`RecordRepository` 型にも） |
| `src/lib/fileService/` | `FileService.ts`（型）、`ExpoFileService.ts`、`WebFileService.ts`、`index.ts`（`Platform.OS` で選択） |
| `src/hooks/useFileService.tsx` | Context |
| `src/hooks/useLastExportedAt.ts` | `exportStore` を読み、`markExported` を返す |
| `src/hooks/useSettings.tsx` | `replace(settings)` 追加（保存し状態を更新） |
| `src/screens/DataScreen.tsx` | データ画面 |
| `src/components/ExportSheet.tsx` `ImportSheet.tsx` | `BottomSheet` ベースのシート |
| `src/screens/SettingsScreen.tsx` | 「データ」カード |
| `src/app/data.tsx`、`src/app/_layout.tsx` | ルートと Provider |
| `.../__tests__/` | 各テスト |

### データ構造
```ts
type BackupFile = {
  format: 'ai-managed-records-backup';
  version: 1;
  exportedAt: string;        // ISO 8601
  records: MediaRecord[];    // photoUri は常に null
  settings: AppSettings | null;
};
type ImportMode = 'merge' | 'replace';
```
バージョンは「未知の将来の形式は読まない」ために整数で持ち、後方互換が必要になったら `parseBackup` で版ごとに変換する。

### 原子性
記録は 1 キー 1 回の `setItem` で置き換えるため、記録の書き込み自体は途中状態にならない。記録と設定の 2 つにまたがる場合は、`applyImport` が読み込み前の記録を `getAll` で控え、設定の保存に失敗したら記録を `importRecords(before, 'replace')` で戻す。検証はすべて書き込み前に終える。

### 新しいライブラリ（実装工程で `npx expo install` する）
- `expo-sharing`: 作ったファイルを端末の共有メニュー（保存先をユーザーが選ぶ）に渡す。`expo-file-system` だけでは共有メニューを開けない。代替: React Native 標準の `Share.share`（ファイルの添付が iOS の `url` に限られ、Android でファイルを渡せない）→ 却下。
- `expo-document-picker`: ファイル選択（iOS ファイル App・Android のストレージ）。代替: `expo-image-picker`（画像専用）→ 不可。
- ほかの追加なし（`expo-file-system` は導入済み）。どちらも Expo SDK 58 向けの版を `expo install` が解決する。ライセンスは MIT で許可リストの想定。通らなければ判断ログに書く。
- `app.json` / `app.config` の変更が要る場合（plugins 追加など）は `app/` 内なので実装工程で行う。

### 状態管理
新しいグローバル状態は作らない。DataScreen のローカル state（シートの開閉、選んだ方式、読み込み候補の `BackupFile` とファイル名、メッセージ）と、既存の Context を使う。

## テスト方針

| 受け入れ条件 | テスト |
|---|---|
| バックアップ形式・往復・不正ファイル | `lib/__tests__/backup.test.ts`（往復一致、各 `reason`、重複 ID、`settings` の検証、入力を書き換えない） |
| CSV | `lib/__tests__/csv.test.ts`（BOM、ヘッダー、特殊文字、往復パース、0 件、`=` 始まり） |
| merge / replace / 原子性 | `lib/__tests__/recordRepository.test.ts` に追記（`setItem` を失敗させるフェイク storage、写真の維持） |
| 設定のロールバック | `lib/__tests__/importBackup.test.ts` |
| 最後に書き出した日 | `lib/__tests__/exportStore.test.ts` |
| ファイル入出力 | `lib/fileService/__tests__/`（`expo-sharing` / `expo-document-picker` / `expo-file-system` をモック。Web 実装は jsdom 相当が無ければ DOM をスタブして最低限） |
| 設定画面の「データ」行 | `screens/__tests__/SettingsScreen.test.tsx` に追記 |
| データ画面（書き出し・読み込み・エラー） | `screens/__tests__/DataScreen.test.tsx`（`FileService` のフェイク + メモリ storage の実リポジトリ。書き出し → 全削除 → 読み込みの往復も画面から確認） |
| `useSettings.replace` | `hooks/__tests__/useSettings.test.tsx` に追記 |

差分カバレッジ 80% のため、`ExpoFileService` / `WebFileService` もモックで主要な分岐を通す。

## 判断ログ

1. **CSV の BOM と改行**: UTF-8 BOM 付き・`\r\n`。Excel が BOM なしだと Shift_JIS と誤認して文字化けするため。却下: Shift_JIS 出力（変換ライブラリが必要）。
2. **バックアップの検証は「1 件でも不正なら全体を `invalid`」**: 既存の `parseRecords` は不正な要素を捨てるが、バックアップで黙って欠落させると気づけないため、全件検証して厳格に扱う（`isMediaRecord` は再利用）。却下: 読める分だけ読む。
3. **「最後に書き出した日」は `AppSettings` に入れず別キー**: 設定のバックアップに含めると、別端末へ読み込んだときに「書き出した」ことになってしまうため。端末ごとの事実として `lastExportedAt.v1` に保存。
4. **ファイル名は ASCII**: 共有先やファイルシステムによる文字化け・拒否を避ける。却下: 日本語名。
5. **設定の読み込み**: ファイルに設定があれば、シートで「設定も読み込む」（初期: 読み込む）を選べるようにする。機種変更では設定も戻したいのが普通で、一方で既存端末への追加では残したい場合もあるため、方式とは独立にした。却下: 常に読み込む／常に読み込まない／方式に連動。反映のため `useSettings` に `replace` を追加（`update` は部分更新で、読み込んだ全体の置き換えに不向き）。
6. **写真**: 書き出しでは `photoUri` を `null` にする（端末固有のパスで別端末では無意味なため）。merge で同じ ID の今の記録に写真があれば残す。replace で消える記録の写真ファイルはこの Issue では掃除しない（孤立ファイルが残る）。写真の削除は #56 で扱う。却下: 画像を base64 で埋め込む（Issue のやらないこと）。
7. **同じ ID の扱い**: Issue どおり、ファイルの内容で上書き（`updatedAt` の新旧比較はしない）。単純で予測しやすいため。却下: `updatedAt` が新しい方を残す。
8. **共有ライブラリ**: `expo-sharing` と `expo-document-picker`（設計参照）。Web は標準 API でダウンロード／選択を代替（Issue の許容どおり）。
9. **エラー表示の置き場**: 不正ファイルは確認シートを出さず画面上のエラー（`role=alert`）。シートに進めると「読み込む」が無意味になるため。
10. **0 件のときの CSV**: 無効にする（空のファイルを作る意味がないため）。JSON は設定のバックアップとして有効なので許可。
11. **CSV の数式対策**: 先頭が `=+-@` の文字列に `'` を足す。感想などユーザー入力が表計算ソフトで数式として実行されるのを防ぐ。往復はしない（読み込み不可の形式）ため副作用は許容。
12. **デザインにない文言**（エラー・完了メッセージ、「記録がありません」）は仕様書の文言で実装し、スタイルは既存の文字トークンを使う。新しい色（成功の緑など）は足さない。`danger` はエラー文字にだけ使う（既存トークン）。
