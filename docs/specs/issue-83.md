# Issue #83 読書専用にする: 種別と映画・ドラマ・アニメの機能を外す

## 背景・目的

アプリを「読書専用」にする（Doc の決定）。映画・ドラマ・アニメを扱う仕組みと、種別（本・漫画・映画・ドラマ・アニメ）による出し分けをなくし、以降の作り直し（#84 データ構造、#92 振り返り）を単純にする。漫画は本として扱い、本と区別しない。まだリリースしていないので、保存データの後方互換・移行は考えない（古い形式は読めなくてよい。読めないときに落ちないことだけ守る）。

## スコープ

### やること
- 種別（`MediaKind` / `MEDIA_KINDS` / `MediaRecord.kind`）の概念を削除する。記録はすべて本。
- 種別の選択 UI、種別ごとの色・アイコン・集計、「読」「見」の出し分けを削除する。ステータスの文言は「読みたい」「読んでる」「途中でやめた」「読み終わった」だけ。
- 映画・ドラマ・アニメの検索（TMDb、#63）を削除する: Provider、検索画面、ルート、追加シートの入口（「映画・ドラマ・アニメ」「手入力（mediaManual）」）、「このアプリについて」のクレジット、環境変数 `EXPO_PUBLIC_TMDB_API_KEY`（`app/.env.example` も）。
- 設定の「使う種別」（#48）を削除する（`AppSettings.enabledKinds`、設定画面の行、保存・読み込み）。
- 振り返りの種別ごとの段（種別ごとの平均、積み上げ棒の種別の濃淡と凡例）を削除する。積み上げをやめ、月ごとの合計だけの棒にする（作り直しは #92）。
- 書き出し・読み込み（#55）の形式から種別を外す（JSON の `records[].kind` / `settings.enabledKinds`、CSV の「種別」列）。
- 「このアプリについて」のデータの出典から TMDb を外す。
- 使われなくなったコード・テスト・依存を残さない。

### やらないこと
- 画面のデザインの作り直し（後続の Issue）。
- 記録のデータ構造の作り直し（#84）。`source`（`manual` / `openbd` / `ndl`）や `publisher` などは残す。
- 保存データの移行処理。
- `src/design/tokens.ts` と `docs/design-system/` の変更（人間だけが変更する）。

## 受け入れ条件

- [ ] アプリのどこにも、映画・ドラマ・アニメ・種別の選択・「見たい／見てる／見終わった」・「監督など」・「見始めた」が出ない（画面ごとに `queryByText` で不在を確認）。
- [ ] `MediaKind` `MEDIA_KINDS` `KIND_LABELS` `enabledKinds` `tmdb` を参照するコードが `src/` に残らない（grep で 0 件。テスト内の「不在の確認」用の文字列を除く）。
- [ ] TMDb への通信のコードと設定がない。`app/.env.example` に `EXPO_PUBLIC_TMDB_API_KEY` がない。`envExample.test.ts`（コードが読む `EXPO_PUBLIC_*` と `.env.example` の一致）が通る。
- [ ] ルート `record/media-search` がなくなり、`tabs`/`headers` 系テストが新しいルート構成で通る。
- [ ] 追加シートの入口は「バーコード」「タイトル検索」「ISBN」「手入力」の 4 つだけ。常に出る（設定で変わらない）。
- [ ] 記録フォーム（新規・編集）に種別の選択がなく、作者ラベルは「作者・著者」、日付ラベルは「読み始めた日／読み終えた日」、出版社・発売日などの本の項目が常に出る。ステータスの選択肢は読書の 4 文言。
- [ ] 保存する記録（`NewRecordInput`）に `kind` がない。新規作成・編集・削除・一覧・詳細が今までどおり動く。
- [ ] 記録詳細の情報欄に「種別」がなく、日付ラベルが「読み始めた／読み終えた」。
- [ ] 文字の表紙（`TextCover`）・プレースホルダー（`Thumbnail`）・ヒーロー背景は、本の色・絵文字 📖 に固定される。
- [ ] 設定画面に「使う種別」がない。ヒーローの条件・ステータスの初期値は今までどおり変更・保存できる。
- [ ] 保存済み設定の JSON に古い `enabledKinds` があっても無視され、ほかの項目は読める。壊れた JSON は既定値になり落ちない。
- [ ] 保存済みの記録に古い `kind` があっても、記録は読め、一覧に出る（`kind` は無視）。`source.provider: 'tmdb'` の記録は `source` を `sourceFromIsbn` で補い、落ちない。
- [ ] 振り返り画面に種別ごとの平均の段がなく、月ごとの棒に凡例（種別名）がない。冊数・平均・分布・月ごとの冊数は今までどおり。記録 0 件の空状態も今までどおり。
- [ ] CSV の見出しと行に「種別」列がない。ステータスは読書の文言。列順はそのほかは変えない。
- [ ] バックアップ JSON に `kind` / `enabledKinds` が出ない。古い形式（`kind` あり）のバックアップを読み込んでも失敗しない（余分なキーは無視）。バックアップの検証（`not_json` / `not_backup` / `too_new` / `invalid`）は変わらない。
- [ ] 「このアプリについて」の出典に TMDb がなく、openBD・国立国会図書館などの既存の出典は残る。
- [ ] 空状態の文言から映画を外す（例: 「読み終えた本を記録するとここに並んでいきます」）。
- [ ] `pnpm check` が通り、全体カバレッジ・差分カバレッジの閾値を満たす。

