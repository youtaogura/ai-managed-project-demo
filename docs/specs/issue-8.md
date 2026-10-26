# Issue #8 写真を1枚付ける（書影を初期値に）

## 背景・目的

記録にイメージを付けて一覧で見分けやすくする。現状は `MediaRecord.photoUri`（`string | null`）と、優先順位「写真 → 書影 → プレースホルダー」で表示する `Thumbnail` / `lib/thumbnail.ts` が #4 で実装済みだが、`photoUri` を設定する手段がない（フォームは値を保持して素通しするだけ）。本 Issue で、カメラ撮影／ライブラリ選択で写真を 1 枚付け、アプリ専用領域にコピーして永続化し、置き換え・削除時に古いファイルを消せるようにする。

## スコープ

### やること
- 記録フォームに「写真」セクションを追加（プレビュー、「カメラで撮影」「ライブラリから選択」「写真を削除」）。詳細画面からの編集（`/record/[id]` の編集フォーム）でも同じフォームを使うため、フォーム・詳細・一覧で写真が反映される。
- 選んだ画像を `expo-file-system` でアプリ専用ディレクトリ（`Paths.document/photos/`）へコピーし、そのコピーの URI を `photoUri` に保存する。
- 置き換え・削除・記録削除・フォーム破棄（未保存のまま離脱）時に不要になったファイルを削除する。
- カメラ／ライブラリの権限がないとき、理由と設定への案内を表示する。
- 画像選択・ファイル保存を `lib/photo` モジュールに分離し、テストではモックする。

### やらないこと
- 複数枚の写真、画像編集（トリミング等。`allowsEditing` は false）
- 書影画像の端末保存（書影は URL のまま表示）
- 一覧・詳細画面への直接の撮影ボタン（編集フォーム経由）
- 既存データのマイグレーション（`photoUri` は既にスキーマにある）

## 受け入れ条件

- [ ] フォームに「カメラで撮影」「ライブラリから選択」ボタンがある。写真が無いとき「写真を削除」は出ない
- [ ] ライブラリ選択（またはカメラ撮影）で画像を選ぶと、アプリ専用領域へコピーされ、フォームのプレビューにその写真が表示される（書影があっても写真が優先）
- [ ] 保存すると `photoUri` にコピー後の URI が入り、一覧（`RecordListItem`）・詳細に書影の代わりにその写真が表示される
- [ ] 選択をキャンセルした場合、何も変わらない
- [ ] 写真は 1 枚のみ。新しく選ぶと置き換わり、置き換え前に付いていた写真ファイルが削除される
- [ ] 「写真を削除」で `photoUri` が null になり、書影があればプレビュー・一覧が書影表示に戻る（書影が無ければプレースホルダー）
- [ ] 保存済みの写真を置き換え／削除した場合、古いファイルの削除は**保存が成功した後**に行う（保存前に離脱しても保存済みの写真は失われない）
- [ ] 未保存のまま新しく選んだ写真は、再選択・削除・フォーム破棄（アンマウント時に保存されていなければ）でファイルを削除する
- [ ] 記録を削除すると、その記録の写真ファイルも削除される（詳細画面の削除・フォームの削除の両方）
- [ ] 権限が拒否されたとき、「カメラ（または写真ライブラリ）へのアクセスが許可されていません」旨の理由と「設定を開く」ボタンを表示する。`canAskAgain` が true の場合は押下で再度許可を要求する
- [ ] コピー・選択処理が例外を投げた場合、「写真を保存できませんでした」を表示し、既存の写真は維持される
- [ ] 画像選択・保存処理は `PhotoService` として分離され、テストではモックされている
- [ ] `pnpm check` が通る（カバレッジ・差分カバレッジを満たす）

## 画面・振る舞い

