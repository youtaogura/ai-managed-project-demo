# Issue #93 設定画面を整理する

## 背景・目的

設定画面を、読書専用アプリ「書斎」のデザイン（`docs/design-system/screens/README.md` の「設定」、`settings.png`）に合わせて整理する。#85〜#92 までで書き出し（#90）・本棚の管理（#86）の行はすでに入っているので、残りは (1) カードの構成と文言をデザインに合わせる、(2) 並び順を本棚の画面から設定へ移す、(3) 設定に残る古い項目・コードを外す、(4) データ系の各画面を書斎のトークンで描く、の 4 点。まだリリースしていないので、保存データの後方互換・移行は考えない（読めないときに落ちないことだけ守る）。

## スコープ

### やること
- `SettingsScreen` を 3 枚のカードにする（デザインどおり）。
  - 「読み終えたら」: 「書き出し」（2 行目に今の状態、#90 の `/starters` へ）、「ステータスの初期値」（シート）。
  - 「本棚」: 「本棚の管理」（`/shelves` へ）、「並び順」（今の並び順を 2 行目に。押すと `SortSheet`）。
  - 最後のカード（見出しなし）: 「データ」（`/data` へ）、「このアプリについて」（`/about` へ）。
- 並び順の設定を本棚の画面（`RecordsScreen`）の「⇅ 並び替え」ボタンから設定へ移す。`RecordsScreen` からボタンと `SortSheet` を外し、保存された並び順は引き続き `RecordsScreen` の一覧に効かせる。
- 「書き出し」行の 2 行目を「オン · 一度に 3 つ · 7 個から」（機能オフなら「オフ」）にする。
- 使わなくなった設定が残っていれば外す（現状 `AppSettings` は `defaultStatus` だけ。`enabledKinds`・`heroCriterion` の読み捨てテストなど、残骸のコード・テスト・文言を探して削除する）。
- データ・書き出し・読み込み・すべての記録を削除・このアプリについて・ライセンスの各画面（`DataScreen` / `ExportSheet` / `ImportSheet` / `DeleteAllSheet` / `AboutScreen` / `LicensesScreen`）を点検し、色・余白・角丸・サイズ・文字スタイルを `design/tokens.ts` 由来だけにする（構成は今のまま）。
- 設定画面の見た目の部品（`SettingsCard` / `SettingsRow`）をデザインに合わせる: カードは面 `surface-1` + 枠 `line` + 角丸 `radius-card`、行の区切りは `line`、項目名は明朝ではなく UI 文字（画像では行の項目名が大きめ。`body`）、2 行目は `label` + `text-secondary`、右に `›`（`text-tertiary`）。見出しは `label`（`text-secondary`）。

### やらないこと
- 書き出し・本棚管理の画面そのものの変更（#90・#86 で完了）。
- `tokens.ts` / `docs/design-system/` の変更、新しい依存の追加（なし）。
- 保存データの移行。
- 並び順の選択肢の追加・変更（`SortOrder` の種類と `SortSheet` の中身は今のまま）。

## 受け入れ条件

- [ ] 設定画面に見出し「設定」と、カード見出し「読み終えたら」「本棚」が出る。「記録するとき」「このアプリ」の見出しは出ない。最後のカードに見出しはない。
- [ ] 「書き出し」の行は 2 行目に `starterSummary` の文言（既定で「オン · 一度に 3 つ · 7 個から」）を出し、押すと `onOpenStarters` が呼ばれる。「ステータスの初期値」より上にある。
- [ ] 「ステータスの初期値」の行は今の値（既定「読み終わった」）を出し、押すとシートが開き、選ぶと値が変わって `appSettings.v1` に保存される。
- [ ] 「本棚の管理」の行は本棚の数（0 件なら「まだありません」、それ以外は「N つ」）を出し、押すと `onOpenShelves` が呼ばれる。
- [ ] 「並び順」の行は今の並び順の名前を出し（既定は「終了日の新しい順」）、押すと `SortSheet` が開く。選ぶと行の表示が変わり、保存される（`sortOrderStore`）。
- [ ] `RecordsScreen` に「並び替え」ボタンはなく、保存された並び順で一覧が並ぶ。設定で並び順を変えて本棚に戻ると、その並びになっている（画面に戻ったとき読み直す）。
- [ ] 「データ」の行は 2 行目に「書き出し・読み込み · 最後に書き出した日 YYYY/MM/DD」（未書き出しなら「まだ書き出していません」）を出し、押すと `onOpenData` が呼ばれる。「このアプリについて」の行は押すと `onOpenAbout` が呼ばれる。
- [ ] 各行（書き出し・ステータスの初期値・本棚の管理・並び順・データ・このアプリについて）が `accessibilityRole="button"` で、高さ 44 以上。
- [ ] 「使う種別」「上に大きく出す作品」などの設定項目・文言・型・保存フィールド・テストがコードに残っていない（`grep` で `enabledKinds` `heroCriterion` `featured` などが 0 件）。`AppSettings` の項目は `defaultStatus` のみ。壊れた保存データでも既定値で表示して落ちない。
- [ ] 設定・データ・書き出し・読み込み・削除・このアプリについて・ライセンスの各画面とその部品で、色（`#xxx` / `rgb()` / 色名）・余白・角丸の数値を直書きしていない。`design/tokens.ts`（または `theme.ts` 経由）のみ。見た目に関わるものは Jest で表示要素・文言を確認する（下記テスト方針）。
- [ ] 各画面の既存の振る舞い（データ画面の書き出し・読み込み・全削除、about のバージョン・ライセンス遷移）は変わらず、既存テストが通る。
- [ ] `pnpm check` が通り、全体・差分カバレッジの閾値を満たす。