## 画面・振る舞い

見た目の作り直しはしない。要素の削除と固定だけ。

- **追加シート**: 入口は 4 つ（バーコード / タイトル検索 / ISBN / 手入力）。`mediaSearchEnabled` の出し分けは廃止。
- **記録フォーム**: 種別チップの行を削除。ほかは「本」のときの表示のまま固定。
- **記録一覧・振り返り**: 種別によるフィルタ（`filterRecordsByKinds`）を廃止し、全記録を表示。
- **振り返り**: 「種別ごとの平均」の段を削除。月ごとの棒は種別の濃淡の積み上げをやめ、1 色（`colors.textPrimary`）の単色にする。凡例を削除。
- **設定**: 「使う種別」の行を削除。残りは変更しない。
- **エラー時**: 古い形式のデータ（`kind` あり、`enabledKinds` あり、`tmdb` source）は、余分なキーを無視して読む。`isRecordSource` が不正と判断した `source` は `sourceFromIsbn(isbn)` にフォールバックする（既存動作）。保存データ全体が壊れているときの挙動は既存どおり。

## 設計

方針: `kind` を **データモデルから完全に外す**（本に固定する案は採らない）。

### 変更するファイル
- `src/types/record.ts`: `MEDIA_KINDS` / `MediaKind` と `MediaRecord.kind` を削除。`RECORD_SOURCE_PROVIDERS` から `tmdb`、`RecordSource` から tmdb の分岐を削除。
- `src/types/settings.ts`: `AppSettings.enabledKinds` を削除（`DEFAULT_SETTINGS` も）。
- `src/types/mediaSearch.ts`、`src/lib/mediaSearch/**`（TMDb Provider、`parseTmdb`、`orderCandidates`、`index`）、`src/lib/mediaCandidateParams.ts`、`src/hooks/useMediaSearch.tsx`、`src/screens/MediaSearchScreen.tsx`、`src/app/record/media-search.tsx`、`src/components/MediaSearchRow.tsx` と各テスト: **削除**。`orderCandidates` など本の検索と共有していないか実装時に確認し、共有しているものは残す。
- `src/lib/enabledKinds.ts`、`src/lib/kindShades.ts` と各テスト: **削除**。
- `src/lib/statusLabel.ts`: `KIND_LABELS`・`WATCH_LABELS` を削除。`getStatusLabel(status)` に変更。
- `src/lib/infoCellLabels.ts`: 引数なし（`infoCellLabels()` か定数）にして「読み始めた／読み終えた」を返す。
- `src/lib/recordForm.ts`: `FormValues.kind`、`hasPublisherFields`、`isMediaKind`、`kind` パラメータ読み取りを削除。`getDateLabels` / `getCreatorLabel` / `getDateHint`（`statusLabel.ts` または `infoCellLabels.ts` 内）は引数を外す。`hasPublisherFields` を使っていた分岐は常に true として整理する。
- `src/lib/candidateParams.ts`、`src/lib/isbnLookupParams.ts`: 画面遷移パラメータの `kind: 'book'` を削除。
- `src/lib/cover.ts`: `getCoverColors()` を引数なしで本の色（`coverBookBg` / `coverBookInk`）を返す。`src/lib/heroColor.ts` の `getHeroBackground()` も引数なし。`src/lib/thumbnail.ts` の `PLACEHOLDER_LABELS` は定数 `'📖'`。
- `src/components/Cover.tsx` `TextCover.tsx` `Thumbnail.tsx` `CoverCard.tsx`: `kind` の props を削除。
- `src/components/RecordForm.tsx`: 種別チップ・`formKindOptions` 関連を削除。
- `src/components/AddSheet.tsx` `src/hooks/useAddSheet.ts`: `enabledKinds` `mediaSearchEnabled` と `scan/search/isbn/manual` 以外の入口（`mediaSearch` `mediaManual`）を削除。`AddTarget` の型も更新。入口の一覧は定数にする。
- `src/screens/RecordsScreen.tsx` `ReviewScreen.tsx` `RecordFormScreen.tsx` `RecordDetailScreen.tsx` `SettingsScreen.tsx` `AboutScreen.tsx` `DataScreen.tsx`、`src/app/_layout.tsx`: 上記に合わせて追従（`media-search` の Stack.Screen 削除、TMDb クレジット削除、「使う種別」削除、種別フィルタ・種別ごとの平均の段削除）。
- `src/lib/analytics.ts`: `byKind`（月ごと・評価ごと）と `emptyByKind` を削除。`MonthlyBucket` は月の合計だけ、`RatingSummary` は `{ distribution, count, average }`。`src/components/MonthlyBarChart.tsx`: `kinds` prop・凡例を削除し単色の棒に。
- `src/lib/csv.ts`: 「種別」列を削除（`HEADERS` と `row`）。
- `src/lib/backup.ts`、`src/types/backup.ts`: `settings.enabledKinds` のコピーを削除（`settings` はそのまま渡す）。`BACKUP_VERSION` は変えない（未リリースのため。古い形式も余分なキーを無視して読める）。
- `src/lib/recordGuard.ts`: `kind` の検査を削除（`kind` が来ても無視。出力にも含めない）。
- `src/lib/settingsStore.ts`: `parseEnabledKinds` を削除。
- `src/lib/recordSource.ts`: `tmdb` の分岐を削除。
- `src/lib/recordMigration.ts`: 変更しない（移行は考えない）。
- `src/lib/heroCriteria.ts` `statusDefault.ts` `recordInfo.ts` ほか `kind` / `getStatusLabel(kind, …)` を使う箇所を追従。`recordInfo.ts` は「種別」行を削除し、`isBook` の分岐は常に本として整理。
- `app/.env.example`: TMDb の変数の段落を削除。
- `src/testUtils.ts` `src/testProviders.tsx`: `kind` を外す。`withSettings` は `MediaKind[]` を受け取る形をやめる。
- 既存テスト全般: `kind` を使う箇所の修正。種別・TMDb・映画の振る舞いを検証していたテストは削除し、代わりに「出ない」ことの検証を足す。
- ルートの `README.md` や `docs/` に映画・TMDb・種別の記述があれば実装時に更新する（`docs/design-system/` は人間のみ。変更が必要なら判断ログに提案として書く）。

