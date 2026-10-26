# Issue #30 全画面でコンテンツがステータスバー・ヘッダー・タブバーと重ならないようにする（#18 の再起票）

## 背景・目的

#18 / #19 では `ScreenContainer`（上端インセット分の paddingTop）を作り、バーコード画面にだけ適用したが、実画面を確認しないまま「他の画面はネイティブヘッダーが処理するはず」として完了にした。画面上部のコンテンツ・ヘッダーの重なりが残っているという報告で再起票されたのが本 Issue。
今回は「実際の画面表示を見て」確認し、原因を特定してから、全画面で一貫した方法で上下のセーフエリアを処理する。

### 現状調査（コード上の事実）
- `src/app/_layout.tsx` のルート `Stack` は `headerShown: true`（`(tabs)` のみ `false`）。`(tabs)` は `Tabs` 自身のヘッダーとタブバーを持つ。
- **バーコード読み取り（`/record/scan`）は現在ヘッダー付き**（`headers.test.tsx` で「バーコードを読み取る」を確認済み）。Issue 本文の「ヘッダーなし（全画面カメラ）」は現状と異なる。`ScreenContainer` はどの画面からも使われていない（#28 以降の変更で不要になった）。
- 上端: すべての画面がナビゲーションヘッダー（Tabs / Stack）に任せている。ヘッダー内部の処理はライブラリ任せで、アプリ側でヘッダーとコンテンツの重なりを検証するテストはない。
- **下端（欠落の疑いが濃い）**: タブ外の Stack 画面（記録の追加・編集・詳細、ISBN で探す、バーコード読み取り）にはタブバーがなく、`RecordForm` の `ScrollView`（`src/components/RecordForm.tsx`）・`RecordDetailScreen` の `ScrollView`・`TitleSearchScreen` の `FlatList`・バーコード画面のオーバーレイ（キャンセルボタン）はいずれも下端インセットを考慮していない。スクロールしきった最後の項目・保存ボタン・キャンセルボタンがホームインジケータ／ジェスチャーバーに隠れる。
- `RecordsScreen`（FlatList）と `AnalyticsScreen`（ScrollView）はタブ画面で、タブバーが下端インセットを処理する。
- スクリーンショットツール（#28 の `orchestrator/tools/ui-preview`）は、この時点のリポジトリには存在しない（`orchestrator/tools` なし）。

## スコープ

### やること
- 実装担当は最初に撮影手段（`orchestrator/tools/ui-preview` 等。`EXPO_PUBLIC_PREVIEW_INSETS` + Web 描画）が利用可能か確認する。**利用可能なら**全画面 × 端末（下表）を撮影して重なりを確認し、PR 本文に一覧（OK / 修正内容）を書く。
- **利用できなければ撮影は「未確認」と正直に書く**（OK と書かない）。その場合は下記のコード・テストによる検証にとどめる。
- 下端: Stack 画面（タブバーなし）のスクロール領域・オーバーレイが下端インセット分の余白を確保するようにする。上端: ヘッダー付き画面でコンテンツ側が上端インセットを足していないことを維持。
- 画面ごとの場当たり対応ではなく、共通の仕組み（フック／コンポーネント）で統一する。

### やらないこと
- ヘッダー・タブバーのデザイン／文言変更、ナビゲーション構成の変更
- キーボード表示時のレイアウト調整、横向き対応、画面のデザイン変更（余白・重なりの修正に限る）
- 新しいライブラリの追加（`react-native-safe-area-context` は導入済み。依存追加なし）
- `jest.config.js` / `eslint.config.js` 等の保護対象ファイルの変更、既存テストの削除・skip

### 対象端末（Issue の表。テストでは insets を与えて再現）
| 端末 | 画面サイズ | 上 / 下 |
|---|---|---|
| iPhone（Dynamic Island） | 393×852 | 59 / 34 |
| Android | 360×800 | 24 / 0 |
| 小型 iPhone | 375×667 | 20 / 0 |

## 受け入れ条件

- [ ] 上端インセット（例 top=59, bottom=34）がある環境で、ヘッダー付きの全画面（`/` `/analytics` `/record/new` `/record/isbn` `/record/scan` `/records/[id]` `/record/[id]`）のコンテンツの祖先に、上端インセット以上の `paddingTop` / `marginTop` が付いていない（余白が二重にならない）
- [ ] 下端インセット（例 bottom=34）がある環境で、Stack 画面の記録フォーム（`/record/new`, `/record/[id]`）の `ScrollView` の `contentContainerStyle.paddingBottom` が「通常の余白 + 下端インセット」になる。下端 0 のときは現状と同じ値
- [ ] 同様に記録の詳細（`/records/[id]`）の `ScrollView`、ISBN で探す／タイトル検索の候補 `FlatList` の下端余白が「通常の余白 + 下端インセット」になる
- [ ] バーコード読み取り画面（権限要求・エラー表示・カメラ表示のオーバーレイ）の下端の操作ボタン（キャンセル等）が下端インセット分上に位置する（`paddingBottom` に下端インセットが加わる）。上端はヘッダー任せのため加算しない
- [ ] タブ画面（記録一覧・分析）は下端をタブバーに任せ、コンテンツ側で下端インセットを加算しない（二重余白にしない）
- [ ] 記録一覧のヘッダー右「追加」ボタンが表示され、押すと `/record/new` に遷移する（既存テスト維持）
- [ ] インセット 0 の既存テスト環境で既存の表示・レイアウトが変わらない（既存テストが無変更で通る）
- [ ] （撮影ツールが使える場合）全画面 × iphone / android の撮影結果を PR 本文に記載。使えない場合は「未確認」と明記
- [ ] `pnpm check` が通る（カバレッジ・差分カバレッジを満たす）

