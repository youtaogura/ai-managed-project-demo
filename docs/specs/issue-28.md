# Issue #28 【基盤】エージェントが実際の UI をスクリーンショットで確認できる環境を整える

## 背景・目的

エージェントは lint・型・Jest だけで検証しており、実際の画面を見ていない。テストが通っても見た目が直っていない修正（例: #18）が発生している。
フェーズ1として、Expo の Web 版をヘッドレス Chromium で描画し、スマートフォンのサイズ・セーフエリアを再現してスクリーンショットを撮れる環境を作る。

Issue 本文のとおり、この Issue は `orchestrator/` `docker/` `.github/` など保護対象の変更を含み、**エージェントに任せない**前提。
エージェントが変更できるのは `app/` と `docs/specs/` のみ（`orchestrator/policy.json` の `agentAllowedPaths`）なので、
本仕様書の実装範囲は **Issue の「1. アプリを Web で描画できるようにする（`app/`）」だけ**とし、残り（2〜5）は人間が対応するための引き渡し仕様として「人間向けの作業」に記載する。

## スコープ

### やること（エージェントの実装範囲 = `app/` のみ）
- Web 描画に必要な依存の追加（`npx expo install`）。Web 向けの静的エクスポート（`expo export --platform web`）が成功する状態にする。
- `app.json` の `web` 設定（`bundler: "metro"`, `output: "static"`）。`app.json` は保護対象外。
- Web で使えない機能（バーコード読み取り、必要なら写真の撮影・選択）の代替表示。画面全体を壊さない。
- プレビュー用セーフエリア再現: 環境変数 `EXPO_PUBLIC_PREVIEW_INSETS`（`上,右,下,左` の px）が設定されたときだけ、`SafeAreaProvider` の `initialMetrics` で余白を与える。

### やらないこと
- `orchestrator/tools/ui-preview`、Dockerfile / compose、プロンプト、ガード、CI ジョブの作成（人間が対応）
- `app/jest.config.js` `app/eslint.config.js` `app/tsconfig.json` `app/.npmrc` `app/eas.json` の変更
- ネイティブ表示の確認（フェーズ2）、ビジュアル回帰テスト
- ネイティブ（iOS/Android）の挙動変更。環境変数未設定時の挙動は現状と完全に同一にする

## 受け入れ条件

- [ ] `parsePreviewInsets("59,0,34,0")` は `{top:59,right:0,bottom:34,left:0}` を返す
- [ ] `parsePreviewInsets` は未設定（undefined/空文字）・要素数が 4 でない・数値でない・負数・非有限値のとき `null` を返す（例外を投げない）
- [ ] `EXPO_PUBLIC_PREVIEW_INSETS` が有効なとき、ルートレイアウト配下で `useSafeAreaInsets()` が指定した値を返す。未設定・不正値のときは余白を上書きしない（既存テストの挙動が変わらない）
- [ ] Web（`Platform.OS === 'web'`）でバーコード読み取り画面を開くと「この機能はスマートフォンでのみ使えます」と手入力への導線（「手入力で追加」）が表示され、`CameraView` は描画されない。カメラ権限リクエストも呼ばない
- [ ] ネイティブ（ios/android）では既存の BarcodeScanScreen のテストがすべて変更なしで通る
- [ ] 写真の撮影・選択を Web で呼んでも例外でクラッシュせず、ユーザーに分かるメッセージ（または何もしない）で終わる（実装時に `ExpoPhotoService` を確認して必要な範囲のみ対応）
- [ ] Web 向けの静的エクスポートが成功する（実装担当は手元で 1 回確認し、結果を PR 本文に書く。CI の `build` は iOS/Android のみのため必須ではない）
- [ ] `pnpm check` が通り、カバレッジ・差分カバレッジを満たす

## 画面・振る舞い

- **セーフエリア再現**: 通常のビルドでは何も変わらない。Web プレビュー時のみ `EXPO_PUBLIC_PREVIEW_INSETS=59,0,34,0` などで、ヘッダー・`ScreenContainer` が指定の上下余白を考慮して描画される。
- **バーコード読み取り（Web）**: 中央に説明文「この機能はスマートフォンでのみ使えます」とボタン「手入力で追加」（`/record/new` へ遷移）。ヘッダーは他画面と同様に表示。
- **エラー時**: 不正な環境変数値は無視して通常動作（ログも不要）。

## 設計

### 追加する依存（実装工程で `npx expo install` で追加。この名前以外は追加しない）
| パッケージ | 理由 |
|---|---|
| `react-native-web` | RN コンポーネントを Web で描画する |
| `react-dom` | `react-native-web` / Expo Router の Web 描画に必要 |
| `@expo/metro-runtime` | Expo Router の Web 対応で必須（Expo ドキュメントの Web 手順） |