### 状態管理・データ構造
- 追加の状態やライブラリはない。`MediaRecord` から `kind` を除くだけ。
- 新しい依存はない。TMDb のために追加した依存があれば `package.json` から外す（`pnpm-lock` も更新。確認の結果なければ何もしない）。
- `src/design/tokens.ts` の `coverMovie*` `coverDrama*` `coverAnime*` `coverManga*` は人間のみが変更できるため残る。未使用になることを PR の判断ログに「トークン削除の提案」として書く。

## テスト方針

| 受け入れ条件 | テスト |
|---|---|
| 種別・映画等が出ない、入口 4 つ | `AddSheet.test.tsx`、`useAddSheet.test.tsx`、`RecordsScreen.test.tsx`、`RecordFormScreen.test.tsx`、`SettingsScreen.test.tsx`、`AboutScreen.test.tsx` |
| ルート構成 | `tabs.test.tsx`、`headers.test.tsx`、`root-layout.test.tsx` |
| TMDb の環境変数なし | `envExample.test.ts` |
| フォームの固定表示・保存に `kind` なし | `RecordForm.test.tsx`、`recordForm.test.ts`、`recordRepository.test.ts` |
| 詳細・情報欄のラベル | `RecordDetailScreen.test.tsx`、`recordInfo.test.ts`、`infoCellLabels.test.ts`、`statusLabel.test.ts` |
| 表紙・サムネイル固定 | `cover.test.ts`、`heroColor.test.ts`、`thumbnail.test.ts`、`TextCover.test.tsx`、`Thumbnail.test.tsx`、`CoverCard.test.tsx` |
| 設定の古い `enabledKinds` を無視 | `settingsStore.test.ts`、`useSettings.test.tsx` |
| 古い `kind`・`tmdb` source の記録を読める | `recordGuard.test.ts`、`recordSource.test.ts` |
| 振り返りに種別の段なし | `analytics.test.ts`、`ReviewScreen.test.tsx`（`AnalyticsScreen.test.tsx`）、`MonthlyBarChart` のテスト |
| CSV・バックアップ | `csv.test.ts`、`backup.test.ts`、`importBackup.test.ts`、`DataScreen.test.tsx` |
| 本の追加の動線が今までどおり | `BarcodeScanScreen` / `TitleSearchScreen` / `IsbnLookupScreen` / `RecordFormScreen` の既存テスト |