## 画面・振る舞い

`SettingsScreen`（タブ「設定」）。`ScrollView` で、上から:

1. 見出し「設定」（`screenTitle`）。
2. カード「読み終えたら」: 書き出し / ステータスの初期値。
3. カード「本棚」: 本棚の管理 / 並び順。
4. 見出しなしのカード: データ / このアプリについて。

行の間は `line` の区切り線。タップできる行は全部 `›` つき。値は読み込み前でも既定値で出す（落とさない）。

- 並び順: 行を押すと既存の `SortSheet`（タイトル「並び替え」）を開く。選ぶと閉じる。保存失敗は握りつぶす（`useSortOrder` の既存挙動）。
- 並び順の名前は `SortSheet` の「項目 + 向き」から作る（例: `endDate_desc` →「終了日の新しい順」、`rating_desc` →「レーティングの高い順」、`title_asc` →「タイトル あ→ん」）。表示名の対応表は `lib/sortOrderLabel.ts`（新規）にまとめ、`SortSheet` の選択肢と食い違わないようテストする。
- 本棚の数を読めなかったときは 0（「まだありません」）。
- 本棚の画面（`RecordsScreen`）は、フォーカスが戻るたびに並び順を読み直す。

データ系の画面は構成を変えず、トークンへ揃えるだけ（エラー表示は `danger`、補足は `text-tertiary`、ボタンは `Button` か既存の `radius` / `size` トークン）。

## 設計

変更するファイル（すべて `app/src/` 以下）:

- `screens/SettingsScreen.tsx` … カード構成の変更、「並び順」行・`SortSheet` の追加。`useSortOrder(sortOrderStore)` を使い、`sortOrderStore` は props で差し替え可能（`RecordsScreen` と同じ作り）。`onOpenStarters` などの props は今のまま。
- `app/(tabs)/settings.tsx` … 変更なし（props は今のまま）。必要なら調整。
- `components/SettingsCard.tsx` … `title` を省略可能にする（最後のカード用）。
- `components/SettingsRow.tsx` … デザインに合わせた見た目、行区切り（`divider` prop か、カード側で区切る）。`value` は省略可能にして「このアプリについて」（2 行目なし）を表せるようにする。バージョンは「このアプリについて」の画面側で出す（画像では 1 行）。
- `lib/sortOrderLabel.ts`（新規）… `SortOrder` → 表示名。
- `screens/RecordsScreen.tsx` … 並び替えボタン・`SortSheet`・`sortOpen` を削除。`useFocusEffect`（expo-router）か `useSortOrder` に `reload` を足して、フォーカス時に読み直す。`useSortOrder` は `[order, setOrder, reload]` ではなく、返り値は変えずに、フォーカス時の読み直しは `RecordsScreen` から `store.load()` を使うか、`useSortOrder` に `reloadKey` 引数を足す形にする（実装担当が既存テストに合う方を選び、判断ログに追記）。
- `types/settings.ts` / `lib/settingsStore.ts` / テスト … 古い設定の残骸があれば削除（`settingsStore.test.ts` の `enabledKinds`・`heroCriterion` のケースは、「未知のフィールドがあっても壊れない」という振る舞いのテストに言い換える。テストの数を減らす場合は判断ログに書く）。
- `screens/DataScreen.tsx` `screens/AboutScreen.tsx` `screens/LicensesScreen.tsx` `components/ExportSheet.tsx` `components/ImportSheet.tsx` `components/DeleteAllSheet.tsx` … トークン化の点検。すでに直書きがなければ変更しない。`ExportSheet` などの `style={{ color: ... }}` のインライン指定は `StyleSheet.create` にまとめる程度に整理してよい。
- `components/Spine.tsx` の `rgba(...)`（背表紙の縁の陰影）は設定画面の範囲外なので触らない。

