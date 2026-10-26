# Issue #56 すべての記録を削除する機能と「このアプリについて」を追加する

## 背景・目的

- 記録をやり直したいときのために、すべての記録をまとめて削除できるようにする。誤操作を防ぐため、目立たない場所（データ画面の最下部）に置き、確認の前に書き出しを勧める。
- 書誌情報・書影・映画情報の取得元が求める表記と、使っているライブラリのライセンスを表示する場所として「このアプリについて」を作る。

デザイン: `docs/design-system/screens/README.md`「データ」「すべての記録を削除」「このアプリについて」（`settings-data.png` `delete-all.png` `about.png`）。

### 現状（コード上の事実）
- 記録は `lib/recordRepository.ts`（`RECORDS_STORAGE_KEY` に JSON 配列、書き込みは `serialize` で直列化）。`delete(id)` は 1 件削除のみ。1 件削除（`RecordDetailScreen`）は `PhotoService.remove(uri)` で写真を消す（失敗・不在は握りつぶす）。
- 設定は `settingsStore`（別キー）。記録を消しても影響しない。「最後に書き出した日」も別キー（`exportStore`）。
- `DataScreen`（#55）は件数・書き出し・読み込みまで実装済み。`ExportSheet` と `exportOpen` state を持つ。
- `SettingsScreen` の最後のカードは「データ」だけ。`SettingsRow`（ラベル・値・›）がある。ルートは `app/src/app/(tabs)/settings.tsx`、データ画面は `app/src/app/data.tsx`（Stack・`headerShown: false`、画面側で `ScreenHeaderBar`）。
- `lib/haptics.ts` に `triggerImpactHaptic()`。`BottomSheet` / `Button`（`variant`、`tone="danger"`）/ `DeleteConfirmSheet` が既存。
- #72 の結果、書影の取得元は openBD だけ。タイトル検索は NDL サーチ（`NdlSearchProvider.attribution`）、映画等の検索は TMDb（`TMDB_ATTRIBUTION` が「このアプリについて」から再利用できるよう export 済み）。
- `expo-constants` は導入済み。`app.json` の `name` は「AI Managed Demo」、`version` は 1.0.0。`eas.json` は `appVersionSource: remote`（ビルド番号はビルドサービス側の管理で `app.json` には無い）。
- フォントは `assets/fonts/`（Noto Sans JP・しっぽり明朝。`OFL.txt` あり）。

## スコープ

### やること
1. データ画面の最下部に、文字だけのリンク「すべての記録を削除」（記録が 1 件以上のときだけ）。タップで確認 `BottomSheet`。
2. 確認シート: 件数と説明、「先に書き出す」「キャンセル」「すべて削除する」。
3. 「すべて削除する」で、全記録と、記録に付いた写真ファイルを削除。設定・「最後に書き出した日」は残す。削除後は記録一覧タブへ戻り、触覚フィードバックを 1 回。
4. 設定画面の最後のカードに「このアプリについて」の行（右にバージョン）。タップで「このアプリについて」画面（`/about`）。
5. 「このアプリについて」画面: アプリ名、バージョン（ビルド番号）、データの出典、「オープンソースライセンス」への行、プライバシーの説明。
6. 「オープンソースライセンス」画面（`/licenses`）: 使っているライブラリの名前・バージョン・ライセンスの一覧。一覧は依存関係から自動生成する。

### やらないこと
- 利用規約・プライバシーポリシーの全文、お問い合わせ、レビューのお願い
- 推移的依存（依存の依存）を含むライセンス全文の表示（判断ログ 5）
- 設定のリセット、写真以外のファイル掃除、アプリ名（`app.json` の `name`）の変更（判断ログ 7）

## 受け入れ条件

### 削除の実行（`lib/deleteAllRecords.ts`、リポジトリ）
- [ ] `recordRepository.deleteAll()` を追加。削除した記録の配列を返し、保存は 1 回の `setItem('[]')`。書き込みは既存どおり `serialize` で直列化される。`setItem` が失敗したら reject し、記録は変わらない
- [ ] `deleteAllRecords({ repository, photoService })`: `repository.deleteAll()` が成功したあと、返された記録の `photoUri`（非 null）すべてに `photoService.remove` を呼ぶ。`photoUri` が null の記録には呼ばない。0 件なら何も呼ばない。戻り値は削除した件数
- [ ] 記録の削除に失敗したら reject し、写真は 1 つも消さない
- [ ] 写真の削除が 1 件失敗しても（`remove` が reject しても）残りの写真の削除を続け、全体は成功として返す
- [ ] 設定（`settingsStore`）と「最後に書き出した日」は変わらない

