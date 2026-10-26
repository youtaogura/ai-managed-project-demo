# Issue #35 【デザイン基盤】ダークテーマ・フォント・デザイントークンへの切り替え

## 背景・目的

デザインシステム「Shelf Theater」（B-1 モノクロ。`docs/design-system/`）を決めたが、アプリは白地・青アクセントのままである。画面ごとの作り直し（#39〜#43）と部品の追加（#36〜#38）の前に、アプリ全体の土台（トークン参照・ダークテーマ・フォント・文字スタイル）を切り替える。

### 現状（コード上の事実）
- `app/src/theme.ts` が色（`colors` `formColors` `overlayColors` `kindColors` `starColors`）と余白（`spacing`）を **値で直接** 持つ。`STAR_SIZE` も持つ。20 ファイル超が参照する（互換層として名前は維持する必要がある）。
- `app/src/design/tokens.ts`（生成物・編集禁止）に `colors` `fontFamilies` `typography` `space` `radius` `size` がある。
- `app/src/app/_layout.tsx`: Stack（`headerShown: true`、`(tabs)` のみ非表示）+ `StatusBar style="auto"`。`app/src/app/(tabs)/_layout.tsx`: `Tabs`（ヘッダー右に青い「追加」）。テーマ指定なし。
- `app/app.json`: `userInterfaceStyle: "light"`。フォント未読み込み。`expo-font` は expo の推移的依存としてのみ存在。
- テストに色の値へ依存した箇所はない（`grep` で確認済み。`tokens.test.ts` はトークン形式の検査のみ）。ただし実装担当は `pnpm check` で再確認すること。
- 撮影ツール `orchestrator/tools/ui-preview` はこのリポジトリに存在しない。

## スコープ

### やること
1. `src/theme.ts` を `design/tokens.ts` 参照のみにする（互換のため export 名・キーは維持。色・余白の数値リテラルを書かない）。
2. ダークテーマ: 画面の地、Stack のヘッダー（地・文字・戻るボタン色）、タブバー、ステータスバー（明るい文字）。`app.json` の `userInterfaceStyle` を `dark` に。
3. フォント読み込み（Noto Sans JP 400/700/900、Shippori Mincho 600/800）。完了までスプラッシュ表示を維持。失敗しても端末フォントで起動する。
4. `typography` を使う共通 `Text` 部品（`AppText`）。既存画面の置き換えはしない。

### やらないこと
- 画面レイアウト・構成の変更、部品の新規作成（`AppText` は文字の基盤であり部品 Issue の対象外）、ライトテーマ
- 既存画面の `Text` を `AppText` へ置き換えること
- `tokens.ts` `docs/design-system/` `jest.config.js` 等の保護対象の変更

## 受け入れ条件

- [ ] `theme.ts` に色・余白の数値リテラル（`#xxx` `rgb(a)` と余白の数字）がなく、すべて `tokens.ts` の値と同一（テスト: `theme.colors.background === tokens.colors.bg` など）
- [ ] `theme.colors.tint` はアクセント（白＝`accent`）、`kindColors` の全種別と `starColors.filled` は有彩色でない（`tokens.colors` の値のみ。種別の有彩色・青・黄色が存在しない）
- [ ] 互換層の全 export の組み合わせで「文字色と地色が同一」にならない（`text`/`textMuted`/`tint`/`danger` は `background` `surface` と異なる。コントラスト比 4.5 以上をテストで計算）
- [ ] ルートレイアウトを描画すると、`StatusBar` の style が `light`
- [ ] Stack の `screenOptions` に、ヘッダー背景 = `bg`、ヘッダー文字・戻るボタン = `textPrimary`、`contentStyle.backgroundColor = bg` が設定される。Tabs にタブバー背景（`surface1`）、選択色 = `accent`、非選択色 = `textSecondary`、ヘッダー背景・文字の設定がある
- [ ] ナビゲーションのテーマ（`ThemeProvider`）が dark ベースで、`background` が `bg`、`text` が `textPrimary`
- [ ] フォント読み込み中（未完了）は、アプリの画面を描画せず（`null`）、スプラッシュを隠さない。完了すると画面を描画し、スプラッシュを隠す
- [ ] フォント読み込みに失敗（`useFonts` が `[false, Error]`）しても、画面を描画し、スプラッシュを隠す
- [ ] 読み込むフォントのキーが仕様の 5 つ（下記）で、`typography` が使う `fontFamily` と対応する
- [ ] `AppText` は variant 名（`typography` のキー）を受け取り、その `fontSize` `lineHeight` `fontWeight` と、フォント読み込み済みのファミリー名を適用する。既定の文字色は `textPrimary`。`style` で上書きできる。他の `Text` props（`accessibilityRole` など）を透過する
- [ ] 既存のテストがすべて通り、`pnpm check` が通る（カバレッジ閾値を維持）