状態管理: 設定は `useSettings`（context）、並び順は `useSortOrder`、書き出しは `useStarterSettings`、本棚の数は `useShelfRepository`。新しい状態管理は入れない。新しい依存はなし。

## テスト方針

| 受け入れ条件 | テスト |
|---|---|
| 見出し・カード構成、古い見出しがない | `screens/__tests__/SettingsScreen.test.tsx`（表示確認） |
| 書き出し行の文言・遷移 | 同上（`onOpenStarters`）、機能オフの文言は `starterSettings` を保存して確認 |
| ステータスの初期値 | 同上（シートで選択 → `appSettings.v1` を確認） |
| 本棚の管理の件数・遷移 | 同上（`shelfRepository` に作ってから表示確認、`onOpenShelves`） |
| 並び順の行・シート・保存 | 同上（`sortOrderStore` をメモリストレージで渡し、選択後の表示と保存値を確認） |
| 並び順の表示名 | `lib/__tests__/sortOrderLabel.test.ts`（全 `SortOrder` に名前がある） |
| RecordsScreen に並び替えボタンがない／保存された並びで出る | `screens/__tests__/RecordsScreen.test.tsx`（既存の並び替えテストを「ボタンがない」「保存済みの順で並ぶ」に書き換え。減らす場合は判断ログ） |
| データ・about への遷移 | `SettingsScreen.test.tsx` |
| 各行の role・最小サイズ | `SettingsRow` のテスト（`components/__tests__/SettingsRow.test.tsx`） |
| 古い設定が残っていない | `settingsStore.test.ts`（未知のフィールドを含む保存データでも既定値で読める）＋ 実装時の `grep` |
| 色の直書きがない | `grep -rnE "#[0-9a-fA-F]{3,8}|rgba?\(" app/src/screens app/src/components`（Spine 以外が 0 件）を実装時に確認し、PR に書く。可能なら対象ファイルを読んで直書きがないことを確認する小さな Jest テストを `design/__tests__/` に置く |
| データ系画面の既存の振る舞い | 既存の `DataScreen` / `AboutScreen` / `LicensesScreen` / 各シートのテスト |

見た目の確認: 撮影ツールは使えない前提。`settings.png` との照合は、表示される要素と文言を Jest で確認することで代える。PR 本文にその旨を書く。

## 判断ログ

- **並び順の置き場所**: Issue に「今の並び替えの設定を移す」とあるため、本棚の画面のボタンは外して設定の「並び順」へ移す。却下案: 両方に残す（Issue の「移す」と、本棚の画面を絞るデザイン `shelf.png`（ボタンは追加の丸ボタンだけ）に合わない）。
- **並び順の保存**: 既存の `sortOrderStore`（`useSortOrder`）をそのまま使う。`AppSettings` に入れ直す案は、保存キーが 2 つに分かれる手間が減る反面、移行の理由がなくリスクだけ増えるので却下。
- **本棚への反映**: タブは画面が残るため、並び順の変更を反映するにはフォーカス時の読み直しが必要。保存を共有するだけだと古い並びのままになる。
- **「並び順」の表示名**: 画像の例「読み終えた日の新しい順」に近づけるが、既存の用語（`SortSheet` は「終了日」）と揃えて「終了日の新しい順」にした。却下案: 画像の文言（シートと用語が食い違う）。
- **最後のカードの見出し**: 画像に見出しがないので付けない。
- **「このアプリについて」の 2 行目**: 画像にないので出さない（バージョンは画面側で出ている）。
- **データ系画面**: 構成は変えない。直書きがなければ変更しない（差分を最小にする）。直書きの有無は実装時に grep で確かめる。今の調査では `Spine.tsx` の陰影の `rgba` 以外に見つかっていない。
- **ステータスの初期値のシート**: 現状の `StatusDefaultSheet` を使い続ける。デザインに専用の画像がないため。
- **トークン追加の提案**: なし。