### データ画面（`DataScreen`）
- [ ] 記録が 1 件以上あるとき、最下部に「すべての記録を削除」が出る。`accessibilityRole="button"`、タップ領域 44px 以上、文字は `colors.danger`、枠・面なし
- [ ] 記録が 0 件のときは「すべての記録を削除」を表示しない
- [ ] タップすると確認シートが開く。見出し「すべての記録を削除しますか？」、本文「N 件の記録と、付けた写真がすべて削除されます。元に戻せません。設定はそのまま残ります。」（N は全件数。使わない種別の記録も含む）
- [ ] 「すべて削除する」で、全記録と写真ファイル（`photoService.remove`）が削除され、設定は残り、触覚フィードバックが 1 回呼ばれ、記録一覧へ戻る（`router` の呼び出しを検証）。`useRecords` の結果が空になる
- [ ] 「キャンセル」とシートを閉じる操作（`BottomSheet` の `onClose`）では、記録も写真も消えず、触覚フィードバックも呼ばれない
- [ ] 「先に書き出す」で確認シートが閉じ、書き出しのシート（`ExportSheet`）が開く。この時点では何も削除されない。書き出しのシートを閉じても確認シートは自動で再表示しない（もう一度リンクから開く）
- [ ] 削除中（`busy`）はシートの 3 つのボタンが押せず、二重に実行されない
- [ ] 削除に失敗したとき、シートを閉じ、画面に「削除できませんでした。記録は変わっていません」（`alert`）を出す。画面遷移・触覚フィードバックはしない

### このアプリについて（`AboutScreen`、ルート `app/about.tsx`）
- [ ] 設定画面の最後のカードに「このアプリについて」の行がある。2 行目（値）はバージョン（例 `1.0.0`）。`accessibilityRole="button"`、タップで `/about` へ遷移。他の行は変わらない
- [ ] ヘッダー（戻るボタン付き・タイトル「このアプリについて」）、アプリ名、「バージョン 1.0.0（12）」（ビルド番号があるとき）／「バージョン 1.0.0」（ないとき）
- [ ] 「データの出典」に次の行がある:
  - 「openBD」: 書誌情報・書影（ISBN から）
  - 「国立国会図書館サーチ」: タイトル検索
  - 「TMDb」: 映画などの検索。補足に `TMDB_ATTRIBUTION` の英文
  - 「Noto Sans JP / しっぽり明朝」: フォント（SIL Open Font License）
- [ ] 書影の取得元は openBD のみ。「国立国会図書館サーチ」の行に「書影」と書かない（#72）
- [ ] 「オープンソースライセンス」の行（›）。タップで `/licenses` へ
- [ ] プライバシーの説明「記録はこの端末の中にだけ保存され、外部に送られることはありません。書誌情報や映画情報を探すときだけ、ISBN やキーワードを上の出典に問い合わせます。」が表示される

### オープンソースライセンス（`LicensesScreen`、ルート `app/licenses.tsx`）
- [ ] ヘッダー付き。`licenses.json` の全パッケージについて、名前・バージョン・ライセンス名が一覧に出る
- [ ] 一覧データ `app/src/generated/licenses.json` は `app/scripts/gen-licenses.mjs`（`pnpm licenses:gen`）が `package.json` の `dependencies` と `node_modules/<pkg>/package.json` から生成する。手で書かない
- [ ] 同期テスト: `licenses.json` の名前の集合が `package.json` の `dependencies` と完全に一致し、各エントリの `version` が `node_modules` の実バージョンと一致、`license` が空でない。依存を足して一覧を更新し忘れるとテストが落ちる
- [ ] `parseLicenseList(json)`（`lib/licenses.ts`）は型ガードで検証し、不正な要素（文字列でないフィールド）を捨てる。配列でなければ空配列
- [ ] `devDependencies` は含めない（アプリに同梱されないため）。ライセンスが読めないパッケージは `'不明'`（スクリプト側で正規化）

### バージョン表示（`lib/appInfo.ts`）
- [ ] `formatVersion(version, build)`: build があれば `1.0.0（12）`、なければ `1.0.0`。version も取れなければ `不明`
- [ ] `getAppInfo()` は `expo-constants` から `{ name, version, build }` を返す。version は `Constants.nativeAppVersion ?? expoConfig?.version`、build は `Constants.nativeBuildVersion`、name は `expoConfig?.name`（なければ「このアプリ」）

## 画面・振る舞い

### データ画面の最下部
```
[ 説明文（#55） ]
        すべての記録を削除      ← danger の文字だけ。中央寄せ、上に十分な余白（space[6] 以上）
```
- 確認シート（`DeleteAllSheet`）:
  - 見出し「すべての記録を削除しますか？」
  - 本文（`colors.textSecondary`）
  - ボタンを縦に: 「先に書き出す」（白い面。`Button` の既存 variant から選ぶ）、「キャンセル」（`outline`）、「すべて削除する」（`outline` + `tone="danger"`）