## 画面・振る舞い

- 起動: スプラッシュ表示 → フォント読み込み（成功/失敗いずれでも）→ 画面表示。読み込みの待ち時間は短いが、描画前に必ずスプラッシュを維持する。失敗時は黙ってシステムフォントで続行（`console.warn` は出さない。出す場合は lint の規則に従う）。
- 全画面: 地 `bg`、文字 `textPrimary`/`textSecondary`。Stack ヘッダーとタブバーも暗色。ステータスバーは明るい文字。
- 画面のレイアウトは変えない。互換層の色が変わるだけで、各画面の見た目は暗色化される（黒地に黒文字にならないよう、互換層のキーごとにマッピングを下表で固定する）。

### 互換層マッピング（`theme.ts`）

| 既存キー | 参照先 |
|---|---|
| `colors.background` | `colors.bg` |
| `colors.text` | `colors.textPrimary` |
| `colors.textMuted` | `colors.textSecondary` |
| `colors.tint` | `colors.accent` |
| `colors.border` | `colors.line` |
| `colors.surface` | `colors.surface2` |
| `colors.danger` | `colors.danger` |
| `formColors.danger` | `colors.danger` |
| `formColors.border` | `colors.lineStrong` |
| `formColors.inputBackground` | `colors.surface2` |
| `formColors.disabled` | `colors.textTertiary` |
| `overlayColors.text` | `colors.textPrimary` |
| `overlayColors.background` | `colors.scrim` |
| `kindColors.*`（全種別） | `colors.accent`（種別の色分けは廃止。後続の画面 Issue で文字の表紙に置き換わる） |
| `starColors.filled` / `empty` | `colors.accent` / `colors.starOff` |
| `spacing.sm` / `md` / `lg` | `space[2]` / `space[3]` / `space[6]` |
| `STAR_SIZE` | 36 のまま（デザインにない画面固有サイズ。`size` に該当がない。判断ログ参照） |

注意: `tint` が白になるため、`tint` を **背景色** に使い、その上に白文字を置いている箇所（例: 選択中のセグメント）は白地に白文字になる。実装担当は `colors.tint` の使用箇所（`grep -rn "tint" src`）を全件確認し、背景に使っている箇所では文字色を `accentInk` にする（`theme.ts` に `onTint: tokens.colors.accentInk` を追加してよい）。ほかにも `'#fff'` / `'white'` / `'#000'` などを直接書いた箇所がないか `grep` し、暗い地で読めなければ互換層のキーに置き換える（レイアウトは変えない）。

## 設計

### 追加・変更するファイル

| ファイル | 内容 |
|---|---|
| `app/src/theme.ts` | 上表のとおり `design/tokens` 参照に置き換え。`onTint` 追加可 |
| `app/src/design/navigationTheme.ts`（新規） | `navigationTheme`（`@react-navigation/native` の `DarkTheme` に `colors` を `tokens` で上書きしたもの）、`stackScreenOptions`（Stack 用）、`tabsScreenOptions`（Tabs 用）を export。値は `tokens` のみ参照 |
| `app/src/design/fonts.ts`（新規） | `fontAssets`: `useFonts` に渡すマップ。キー例 `NotoSansJP_400Regular` `NotoSansJP_700Bold` `NotoSansJP_900Black` `ShipporiMincho_600SemiBold` `ShipporiMincho_800ExtraBold`、値は `require('../../assets/fonts/…ttf')`。`resolveFontFamily(fontFamily, fontWeight)`: トークンの `fontFamily`/`fontWeight`（`'Noto Sans JP'` + `'700'` など）を読み込み済みのキーへ変換（未対応の組み合わせは最も近い太さ） |
| `app/src/hooks/useAppFonts.ts`（新規） | `useFonts(fontAssets)` を包み、`{ ready: boolean }` を返す。`loaded \|\| error` で `ready=true` |
| `app/src/components/AppText.tsx`（新規） | `<AppText variant="body" style=… {...TextProps} />`。`typography[variant]` の `fontSize` `lineHeight` を使い、`fontFamily`/`fontWeight` は `resolveFontFamily`。Android はファミリー名で太さが決まるため `fontWeight` は渡さない（iOS でも同名ファミリーを使うので同様）。既定色 `textPrimary`。名前付き export |
| `app/src/app/_layout.tsx` | `SplashScreen.preventAutoHideAsync()` をモジュール読み込み時に実行（失敗は握りつぶす）。`useAppFonts` で `ready` になるまで `null` を返す。ready で `SplashScreen.hideAsync()`（`useEffect`）。`ThemeProvider value={navigationTheme}`、`Stack screenOptions={stackScreenOptions}`、`StatusBar style="light"` |
| `app/src/app/(tabs)/_layout.tsx` | `Tabs screenOptions={tabsScreenOptions}`。ヘッダー右の「追加」は `colors.tint`（白）になる。文言・構成は変えない |
| `app/assets/fonts/*.ttf`（新規 5 ファイル） | 下記「依存・ライセンス」参照 |
| `app/app.json` | `userInterfaceStyle: "dark"`、`expo-splash-screen` プラグインで `backgroundColor` を `#0e0e10`（`tokens.colors.bg` と同値。app.json は値を直接書くしかない）、`expo-font` プラグイン（任意） |
| `app/package.json` | `expo-font`、`expo-splash-screen` を `npx expo install` で追加（下記） |
| `app/src/**/__tests__/` | 受け入れ条件に対応するテストを追加（下記） |