削除したコードのテストは削除する（`pr-policy` のテスト削除検知は、対象コードごと消す場合の扱いを実装時に PR 本文に説明する）。見た目の撮影ができない場合は PR にその旨を書き、表示要素・文言の出し分けを上のテストで確認する。

## 判断ログ

1. **`kind` を本に固定せず、データモデルから削除する**
   - 選んだ案: フィールドごと削除。
   - 却下した案: `kind: 'book'` に固定して残す。
   - 理由: 固定値は情報を持たず、#84 のデータ構造の作り直しで結局消える。分岐・ラベル表がすべて不要になり、実装が単純になる。Issue も「外す（または固定。判断は仕様書）」としている。
2. **古い保存データの移行は書かない**
   - 選んだ案: `recordGuard` が `kind` を単に無視する。movie/drama/anime だった記録も本として表示される。
   - 却下した案: 映画等の記録を読み込み時に捨てる／移行を書く。
   - 理由: Issue で後方互換は不要と明記。未リリースで該当データはない。データを黙って消す方が危険。落ちないことだけ守る。
3. **バックアップの `BACKUP_VERSION` は上げない**
   - 理由: 未リリースで古い版の利用者がいない。余分なキーは無視されるので、古いファイルも読める。
4. **積み上げ棒は単色の棒にする**
   - 選んだ案: 月ごとの合計の単色棒。
   - 却下した案: 振り返りのチャート自体を #83 で消す／ステータスなど別軸で積む。
   - 理由: Issue は「種別の濃淡を外す」までで、作り直しは #92。最小の変更で冊数の表示を保つ。
5. **`source` の `tmdb` 分岐は削除する（`source` 自体は残す）**
   - 理由: TMDb のコードをなくすため。`source` の構造の見直しは #84。
6. **デザイントークンの `cover*`（本以外）は残す**
   - 理由: トークンは人間だけが変更する。未使用になるため、削除を人間への提案として PR 本文に書く。
7. **作者ラベル・日付ラベルは本の文言に固定**（「作者・著者」「読み始めた日／読み終えた日」）。既存の本の文言をそのまま使い、新しい文言は作らない。
8. **漫画は本として扱う**。専用の表示・集計はなく、`manga` の記録の区別も残さない。