フォーム（既存の「感想」の上あたりに配置）:
- 「写真」ラベル。`Thumbnail`（`photoUri` → `coverUrl` → プレースホルダー）で現在の表示をプレビュー。
- ボタン: 「カメラで撮影」「ライブラリから選択」。`photoUri` があるときだけ「写真を削除」。
- 選択フロー: 権限確認（カメラのみ要求。ライブラリは Android/iOS のピッカーが権限不要のため要求しない）→ ピッカー起動 → キャンセルなら終了 → 結果 URI をアプリ専用領域へコピー → フォームの `photoUri` を更新 → 旧の未保存コピーがあれば削除。
- 権限拒否: エラー領域に文言＋「設定を開く」（`Linking.openSettings()`）。
- 処理中は選択ボタンを無効化。失敗は赤字の文言（`failure` と別の `photoError` 状態）。
- 削除ボタン: フォームの `photoUri` を null にするだけ（ファイル削除は保存成功後）。ただし未保存の新規コピーは即削除。

ファイル削除の管理（フォーム内）: 
- `initialPhotoUri`（フォーム開始時の値）、`pendingNew`（このセッションで作成した未保存コピーの集合）を `useRef` で保持。
- 保存成功後: `initialPhotoUri` が現在値と異なれば `initialPhotoUri` を削除。
- アンマウント時: 保存済みフラグが false なら `pendingNew` を全削除。
- 削除（記録削除）成功後: `initialPhotoUri` を削除（`RecordDetailScreen` は記録の `photoUri` を削除）。

## 設計

### 追加ライブラリ（実装工程で `npx expo install` で追加）
| パッケージ | 理由 |
|---|---|
| `expo-image-picker` | カメラ撮影・ライブラリ選択・権限要求を提供する Expo 公式。SDK 58 対応版を `expo install` で解決。`mediaTypes: ['images']`（`MediaTypeOptions` は非推奨） |
| `expo-file-system` | 選択画像をアプリ専用領域へコピー・削除する。`expo` の依存として既に node_modules にあるが `package.json` に明記するため追加（新 API: `File` / `Directory` / `Paths`。旧 API は runtime で throw するため使わない） |

代替案: `react-native-image-picker`（Expo 管理外・config plugin 非対応で却下）、`expo-image-manipulator`（編集しないため不要）、AsyncStorage に base64 保存（容量・性能で却下）、`expo-media-library`（端末ギャラリーへの保存は不要）。
`app.json` の `plugins` に `expo-image-picker`（`photosPermission` / `cameraPermission` を日本語で、`microphonePermission: false`）を追加する（`app.json` は保護対象外）。

### 変更・追加ファイル
- `src/lib/photo/PhotoService.ts`: インターフェース
  ```ts
  type PickResult = { status: 'picked'; uri: string } | { status: 'canceled' } | { status: 'denied'; canAskAgain: boolean };
  type PhotoSource = 'camera' | 'library';
  type PhotoService = {
    pick(source: PhotoSource): Promise<PickResult>;   // 選択（権限確認含む）。コピーはしない
    save(sourceUri: string): Promise<string>;         // アプリ専用領域へコピーし新 URI を返す
    remove(uri: string): Promise<void>;               // 存在すれば削除。失敗・不在は握りつぶす
  };
  ```
- `src/lib/photo/ExpoPhotoService.ts`: 実装（`expo-image-picker` / `expo-file-system`）。保存先 `Paths.document/photos/<timestamp>-<random>.<拡張子>`。`remove` は `photos/` 配下の URI のみ削除（書影 URL や他ファイルを消さない安全策）。
- `src/lib/photo/index.ts`: `expoPhotoService` の export。
- `src/hooks/usePhotoService.tsx`: `useBookLookup` と同様の Context + Provider（テストでモック注入）。`testProviders.tsx` と `_layout.tsx` に Provider を追加。
- `src/components/PhotoField.tsx`: 写真セクション UI（プレビュー・ボタン・エラー表示）。props: `record` 相当（`kind` `photoUri` `coverUrl`）、`onChange(uri | null)`。
- `src/components/RecordForm.tsx`: `PhotoField` を組み込み、上記ファイル削除管理を実装。`onSubmit` 成功後・`onDelete` 成功後に削除。
- `src/screens/RecordDetailScreen.tsx`: 記録削除成功後に `photoService.remove(record.photoUri)`。
- `app/app.json`: プラグイン追加。
- `src/lib/recordForm.ts`: 変更なし想定（`photoUri` は既に `RecordFormValues` にあり保存される）。