`ThemeProvider` は `expo-router` から export されている（`import { ThemeProvider } from 'expo-router'`）ものを使う。型・API は `app/AGENTS.md` の指示どおり SDK 58 のドキュメント（https://docs.expo.dev/versions/v58.0.0/）で確認すること。`DarkTheme` を使うために `@react-navigation/native` を **直接 import する場合は依存追加になる**ので、expo-router の re-export（`DarkTheme`）を使うこと。re-export がなければ `Theme` の完全な値（`dark: true`, `colors`, `fonts`）を自前で組み立てる。

`SplashScreen`・`useFonts` の呼び出しは、テストでモックしやすいよう `_layout.tsx` 内で `expo-splash-screen` / `useAppFonts` を直接 import する（jest は `jest.mock` で差し替える）。

### 状態管理
状態はフォント読み込みの完了フラグのみ（`useFonts` の戻り値）。context 追加なし。

### 依存・ライセンス

| パッケージ | 理由 | 代替案 |
|---|---|---|
| `expo-font`（MIT） | `useFonts` でフォントを読み込む。現在は推移的依存のみで、直接 import するため明示する | `Font.loadAsync` を自前で呼ぶ（`useFonts` の方が簡潔で、失敗も取得できる） |
| `expo-splash-screen`（MIT） | `preventAutoHideAsync` / `hideAsync` で読み込み完了までスプラッシュを維持する | 自前のローディング画面（Issue が「スプラッシュを表示し続ける」と指定しているため却下） |

**フォントファイルは npm パッケージではなく `app/assets/fonts/` に同梱する。**
- `@expo-google-fonts/noto-sans-jp` と `@expo-google-fonts/shippori-mincho` のライセンスは `MIT AND OFL-1.1` で、`AND` は全て許可が必要なため、`orchestrator/policy.json` の許可リスト（`OFL-1.1` なし）で CI の `dependencies`（ライセンス検査）が失敗する。許可リストは人間だけが変更できる。
- Noto Sans JP・Shippori Mincho 自体のライセンスは SIL Open Font License 1.1（再配布・アプリ同梱可。単体販売は不可）。ファイルは本番依存ではないためライセンス検査の対象外だが、同梱するので `app/assets/fonts/OFL.txt`（各フォントの著作権表示とライセンス全文）を同じフォルダに置くこと。
- 取得元: Google Fonts（https://fonts.google.com/noto/specimen/Noto+Sans+JP 、 https://fonts.google.com/specimen/Shippori+Mincho ）の静的 TTF。ネットワークに接続できない等で取得できなければ、`npm pack @expo-google-fonts/noto-sans-jp @expo-google-fonts/shippori-mincho` を **空の一時ディレクトリで** 展開して TTF だけを取り出して使う（パッケージ自体は依存に追加しない）。どちらもできなければ `failed` で報告する（ファイルがないとバンドルが失敗するため）。
- ファイルサイズが大きい（日本語フォントは 1 ファイル数 MB）。5 ファイルで合計 20MB を超える場合は、判断ログに実際のサイズを書く（サブセット化は後続で検討）。

## テスト方針