代替案: Storybook や独立した HTML モック → 実アプリと乖離するため却下。いずれも Expo 公式の Web 対応手順に従う（`app/AGENTS.md` の指示どおり SDK 58 のドキュメントで要確認）。ライセンスは MIT のため許可リスト内。

### 変更・追加ファイル
- `app/package.json` / `pnpm-lock.yaml` … 上記依存
- `app/app.json` … `web.bundler: "metro"`, `web.output: "static"`
- `app/src/lib/previewInsets.ts` … `parsePreviewInsets(value: string | undefined): EdgeInsets | null`（型ガードで検証）
- `app/src/app/_layout.tsx` … `parsePreviewInsets(process.env.EXPO_PUBLIC_PREVIEW_INSETS)` が非 null のときだけ、`SafeAreaProvider initialMetrics={{ frame: {x:0,y:0,width,height}, insets }}` で子を包む。`frame` は `Dimensions.get('window')` を使う
  - 注意: Expo Router が内部でも `SafeAreaProvider` を持つため、入れ子の内側（こちら）が優先されることを実装時にテストで確認する
  - Web では `SafeAreaProvider` がマウント後に実測値（Web では 0）で上書きする可能性がある。その場合は `SafeAreaInsetsContext.Provider` で値を固定する方式に切り替え、判断ログに書く
- `app/src/screens/BarcodeScanScreen.tsx`（または `src/components/WebUnsupported.tsx`）… `Platform.OS === 'web'` なら代替表示を返す。フックの呼び出し順を崩さないよう、`BarcodeScanScreen` を「Web なら `UnsupportedOnWeb`、それ以外なら `NativeBarcodeScan`（既存本体）」に分割する
- `app/src/lib/photo/ExpoPhotoService.ts` … Web での挙動確認と必要最小限の防御

### 状態管理・データ構造
追加なし（環境変数と `Platform.OS` を静的に参照するのみ）。

## テスト方針

| 受け入れ条件 | テスト |
|---|---|
| parsePreviewInsets の正常・異常 | `src/lib/__tests__/previewInsets.test.ts` |
| insets の適用／未設定時の非干渉 | `src/__tests__/safe-area.test.tsx` に追加（`process.env` を設定し `renderRouter`。既存の同ファイルの流儀に合わせる） |
| Web 代替表示 | `src/screens/__tests__/BarcodeScanScreen.test.tsx` に追加（`Platform.OS` を `'web'` にモックし、文言・遷移・`CameraView` 不在を確認） |
| ネイティブの回帰 | 既存テストが無変更で通ること |
| 写真の Web 挙動 | `ExpoPhotoService.test.ts` に追加 |

## 人間向けの作業（エージェントは実施しない。Issue の 2〜5 に対応）

本 Issue の本体は保護対象のため、人間が別 PR で対応する。実装のヒント:

1. `orchestrator/tools/ui-preview`: `EXPO_PUBLIC_PREVIEW_INSETS=<上,右,下,左>` を付けて Web 向けに静的エクスポート → 静的配信（SPA フォールバック付き）→ Playwright で viewport をプリセット（iphone 393×852 / 上59 下34、android 360×800 / 上24 下0）にして撮影。環境変数はビルド時に埋め込まれるため、**端末プリセットごとにビルドが必要**。ポートは Issue 番号から決定（または空きポートを取得）、出力先は `--out` で分離して並列衝突を避ける。
2. Docker: Chromium + Playwright、`shm_size`、キャッシュは `/tmp`。
3. プロンプト・ガード: 実装・レビュー工程に撮影手順と完了条件、`ui-preview` の許可（開発サーバー起動はブロックのまま）。
4. CI: PR ごとにスクリーンショットを Artifact 保存（必須チェックにしない）。
5. `EXPO_PUBLIC_PREVIEW_INSETS` は本番ビルド（EAS）に設定しないこと。

## 判断ログ

1. **実装範囲を `app/` に限定した**
   - 選んだ案: 保護対象外の Issue §1 のみ実装、§2〜5 は人間向け作業として仕様書に残す。
   - 却下: `needs_clarification` で終了（Issue 自身が「エージェントに任せない」と明記しており分担が自明。§1 は単独で有益で手戻りも小さい）／保護パスを変更する（禁止）。
2. **セーフエリア再現はビルド時環境変数 `EXPO_PUBLIC_PREVIEW_INSETS`**（Issue 例どおり）。未設定時は完全に無影響。
3. **フォーマットは `上,右,下,左`**（CSS の margin 順）。却下: JSON 文字列（シェルのクォートが面倒）。
4. **Web 代替は BarcodeScanScreen を分割**してフックの条件付き呼び出しを避ける。却下: 画面内の早期 return（フック呼び出し順違反で lint エラー）。
5. **Web 出力は静的（`output: "static"`）**。ui-preview が単純なファイル配信で済み、各ルートを直接指定して撮影できるため。却下: `single`。
6. **依存は3つのみ**。Playwright 等の撮影用依存は `app/` に入れない（ツール側に置く）。
