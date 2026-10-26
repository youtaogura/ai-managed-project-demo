# Issue #6 バーコード読み取りで ISBN を入力

## 背景・目的

手元の本のバーコードをカメラで読み取るだけで記録を始められるようにする。読み取った ISBN は #5 の取得処理（`BookLookupProvider` / openBD）に渡し、結果を #3 の記録フォームの初期値にする。
依存: #5（`lib/isbn.ts` の `toIsbn13`、`BookLookupProvider` と `useBookLookup`、`lib/isbnLookupParams.ts`、`/record/isbn` 画面、`/record/new` への params 渡し）。
**実装の前提**: 実装工程の開始時点で #5 が `main` にマージされていること。未マージなら `agent/issue-5` の内容を取り込んで作業し、判断ログに書く。以下、#5 の仕様書（`docs/specs/issue-5.md`）で定義された名前を使う。

## スコープ

### やること
- バーコード判定の純粋関数（EAN-13 のチェックディジット、978/979 の採用、192 の除外）
- バーコード読み取り画面（`/record/scan`）: カメラのプレビュー、読み取り、ISBN 検索、フォームへの遷移
- カメラ権限の確認・要求、拒否時の理由表示・設定アプリへの案内・ISBN 手入力（`/record/isbn`）への切り替え
- 読み取りのキャンセル（一覧に戻る）
- 記録一覧に「バーコードで読み取って追加」ボタン
- `app.json` に expo-camera の config plugin（iOS のカメラ利用目的の日本語説明文）を追加

### やらないこと
- 書籍以外（映画・ドラマ・アニメ）のバーコード、1 冊ずつ以外の連続読み取り
- 書誌情報の取得処理そのもの（#5）。本 Issue は #5 の `BookLookupProvider` を呼ぶだけ
- 懐中電灯・ズーム・画像ファイルからの読み取り

## 受け入れ条件

### バーコード判定（`lib/barcode.ts`）
- [ ] `isValidEan13(code)`: 13 桁の数字でチェックディジットが正しいときだけ `true`
- [ ] `isbnFromBarcode({ type, data })`: `type` が EAN-13 で、`data` が 978 / 979 で始まり EAN-13 として有効なときだけ ISBN-13 文字列を返し、それ以外は `null`
- [ ] 192 で始まる 13 桁（日本の書籍 2 段目の分類・価格コード。チェックディジットが正しくても）は `null`
- [ ] チェックディジット不正、桁数違い、数字以外、QR など他の `type` は `null`

### 読み取り画面（`expo-camera` の `CameraView` をモック、偽 Provider を差し込む）
- [ ] 権限が許可済みのとき、`CameraView` を `barcodeScannerSettings={{ barcodeTypes: ['ean13'] }}` で表示する。キャンセルボタンと説明文「本のバーコード（978 または 979 で始まる段）を枠に合わせてください」を表示する
- [ ] ISBN のバーコードが検出されると、Provider が ISBN-13 で呼ばれ、見つかったとき #5 と同じ形式で `router.replace('/record/new', params)` を呼ぶ（`kind=book`・`title`・`creator`・`publisher`・`isbn`・`coverUrl`）
- [ ] 192 で始まるバーコードや不正なバーコードが検出されても Provider は呼ばれず、画面は読み取りを続ける（エラー表示も出さない）。続けて ISBN のバーコードが検出されればそれを処理する
- [ ] 同じバーコードを連続で検出しても（検索中・検索後とも）Provider は 1 回しか呼ばれない
- [ ] 検索中は「書誌情報を検索中…」とローディングを表示する
- [ ] 見つからないとき「見つかりませんでした」を表示し、「手入力で続ける」で `/record/new` に `kind=book`・`isbn`（ISBN-13）だけ渡して遷移できる。「もう一度読み取る」で読み取りを再開できる
- [ ] 通信エラー時「書誌情報を取得できませんでした。通信状況を確認してください」を表示し、「再試行」で同じ ISBN を再検索、「手入力で続ける」で上記と同様に遷移、「もう一度読み取る」で再開できる
- [ ] 「もう一度読み取る」の後は、直前と同じバーコードを再び検出しても検索される
- [ ] 「キャンセル」を押すと `router.back()` が呼ばれる（記録の追加前の画面＝一覧に戻る）
- [ ] 権限の状態がまだ不明（読み込み中）のときはカメラを出さずローディングを表示する