- 状態: `deleteOpen` / `deleting`。「先に書き出す」は `setDeleteOpen(false); setMessage(null); setExportOpen(true)`。
- 削除成功: シートを閉じ → `triggerImpactHaptic()` を 1 回 → `reload()`（件数を 0 に）→ 記録一覧タブへ移動。
  移動は `router` で行い、データ画面を閉じて tabs の記録一覧（`/`）が出るようにする。API は `app/AGENTS.md` に従い SDK 58 の Expo Router ドキュメントで確認して選ぶ（`router.dismissTo('/')` か `router.navigate('/')` を想定。`dismissAll` は避ける）。テストは `expo-router` の `router` をモックし、呼び出しを検証する。
- 失敗: 上記のとおり。やり直しはリンクから。

### 設定画面
「データ」カードの下に、別カード「このアプリ」を置く（判断ログ 3）。`SettingsRow` の `label="このアプリについて"`、`value=` バージョン。

### このアプリについて画面
上から: 3 本の縦棒マーク（デザインにあるもの。`View` 3 つ、色は `colors` のトークン）、アプリ名、バージョン、「データの出典」の `SettingsCard`（行は押せない。名前＋補足の 2 行）、「オープンソースライセンス」行（› 付き）、プライバシーの説明（`micro`、`textTertiary`）。スクロール可。

### ライセンス画面
`FlatList` で 1 パッケージ 1 行（名前、`バージョン · ライセンス名`）。

## 設計

### 追加
- `app/src/lib/deleteAllRecords.ts` — `deleteAllRecords({ repository, photoService }): Promise<number>`
- `app/src/components/DeleteAllSheet.tsx` — props: `visible` `count` `busy` `onExport` `onCancel` `onConfirm`。`DeleteConfirmSheet` と同じ作り
- `app/src/screens/AboutScreen.tsx`、`app/src/screens/LicensesScreen.tsx`
- `app/src/app/about.tsx`、`app/src/app/licenses.tsx`（`data.tsx` と同じ作り）
- `app/src/lib/appInfo.ts` — `formatVersion` `getAppInfo`
- `app/src/lib/licenses.ts` — `LicenseEntry`、`parseLicenseList(json)`（`licenses.json` を型ガードで読む）。`licenses.json` は `import` で読む（`resolveJsonModule` が使えない場合は `require` ＋ `parseLicenseList` で絞り込む。`tsconfig.json` は変更不可）
- `app/scripts/gen-licenses.mjs` — Node 標準の `fs` / `path` だけで、`package.json` の `dependencies` を読み、各パッケージの `package.json` から `version` と `license`（`licenses` 配列・`{ type }` 形式も許容、無ければ `'不明'`）を取り、名前順に `src/generated/licenses.json` へ書く
- `app/src/generated/licenses.json` — 生成物（コミットする。ビルドで生成を要求しないため）
- `app/package.json` の `scripts` に `"licenses:gen": "node scripts/gen-licenses.mjs"` を追加（`pnpm check` には入れない）
- テスト: `lib/__tests__/deleteAllRecords.test.ts`、`lib/__tests__/recordRepository.test.ts`（追記）、`lib/__tests__/appInfo.test.ts`、`lib/__tests__/licenses.test.ts`（同期テスト含む）、`components/__tests__/DeleteAllSheet.test.tsx`、`screens/__tests__/DataScreen.test.tsx`（追記）、`screens/__tests__/SettingsScreen.test.tsx`（追記）、`screens/__tests__/AboutScreen.test.tsx`、`screens/__tests__/LicensesScreen.test.tsx`

### 変更
- `lib/recordRepository.ts` — `deleteAll()` を型と実装に追加
- `screens/DataScreen.tsx` — リンク・`DeleteAllSheet`・削除処理。`usePhotoService()` を使う（`_layout.tsx` に `PhotoServiceContextProvider` は既にある）。DataScreen の既存テストの Provider に `PhotoServiceContextProvider`（フェイク）を足す
- `screens/SettingsScreen.tsx` — props に `onOpenAbout?: () => void` を追加、カードと行を追加。`app/(tabs)/settings.tsx` で `router.push('/about')`

### 状態管理
画面内の `useState` のみ。

### 新しいライブラリ
**追加しない**（`expo-constants` `expo-haptics` `expo-router` は導入済み）。ライセンス一覧の生成にも license-checker 系の外部パッケージは使わず、自前のスクリプトで行う。

### データ構造
```ts
type LicenseEntry = { name: string; version: string; license: string };
// licenses.json: LicenseEntry[]（名前の昇順）
```

## テスト方針