## 画面・振る舞い

| 画面 | 上端 | 下端 |
|---|---|---|
| 記録一覧・分析（タブ） | Tabs ヘッダー | タブバー |
| 記録の追加・編集 | Stack ヘッダー | コンテンツ末尾に下端インセット分の余白（保存ボタンまでスクロール可能） |
| 記録の詳細 | Stack ヘッダー | 同上 |
| ISBN で探す | Stack ヘッダー | 候補リスト末尾に下端インセット分の余白 |
| バーコード読み取り | Stack ヘッダー | オーバーレイ／中央表示の下端に下端インセット分の余白 |

エラー時の振る舞い: なし（レイアウトのみ）。インセットが取得できない場合は 0 として扱う。

## 設計

変更・追加するファイル:
1. `src/hooks/useBottomInset.ts`（新規）: `useSafeAreaInsets()` の `bottom` を返す小さなフック。`SafeAreaInsetsContext` が無い場合も落ちないよう既存 `ScreenContainer` と同じく `useContext(SafeAreaInsetsContext)?.bottom ?? 0` を使う。
2. `src/components/RecordForm.tsx` / `src/screens/RecordDetailScreen.tsx` / `src/screens/TitleSearchScreen.tsx`: `contentContainerStyle` に `paddingBottom: <既存値> + bottom` を配列で追加（`StyleSheet.create` の既存スタイルは変えない）。ISBN 画面（`IsbnLookupScreen`）は実装時に構造を確認し、スクロール領域があれば同様に対応。
3. `src/screens/BarcodeScanScreen.tsx`: `NativeBarcodeScan` 内で `useBottomInset()` を使い、`center` コンテナ・`overlay` の `paddingBottom` に加算（`UnsupportedOnWeb` も同様）。
4. `src/components/ScreenContainer.tsx`: 現状未使用。**削除しない**（テスト削除は改ざん検知に抵触するため）。コメントで「ヘッダーのない画面用。現在の全画面はヘッダー付きのため未使用」と明記してよい。
5. `src/theme.ts`: 追加の定数が必要な場合のみ追加。
6. 撮影で上端の欠落／二重が見つかった場合のみ、該当箇所を最小修正（例: Tabs / Stack の `headerStatusBarHeight` 等のオプション）。**撮影できない場合は上端の変更はしない**（根拠なく変更しない）。

状態管理・データ構造の変更なし。依存追加なし。

## テスト方針

| 受け入れ条件 | テスト |
|---|---|
| 上端が二重にならない（全ヘッダー付き画面） | `src/__tests__/safe-area.test.tsx` を拡張。既存の `InsetRootLayout`（`SafeAreaInsetsContext.Provider` で top=59,bottom=34）を使い、各ルートのコンテンツの祖先の `paddingTop`+`marginTop` が top 未満であることを `it.each` で確認 |
| 下端余白（フォーム／詳細／検索／バーコード） | 同ファイル、または各 `screens/__tests__` / `components/__tests__` に追加。`SafeAreaInsetsContext.Provider` で bottom=34 / 0 を与え、`ScrollView` の `contentContainerStyle` を `StyleSheet.flatten` して `paddingBottom` を比較（ScrollView は `UNSAFE_getByType` ではなくテスト ID / ロール経由で取得） |
| タブ画面は下端を足さない | 記録一覧のコンテンツ祖先の `paddingBottom` が bottom 未満 |
| 「追加」ボタン | 既存 `safe-area.test.tsx` を維持 |
| 既存挙動 | 既存テスト無変更（インセット 0） |
| `useBottomInset` | フック単体の簡単なテスト（provider あり／なし） |

## 判断ログ

- **質問せず進める**: 対象画面・端末・受け入れ条件が Issue に表で明示されているため `needs_clarification` にしない。
- **前提のずれ**: Issue は「バーコード画面はヘッダーなし」としているが、現状はヘッダー付き（`headers.test.tsx`）。実装を優先して仕様を現状に合わせた。上端は全画面ヘッダー任せ、バーコード画面は下端のみ追加対応とする。
- **案 A（採用）**: 上端はヘッダーに任せ、ヘッダーに覆われない下端（タブバーのない Stack 画面）を共通フック `useBottomInset` で補う。理由: ヘッダー／タブバーが処理する側は二重余白になるため、コードから欠落が確実な下端に絞る。画面ごとの固定値ではなくインセット値から導出するので端末差に追従できる。
- **案 B（却下）**: 全画面を `SafeAreaView` / `ScreenContainer` で包む。ヘッダー付き画面で上端が二重になる。
- **案 C（却下）**: `contentInsetAdjustmentBehavior="automatic"` のみに頼る。iOS 専用で Android / Web 再現に効かない。
- **案 D（却下）**: 各画面に固定 `paddingBottom`（例 34）。端末ごとに異なり再発する。
- **ScreenContainer を残す**: 未使用だが、テスト削除が改ざん検知の対象になるため残す。削除は人間の判断事項として PR 本文に提案を書く。
- **撮影ツール不在**: #28 のツールがこのブランチに存在しない（`orchestrator/` は人間管理）。撮影できない場合は「未確認」と書き、OK と主張しない。上端の根拠なき変更はしない。
- **自動テストの限界**: 実描画ではなくスタイル値の検証にとどまる。