### カメラ権限
- [ ] 未許可かつ再要求できる（`canAskAgain` が true）とき、カメラを使う理由と「カメラを許可する」ボタンを表示し、押すと `requestPermission` が呼ばれる。許可されるとカメラが表示される
- [ ] 拒否済みで再要求できない（`canAskAgain` が false）とき、理由と「端末の設定でカメラを許可してください」の案内、「設定を開く」ボタン（`Linking.openSettings()`）を表示する
- [ ] 上記どちらの権限エラー状態でも「ISBN を手入力する」ボタンで `router.replace('/record/isbn')` に遷移でき、「キャンセル」で戻れる

### 導線・設定
- [ ] 記録一覧に「バーコードで読み取って追加」ボタンがあり、押すと `/record/scan` に遷移する（既存の「追加」「ISBN で探して追加」は従来どおり）
- [ ] `app.json` の `plugins` に `expo-camera`（`cameraPermission` に日本語の利用目的）が追加されている
- [ ] 画面は `BookLookupProvider` インターフェースだけに依存し、openBD 固有のものを参照しない

## 画面・振る舞い

### 記録一覧
「ISBN で探して追加」の下に「バーコードで読み取って追加」ボタン → `router.push('/record/scan')`。

### バーコード読み取り（`/record/scan`、スタック画面、ヘッダ「バーコード読み取り」）
状態: `permission_loading` → `permission_needed` / `permission_denied` / `scanning` → `searching` → （成功で `router.replace`）/ `not_found` / `error`。

- `permission_loading`: `ActivityIndicator` のみ
- `permission_needed`: 理由文「バーコードを読み取るためにカメラを使います」＋「カメラを許可する」＋「ISBN を手入力する」＋「キャンセル」
- `permission_denied`: 理由文＋「端末の設定でカメラを許可してください」＋「設定を開く」＋「ISBN を手入力する」＋「キャンセル」
- `scanning`: 全画面のカメラ、上に説明文、下に「キャンセル」。検出ごとに `isbnFromBarcode` で判定し、`null` は無視。有効なら状態を `searching` にして検索
- `searching`: カメラは表示したまま（または暗転）で中央にローディング。以降の検出は無視
- `not_found` / `error`: カメラを外し、メッセージと操作ボタン（上記）を表示
- 二重検索防止: 「処理済み」を `ref`（検索開始時に即セット）で持つ。`state` の更新を待たず同期的に判定するため、連続検出イベントが来ても 1 回しか検索しない。「もう一度読み取る」で `ref` を解除して `scanning` に戻す。`onBarcodeScanned` は `scanning` 以外では `undefined` を渡して検出自体を止める
- アンマウント後の検索結果は無視（`active` フラグ。#5 の ISBN 画面と同じ）
- 成功時は #5 と同様 `router.replace`。戻る・保存後は一覧に戻る

## 設計

### 追加・変更するファイル（すべて `app/` 配下）