| 受け入れ条件 | テスト |
|---|---|
| deleteAll の原子性・直列化・失敗時不変 | `recordRepository.test.ts`（フェイク storage の `setItem` を失敗させる） |
| 写真の削除（null は呼ばない、1 件失敗しても続行、記録削除失敗なら呼ばない）、設定が残る | `deleteAllRecords.test.ts`（フェイク `PhotoService`、実の `settingsStore` と storage） |
| リンクの表示・0 件で非表示・44px・danger | `DataScreen.test.tsx` |
| 確認シートの文言（件数）・キャンセル・閉じる・先に書き出す・二重実行防止 | `DataScreen.test.tsx`、`DeleteAllSheet.test.tsx` |
| 削除成功（記録・写真・設定・haptics 1 回・遷移・一覧が空） | `DataScreen.test.tsx`（`expo-haptics` と `router` をモック、実リポジトリ） |
| 削除失敗のメッセージ | `DataScreen.test.tsx`（`deleteAll` が reject するフェイク） |
| 設定画面の行・バージョン・遷移 | `SettingsScreen.test.tsx` |
| About の表示内容・TMDb 表記・書影は openBD のみ・遷移 | `AboutScreen.test.tsx` |
| バージョン整形 | `appInfo.test.ts` |
| ライセンス一覧の表示と同期 | `LicensesScreen.test.tsx`、`licenses.test.ts`（`package.json` と `node_modules` を `fs` で読む） |

`gen-licenses.mjs` は `src/` 外で Jest のカバレッジ対象外。生成結果の整合は同期テストが担保する。

## 判断ログ

1. **記録 0 件のときは「すべての記録を削除」を出さない。** 却下: 押せない（disabled）表示。理由: 目立たせない方針に合い、押せないリンクは理由が伝わらない。
2. **削除の順序は「記録 → 写真」。** 却下: 写真 → 記録。写真を先に消して記録の削除が失敗すると、存在しない写真を指す記録が残る。逆なら失敗しても孤立ファイルが残るだけ。`PhotoService.remove` は失敗を握りつぶす契約なので、写真の失敗で全体を失敗にしない。対象の写真は `deleteAll()` が返す記録から取る（取得と削除の間に追加された記録を取りこぼさない）。
3. **「このアプリについて」は「データ」カードの下の独立したカードにする。** 却下: 「データ」カードに同居させる案（無関係な項目が混ざる）。
4. **ライセンス一覧は `dependencies` を自前スクリプトで生成し、生成物をコミットする。** 却下: (a) 手書きのリスト（受け入れ条件に反する）、(b) ビルド時に毎回生成（CI に前処理が要るが `.github/` は変更できない）、(c) license-checker 等の追加（依存が増える）。同期テストで更新漏れを検知する。依存を変えたら `pnpm licenses:gen` を実行する。
5. **推移的依存は一覧に含めない。** 数百件になり実用にならない。ライセンス全文の掲載義務（MIT の全文表示など）への対応が必要かは法務判断のため、PR 本文に人間への提案として残す。CI の `license-check`（許可リスト）は全依存を別に検査している。
6. **書影の出典は openBD に一本化。** #72 により NDL の書影と Google Books は無い。Issue の「書影の取得元（#51 で決まるもの）」は openBD の行に統合し、別行は作らない。NDL サーチはタイトル検索の出典として残す。
7. **アプリ名は `expoConfig.name`（現在「AI Managed Demo」）を表示する。** デザインは「Shelf Theater」だが、名前の変更はブランドに関わる人間の判断なので変えない。`app.json` を変えれば画面に反映される。PR 本文に提案として書く。
8. **TMDb の表記を出典に加える。** Issue にはないが、`TMDB_ATTRIBUTION` に「このアプリについてからも再利用できる」と明記されており、TMDb の利用規約が求める表記。
9. **バージョンは `Constants.nativeAppVersion` / `nativeBuildVersion`。** ビルド番号は `app.json` に無くネイティブ側の値が要る。Expo Go・Web では取れないことがあり、その場合は「バージョン 1.0.0」だけを出す。`expo-application` の追加は却下（`expo-constants` で足りる）。
10. **「先に書き出す」は確認シートを閉じて書き出しシートを開く。** 却下: 確認シートの上に重ねる（`BottomSheet` の多重表示は未検証）。書き出し後はリンクからやり直す。
11. **削除後の移動は `router.dismissTo('/')`。** SDK 58 の expo-router に `dismissTo` があり（`router.navigate` は積み上げる可能性があるため却下）、データ画面を閉じて記録一覧タブへ戻れる。`dismissAll` は使わない。テストは `router.dismissTo` のモックで検証。
12. **触覚フィードバックは既存の `triggerImpactHaptic()`。** Issue は「1 回」としか指定がない。通知系のフィードバックは新しい関数が要るため却下。