| 受け入れ条件 | テスト |
|---|---|
| theme の参照・マッピング・有彩色なし・コントラスト | `src/__tests__/theme.test.ts`（`tokens` と比較。コントラスト比は相対輝度の計算を関数化してテスト内に書く） |
| `StatusBar` が `light`、Stack/Tabs の screenOptions、ThemeProvider | `src/design/__tests__/navigationTheme.test.ts`（オブジェクトの値）、`src/__tests__/root-layout.test.tsx`（`expo-status-bar` をモックして style を確認。既存の `headers.test.tsx` `tabs.test.tsx` の書き方に合わせる） |
| 読み込み中は描画しない・スプラッシュ維持、完了後は描画・`hideAsync`、失敗時も描画 | `src/__tests__/root-layout.test.tsx`（`expo-font` の `useFonts` と `expo-splash-screen` をモック。`[false, null]` → 描画なし・`hideAsync` 未呼び出し、`[true, null]` と `[false, Error]` → 描画あり・`hideAsync` 呼び出し）。`useAppFonts` 単体は `src/hooks/__tests__/useAppFonts.test.ts` |
| フォントのキー・`typography` との対応 | `src/design/__tests__/fonts.test.ts`（`typography` の全 variant が `resolveFontFamily` で `fontAssets` のキーに解決される） |
| `AppText` | `src/components/__tests__/AppText.test.tsx`（スタイル適用・既定色・上書き・props 透過） |
| 既存テスト・カバレッジ | `cd app && pnpm check` |

撮影ツールが使えないため、**見た目の撮影確認は行わない**。PR 本文に「撮影ツール（`ui-preview`）がこのリポジトリになく、画面の撮影確認は未実施」と書き、デザインどおりとは書かない。

## 判断ログ

| 論点 | 選んだ案 | 却下した案 | 理由 |
|---|---|---|---|
| フォントの入手方法 | `app/assets/fonts/` に TTF を同梱 + `OFL.txt` | `@expo-google-fonts/*` を依存に追加 | 後者は `MIT AND OFL-1.1` で許可リスト（`OFL-1.1` なし）に通らず CI が落ちる。許可リストは人間のみ変更可 |
| 許可リストへの提案 | `policy.json` の `allowedLicenses` に `OFL-1.1`（フォントのライセンス）を追加することを **人間への提案** とする | エージェントが変更する | 保護対象。追加されれば後で `@expo-google-fonts/*` に切り替えられ、ファイル同梱をやめられる |
| 種別ごとの色（`kindColors`） | 全種別を `accent` にする（キー維持） | キー削除 | 参照箇所（`MonthlyBarChart` 等）を壊さず、有彩色をなくすため。後続 Issue で書影・文字の表紙に置き換わる |
| `starColors.filled` | `accent`（白） | 黄色を維持 | デザインシステムで評価の星は `accent`。Issue で黄色の星は廃止と明記 |
| `tint` の背景利用 | `onTint`（`accentInk`）を追加し、背景利用箇所の文字色を直す | 放置 | 白地に白文字になる（受け入れ条件「文字が読める」違反）ため |
| `STAR_SIZE` | 36 のまま `theme.ts` に残す | 新トークンを作る | 色・余白ではなく画面固有サイズ。デザインシステムに該当がなく、トークン追加は人間が行う。提案: 星サイズを `size` に追加 |
| ナビゲーションテーマ | `expo-router` の `ThemeProvider` + dark ベース | 画面ごとに背景色を指定 | 画面の地・ヘッダー・遷移中の背景（白いちらつき）を一括で暗色にできる |
| フォント読み込み失敗時 | `error` でも `ready=true` で起動（システムフォント） | 失敗時にエラー画面 | Issue の要件。`typography` の `fontFamily` が未登録でも RN はシステムフォントにフォールバックする |
| 太さの指定 | `fontFamily` をウェイトごとのキーに変換し `fontWeight` は渡さない | `fontWeight` 指定 | カスタムフォントでは Android が `fontWeight` で別ファイルを選べないため |
| Shippori Mincho の 600 | 読み込むが現状 `typography` は 800 のみ使用 | 800 のみ読み込む | Issue が 600/800 を指定しているため |
| タブバーの文字スタイル | 色のみ設定し、`tabBarLabelStyle` は設定しない | `typography.tab` を適用 | タブバーの見た目は部品 Issue（#36〜#38）の範囲。ここではレイアウトを変えない |
| タブ名・「追加」ボタン | 変更しない | 「記録」「振り返り」へ変更 | 構成・文言の変更は後続の画面 Issue（スコープ外） |
| `userInterfaceStyle` | `dark` | `automatic` | ライトテーマはスコープ外。端末がライトでも暗色固定 |