| ファイル | 内容 |
|---|---|
| `src/lib/barcode.ts` | `isValidEan13(code: string): boolean`、`isbnFromBarcode(scan: { type: string; data: string }): string \| null`。`type` は expo-camera の `BarcodeScanningResult.type`（`'ean13'`）と比較する。チェックディジットは重み 1,3 交互の標準計算で、#5 の `lib/isbn.ts` と重複させないため、既存に EAN-13 検証関数があれば再利用し、なければ `lib/isbn.ts` へ `isValidEan13` を置いて `barcode.ts` から使う（実装時に確認） |
| `src/hooks/useIsbnSearch.ts`（新規、任意） | #5 の `IsbnLookupScreen` の検索ロジック（Provider 呼び出し、状態、`router.replace` の params 組み立て）を共通化できるなら hook に切り出す。切り出すと #5 のコードに触れるため、**差分が小さく #5 のテストを変えずに済む場合だけ**行い、難しければ本画面で `bookInfoToParams` / `isbnOnlyParams` を使って実装する |
| `src/screens/BarcodeScanScreen.tsx` | 上記画面。`useCameraPermissions`、`CameraView`（`expo-camera`）、`useBookLookup()`、`router`、`Linking.openSettings` を使う。ISBN の検索結果の params は #5 の `lib/isbnLookupParams.ts` を再利用 |
| `src/app/record/scan.tsx` | 薄いルート（default export は Expo Router の例外） |
| `src/app/_layout.tsx`（変更） | Stack に `record/scan`（ヘッダ「バーコード読み取り」）を追加 |
| `src/screens/RecordsScreen.tsx`（変更） | 「バーコードで読み取って追加」ボタン |
| `app.json`（変更） | `plugins` に `["expo-camera", { "cameraPermission": "本のバーコードを読み取るためにカメラを使用します", "microphonePermission": false, "recordAudioAndroid": false }]` を追加。音声は使わないためマイク権限は要求しない |
| `src/theme.ts`（必要なら） | 画面で複数箇所使う色（カメラ上のオーバーレイ等）を定数化 |

### 状態管理・データ
- 画面内の `useState`（状態）と `useRef`（処理済みフラグ）のみ。永続化なし、ライブラリ追加なし（下記のカメラ以外）。
- 画面間の受け渡しは #5 と同じ route params。

### 追加する依存
- **`expo-camera`**（`npx expo install expo-camera` で SDK 58 互換版を入れる。`app/AGENTS.md` に従い、実装前に <https://docs.expo.dev/versions/v58.0.0/sdk/camera/> で API を確認すること）
  - 理由: Expo SDK 公式のカメラライブラリ。`CameraView` が EAN-13 のバーコード読み取り（`barcodeScannerSettings` / `onBarcodeScanned`）と権限 hook（`useCameraPermissions`）を持ち、config plugin で権限文言を設定できる。EAS Build にそのまま乗る。
  - 代替: `expo-barcode-scanner`（SDK 51 以降で非推奨・削除済みで `expo-camera` に統合）、`react-native-vision-camera`（高機能だが Expo の config plugin・ネイティブ設定が重く、要件に対して過剰）。いずれも却下。

## テスト方針

| 受け入れ条件 | テスト |
|---|---|
| バーコード判定（978/979 採用、192 除外、チェックディジット、桁数・文字種・type） | `src/lib/__tests__/barcode.test.ts` |
| 読み取り → Provider 呼び出し → `router.replace` の params、無視されるバーコード、連続検出で 1 回、見つからない・エラー・再試行・手入力・再読み取り（同じコードの再検出）、キャンセル、検索中表示 | `src/screens/__tests__/BarcodeScanScreen.test.tsx`。`expo-camera` を `jest.mock` し、`CameraView` を受け取った `onBarcodeScanned` / `barcodeScannerSettings` props を取り出せるモックコンポーネントにする（テストから `onBarcodeScanned` を直接呼んで検出を再現）。偽 Provider は `BookLookupContextProvider` で注入、`expo-router` もモック |
| 権限（読み込み中 / 未許可 → 要求 → 許可 / 拒否 + 設定を開く / 手入力へ切り替え / キャンセル） | 同上。`useCameraPermissions` のモックの戻り値を切り替える。`Linking.openSettings` は `jest.spyOn` |
| 一覧のボタン導線 | `src/screens/__tests__/RecordsScreen.test.tsx` に追加 |
| `app.json` の plugin 設定 | 自動テストなし（`expo export` / `expo-doctor` が CI の `build` / `dependencies` で確認）。実機でのカメラ動作は CI 外で、判断ログに未確認と明記 |