### 状態管理・データ構造
React の state / ref のみ。`MediaRecord.photoUri` に保存（既存）。ストレージ形式の変更なし。

## テスト方針

`PhotoService` をモック（`jest.fn`）して `RecordRepositoryProvider` と一緒に注入する。`ExpoPhotoService` は `expo-image-picker` / `expo-file-system` を `jest.mock` して単体テスト。

| 受け入れ条件 | テスト |
|---|---|
| ボタン表示・削除ボタンの出し分け | `PhotoField.test.tsx` / `RecordForm.test.tsx` |
| 選択 → save → プレビュー（写真優先） | `RecordForm.test.tsx`: ライブラリ選択後に `サムネイル` の uri が保存先 URI（書影より優先） |
| 保存で `photoUri` 反映、一覧・詳細に表示 | `RecordForm.test.tsx`（onSubmit の入力）、`RecordFormScreen.test.tsx` / ルート結合テストで一覧表示 |
| キャンセル | `PhotoField` / `RecordForm`: 状態不変、`save` 未呼び出し |
| 置き換えで旧ファイル削除（保存後） | `RecordForm.test.tsx`: 保存前は `remove` 未呼び出し、保存成功後に旧 URI で呼ばれる |
| 写真削除 → 書影に戻る | `RecordForm.test.tsx` |
| 未保存の新規コピーの削除（再選択・削除・アンマウント） | `RecordForm.test.tsx` |
| 記録削除で写真削除 | `RecordDetailScreen.test.tsx`、`RecordForm.test.tsx`（onDelete） |
| 権限拒否の文言・設定導線・`canAskAgain` | `PhotoField.test.tsx`（`Linking.openSettings` をモック） |
| 例外時の文言・既存写真維持 | `RecordForm.test.tsx` |
| `ExpoPhotoService` の権限・コピー先・`photos/` 外を消さない | `lib/photo/__tests__/ExpoPhotoService.test.ts` |

## 判断ログ

1. **画像ライブラリ**: `expo-image-picker` + `expo-file-system` を採用。Expo SDK 58 で公式に保守され config plugin で権限文言を設定できるため。却下: `react-native-image-picker`（Expo 管理外）、`expo-media-library`（ギャラリー保存は要件外）。
2. **新 `expo-file-system` API（`File`/`Directory`/`Paths`）を使う**: SDK 58 では旧関数 API が runtime で throw するため。
3. **ファイル削除のタイミング**: 保存成功後に旧ファイルを削除。理由: 保存前に消すと、キャンセル／保存失敗で記録が存在しない写真を指す。未保存の新規コピーはフォーム破棄時に消して孤児ファイルを防ぐ。却下: 選択時に即旧ファイル削除（データ損失リスク）。
4. **ライブラリ選択では権限を要求しない**: 公式ドキュメント上、画像選択は権限不要（システムのピッカー）のため。カメラのみ権限要求・拒否時案内。ただし受け入れ条件の「ライブラリ権限なし」に対応するため、`pick` が `denied` を返した場合の UI は両ソース共通で実装・テストする。
5. **写真を付ける導線はフォーム（編集含む）に限定**: 詳細画面は既存の「編集」ボタンからフォームに入るため、Issue の「フォーム・詳細画面で付けられる」を満たすと解釈。却下: 詳細画面への直接の撮影ボタン（重複 UI で実装量が増える）。
6. **`PhotoService` を Context 注入にする**: 既存の `useBookLookup` / `useRecordRepository` の慣習に合わせ、テストでのモックを容易にするため。
7. **`remove` は `photos/` 配下のみ削除**: `photoUri` に外部 URI が入っても誤削除しないため。
8. **`allowsEditing: false`, `quality: 0.8`**: 編集は非スコープ。容量削減のため品質 0.8（細部のため決定）。