差分カバレッジ 80% のため、画面の全状態と `barcode.ts` の分岐を網羅する。jest・eslint・tsconfig・CI 設定は変更しない。

## 判断ログ

1. **バーコード読み取りは独立した画面 `/record/scan` とし、一覧に別ボタンを置く**（#5 の判断 2 と同じ方針）。却下: 「追加」押下後の選択シート（#5 と同様、タップが増えテストしづらい）。ボタンが 3 つに増えるため、整理するなら別 Issue で「追加」の選択画面にまとめる。
2. **ライブラリは `expo-camera`**。理由・代替案は「追加する依存」に記載。
3. **検索ロジックは #5 の `BookLookupProvider` を再利用し、openBD を直接参照しない**。結果の params 組み立ては #5 の `lib/isbnLookupParams.ts` を共用。検索ロジックの hook 化は #5 のコードを大きく動かさない範囲に限る（#5 の未マージ分に触れてコンフリクトや手戻りが出るのを避けるため。重複が小さいなら画面ごとに持つ）。
4. **EAN-13 以外・978/979 以外・192 始まりは黙って無視して読み取りを続ける**（Issue の「無視し、読み取りを続ける」）。エラー表示は出さない。`barcodeTypes: ['ean13']` で読み取り対象も絞る（ISBN-13 は EAN-13）。978/979 の採用は `isbnFromBarcode` で判定するため、192 は 978/979 でないことで自然に除外されるが、受け入れ条件に明記しテストでも固定する。
5. **二重検索防止は `ref` による同期フラグ + `scanning` 以外で `onBarcodeScanned={undefined}`**。`useState` だけだと、更新が反映される前に届く連続イベントで複数回検索が走りうるため。「もう一度読み取る」でフラグを解除する（同じバーコードを意図的に再読み取りできる）。
6. **権限の扱い**: `useCameraPermissions` を使い、未許可（再要求可）→ 説明 + 許可ボタン、拒否済み（`canAskAgain: false`）→ 設定への案内（`Linking.openSettings()`）。どちらも ISBN 手入力（`router.replace('/record/isbn')`）に切り替え可能。`replace` にするのは、手入力画面から戻ったときカメラ画面に戻らず一覧に戻るため（#5 の判断 1 と同じ）。画面表示時に自動で権限を要求せず、読み込み完了後に未許可なら説明を見せてから要求する（理由を示す前にダイアログを出さないため）。
7. **`app.json` の plugin 設定**: 利用目的は日本語「本のバーコードを読み取るためにカメラを使用します」。マイクは使わないので `microphonePermission: false`、`recordAudioAndroid: false`（不要な権限要求を避ける）。`app.json` は保護対象ではなく Issue でも変更可と明記されている。
8. **キャンセルは `router.back()`**。読み取り画面は一覧から `push` するため戻り先は一覧。
9. **文言は推測で決定**: 「バーコードで読み取って追加」「バーコード読み取り」「本のバーコード（978 または 979 で始まる段）を枠に合わせてください」「書誌情報を検索中…」「カメラを許可する」「設定を開く」「ISBN を手入力する」「もう一度読み取る」。「見つかりませんでした」「再試行」「手入力で続ける」「書誌情報を取得できませんでした。通信状況を確認してください」は #5 と揃える。
10. **#5 が未マージの場合の扱い**: 本仕様は #5 の仕様書の名前・ファイル構成に依存する。実装時に #5 の実装と名前が異なっていたら、実装側の名前に合わせ、差異を PR の判断ログに書く（質問で止まらない）。
11. **実機でのカメラ動作は検証できない**（ヘッドレス環境・開発サーバー禁止）。`expo-camera` はテストでモックし、実機確認は人間のレビューに委ねる。
12. **CLAUDE.md・jest 設定・CI 設定の変更は不要と判断**。
