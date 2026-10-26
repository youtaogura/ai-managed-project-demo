# Issue #48 設定画面を追加し、使う種別を選べるようにする

## 背景・目的

人によって記録したいものは違う（本だけ、映画とアニメだけ、など）。使わない種別の選択肢や表示があると記録の手間が増え、画面もごちゃつく。設定画面を作り、使う種別を絞れるようにする。

この Issue は設定画面の土台も兼ねる。入力項目の設定（#49）、トップの大きく出す作品（#50）、ステータスの初期値（#54）、データ（#55）、このアプリについて（#56）は、この画面・この設定の仕組みに後から足していく。

### 現状（コード上の事実）
- タブは `app/(tabs)/_layout.tsx` の `index`（記録）と `analytics`（振り返り）の 2 つ。`TabBar` は `ICONS` に `index` `analytics` のアイコンを持ち、それ以外は `●`。
- 種別は `MEDIA_KINDS = ['book','manga','movie','drama','anime']`（`types/record.ts`）。`RecordForm` が `MEDIA_KINDS` から種別の `ChipGroup`（単一選択）を常に出す。`createFormValues` の既定の種別は `book`。
- 記録は `useRecords()`（`RecordRepository.getAll()`）で読む。`RecordsScreen`・`ReviewScreen` がそれぞれ全件を使い、種別での絞り込みはない。`ReviewScreen` / `MonthlyBarChart` / `analytics.ts` は `MEDIA_KINDS` 全部を走査する。
- `AddSheet` は上の段「本・漫画」（バーコード / タイトルで探す / ISBN / 手で入力）と下の段「映画・ドラマ・アニメ」（`mediaSearchEnabled` のときタイトルで探す / 手で入力）。`useAddSheet` が遷移を担い、`manual` は `onAdd`（`/record/new`）、`mediaManual` は `kind=movie` で `/record/new`。
- 端末内保存の前例: `lib/storage.ts`（`KeyValueStorage`）、`lib/sortOrderStore.ts` + `hooks/useSortOrder.ts`（ストアを注入できる）。Context の前例: `hooks/useMediaSearch.tsx`（`provider` を差し替えられる）。
- `MediaSearchScreen` は種別の `ChipGroup`（映画・ドラマ・アニメ）を持つ。

## スコープ

### やること
1. 設定の保存・読み込みの仕組み（型・ストア・Context/hook）。#49・#50 などの設定を足せる形にする。
2. 設定画面（第 3 のタブ「設定」）の枠（見出し・カードの並び）と、「使う種別」の段。
3. 使う種別の反映:
   - 追加・編集フォームの種別の選択肢
   - 追加の入口（追加シート）
   - 一覧・振り返りの表示と集計
   - 映画・ドラマ・アニメ検索画面の種別チップ（使わない種別を出さない）
4. 種別を外しても記録は削除しない。戻せば元どおり表示される。

### やらないこと
- 入力する項目（#49）、大きく出す作品（#50）、ステータスの初期値（#54）、データ（#55）、このアプリについて（#56）の各カード。設定画面にはこの Issue では「使う種別」のカードだけを置く
- 振り返りの分析指標の設定、設定のクラウド同期・端末間共有
- 記録詳細画面（ID 指定で開く）の変更。種別が無効でも、開けば表示できる
- 新しいライブラリの追加（**追加なし**。保存は既存の `@react-native-async-storage/async-storage`）

## 受け入れ条件

### 設定の保存（`lib/settingsStore.ts` / `hooks/useSettings.tsx`）
- [ ] 保存がないときの設定は `{ enabledKinds: [すべての種別] }`
- [ ] 種別を変えると保存され、ストアを作り直して（アプリを開き直して）読み込むと同じ設定になる
- [ ] 保存値が壊れている（JSON でない・オブジェクトでない・`enabledKinds` が配列でない・有効な種別が 1 つもない）ときは、その項目の既定値になる。例外で落ちない。未知の種別名は捨てる。重複は除き、並びは `MEDIA_KINDS` の順にそろえる
- [ ] 読み込み・保存の失敗（ストレージの例外）でも落ちない。読み込み失敗は既定値、保存失敗は握りつぶす（画面上の状態はそのまま）
- [ ] 設定の読み込みが終わるまでは子を描画しない（初期値でちらつかせない）。読み込み失敗でも描画は始まる
- [ ] Provider が無い場所（既存のテスト）で `useSettings()` を呼ぶと、既定の設定が返る（更新は何もしない）

### 設定画面
- [ ] タブバーに「設定」が 3 つ目のタブとして出て、タップすると設定画面（見出し「設定」）が開く。選択中の表現は他のタブと同じ
- [ ] 「使う種別」カードに、本・漫画・映画・ドラマ・アニメの 5 つのチップ（複数選択）。初期値はすべて選択中
- [ ] チップをタップすると、選択・解除が切り替わり、すぐ保存される。開き直しても保たれる
- [ ] 選択中が 1 つだけのとき、そのチップは外せない（タップしても状態は変わらない・保存もされない）。説明文「最低 1 つは選んでおく必要があります」を常に出す
- [ ] 各チップは `checkbox` の role と `checked` の状態を持つ（読み上げ用）

### 種別の反映
- [ ] 追加・編集フォームの種別の選択肢は、使う種別だけ。使わない種別は出ない
- [ ] 使う種別が 1 つだけのとき、フォームに種別の選択 UI（見出し「種別」とチップ）が出ない。保存した記録の `kind` はその種別
- [ ] 追加フォームの初期の種別が使わない種別になるとき（既定の `book`、検索などから渡された `kind` を含む）、使う種別に置き換える（同じ系統＝本・漫画 / 映画・ドラマ・アニメ を優先し、なければ使う種別の先頭）
- [ ] 編集中の記録が使わない種別でも、編集・保存できる。種別の選択肢には「その記録の元の種別」を含める（使う種別が 1 つで、記録の種別がそれと違うときは、2 択になって選択 UI が出る）。選択肢から種別を切り替えても、元の種別は選択肢に残る
- [ ] 追加シート: 本・漫画のどちらも使わないとき、「本・漫画」の段（バーコード・タイトルで探す・ISBN・手入力）を出さない。映画・ドラマ・アニメのどれも使わないとき、「映画・ドラマ・アニメ」の段を出さない
- [ ] 追加の入口が「手で入力する」1 つだけになるとき（本・漫画を使わず、TMDb 検索も使えない、など）は、シートを出さずにすぐ `/record/new` を開く。入口が 2 つ以上あればシートを出す
- [ ] 「映画・ドラマ・アニメを手で入力する」の `kind` は、使う映画・ドラマ・アニメの先頭（`movie` `drama` `anime` の順）。「本・漫画」側の手入力・各検索の遷移先フォームは、上の初期の種別の置き換えで決まる
- [ ] 映画・ドラマ・アニメ検索画面の種別チップは、使う種別だけ。1 つだけのときはチップを出さない。初期の種別は使う種別の先頭
- [ ] 一覧（記録タブ）: 使わない種別の記録は、「最近読み終えた・見終えた」「すべての記録」・年／月のカウンターのどれにも出ない。使う種別の記録が 0 件のときは「記録なし」の状態（空の棚）を出す
- [ ] 振り返り: 使わない種別の記録は集計（月別の完了数・レーティング・年の合計）に入らない。凡例・種別ごとの表示は使う種別だけ。使う種別の記録が 0 件のときは「記録なし」の状態
- [ ] 種別を外してから戻すと、その種別の記録は再び一覧・振り返りに出る（記録は削除されていない。リポジトリの内容は変わらない）

## 画面・振る舞い

### 設定画面（`settings.png` に沿う）
- `ScreenContainer` の中に、見出し「設定」（`screenTitle`）。下にスクロールできる縦並び（今後カードが増える）
- カード: 面 `surface1`・角丸 `radius.card`（なければ近い既存のトークンを使う。新しい値は書かない）・内側余白 `space`。カードの上に小さな見出し（`label`・`textSecondary`）
- 「使う種別」カード: 5 つのチップを `ChipGroup` と同じ見た目（`columns` は 3、2 行）で並べる。下に説明文（`micro`・`textTertiary`）「使わない種別は、入力欄・一覧・振り返りに出なくなります。記録は消えず、戻せば元どおり表示されます。」と、最低 1 つの注意書き
- 状態遷移: チップのタップ → （最後の 1 つでなければ）state を更新 → 保存を非同期に発行。画面の再描画は state で行い、保存の完了を待たない
- エラー: 読み込み・保存の失敗は画面に出さない（並び順の保存と同じ。判断ログ 6）

### 追加の入口
| 本・漫画を使う | 映画等を使う | TMDb キー | 入口 |
|---|---|---|---|
| ○ | ○ | あり/なし | 今のシートそのまま（映画側の「タイトルで探す」はキーがあるときだけ） |
| ○ | × | - | シート（本・漫画の段のみ） |
| × | ○ | あり | シート（映画等の段のみ。タイトルで探す・手で入力） |
| × | ○ | なし | シートを出さず `/record/new`（`kind` は使う映画等の先頭） |

### フォームの種別
- 新規: 初期の種別を置き換えた上で、選択肢＝使う種別
- 編集: 選択肢＝使う種別 ∪ 記録の元の種別（元の種別はマウント時点の `initialValues.kind` で固定）

## 設計

### 追加するファイル
| ファイル | 役割 |
|---|---|
| `src/types/settings.ts` | `AppSettings = { enabledKinds: MediaKind[] }`、`DEFAULT_SETTINGS`（全種別）。今後の設定はここにフィールドを足す |
| `src/lib/settingsStore.ts` | `SETTINGS_STORAGE_KEY = 'appSettings.v1'`、`SettingsStore = { load(): Promise<AppSettings>; save(s: AppSettings): Promise<void> }`、`createSettingsStore(storage: KeyValueStorage)`。保存は JSON 1 つのキー。`parseSettings(raw: string \| null): AppSettings` は**フィールドごとに**検証し、不正なフィールドだけ既定値にする（#49 以降でフィールドが増えても古い保存値を壊さない） |
| `src/hooks/useSettings.tsx` | `SettingsContextProvider({ store?, children })`（`store` 省略時は `createSettingsStore(asyncKeyValueStorage)`、`useMediaSearch.tsx` と同じ注入方式）。`useSettings(): { settings: AppSettings; update(patch: Partial<AppSettings>): void }`。Context の既定値は `DEFAULT_SETTINGS` と no-op の `update`。読み込み完了までは `null` を返す |
| `src/lib/enabledKinds.ts` | 種別まわりの純粋関数（下記） |
| `src/screens/SettingsScreen.tsx` | 設定画面 |
| `src/components/SettingsCard.tsx` | 見出し + カード枠（#49 以降の段も使う） |
| `src/app/(tabs)/settings.tsx` | ルート。`<SettingsScreen />` を返すだけ |

### `lib/enabledKinds.ts`
- `toggleKind(enabled: readonly MediaKind[], kind: MediaKind): MediaKind[]` … 切り替え。結果は `MEDIA_KINDS` 順。外すと空になるときは入力をそのまま返す
- `filterRecordsByKinds(records, enabled)` … `enabled` に含まれる種別の記録だけ（元の配列は変えない）
- `resolveInitialKind(requested: MediaKind | undefined, enabled): MediaKind` … `requested` が使う種別ならそれ。そうでなければ同じ系統（`book/manga`、`movie/drama/anime`）の使う種別の先頭、なければ使う種別の先頭。`requested` が未指定なら `book` を要求したものとして扱う（既存の既定）
- `formKindOptions(enabled, originalKind?)` … `MEDIA_KINDS` 順で `enabled ∪ {originalKind}`
- `addEntries(enabled, mediaSearchEnabled): AddTarget[]` … 追加シートに出す入口の一覧（本・漫画のいずれかを使うとき `scan` `search` `isbn` `manual`、映画等のいずれかを使うとき `mediaSearch`（キーがあるときだけ）と `mediaManual`）
- `firstMediaKind(enabled): MediaKind | undefined` … `movie` `drama` `anime` のうち使う先頭

### 既存ファイルの変更
- `app/_layout.tsx` … `SettingsContextProvider` を `RecordRepositoryProvider` の外側または内側に 1 つ足す（読み込み完了まで子を出さないので、フォント読み込み後・`Stack` の前）
- `app/(tabs)/_layout.tsx` … `<Tabs.Screen name="settings" options={{ title: '設定' }} />` を 3 つ目に足す
- `components/TabBar.tsx` … `ICONS` に `settings`（記号アイコン。既存と同じ文字アイコン方式）を足す
- `components/Chip.tsx` … 複数選択用の `ChipMultiGroup`（`label` `options` `values` `onChange(value)`、`role=checkbox`、見た目は `ChipGroup` と共通のスタイルを使う）を足す。`ChipGroup` の挙動は変えない
- `components/RecordForm.tsx` … `useSettings()` から使う種別を読み、`formKindOptions` で選択肢を作る。選択肢が 1 つなら種別の見出しとチップを描画しない
- `screens/RecordFormScreen.tsx`（新規作成の分岐）… `initialValues.kind` を `resolveInitialKind` で置き換えてから `RecordForm` に渡す。編集の分岐は置き換えない（元の種別を保つ）。`RecordForm` が元の種別を `initialValues.kind` から取るので、新規では置き換え後の値が「元の種別」になる（使う種別なので問題ない）
- `components/AddSheet.tsx` … props に `enabledKinds`（または `entries: AddTarget[]`）を足し、段ごとに表示を切り替える。見た目は変えない
- `hooks/useAddSheet.ts` … `useSettings()` と `useMediaSearch()` を読み、`openAdd` で `addEntries` が「手入力 1 つだけ」ならシートを開かず `select` 相当の遷移をする。`mediaManual` の `kind` は `firstMediaKind`。シート用の `entries` も返す（`RecordsScreen` / `ReviewScreen` は `mediaSearchEnabled` の取得を `useAddSheet` に寄せてよい）
- `screens/RecordsScreen.tsx` / `screens/ReviewScreen.tsx` … `useRecords()` の結果を `filterRecordsByKinds` で絞ってから、既存の `useMemo`・空判定に渡す。`ReviewScreen` の種別ごとの凡例・内訳は `MEDIA_KINDS` の代わりに使う種別を走査（`MonthlyBarChart` に `kinds` prop を足す）
- `screens/MediaSearchScreen.tsx` … `KIND_OPTIONS` を使う種別（映画・ドラマ・アニメ）で絞る。1 つなら `ChipGroup` を出さない。初期の `kind` は絞った先頭
- `testProviders.tsx` … テスト用に設定を注入するヘルパー（`withSettings(store or initial, children)`）を足してよい（`testProviders.tsx` は人間保護の対象外）

### 状態管理
- 設定は React Context（`SettingsContextProvider`）。ライブラリは追加しない（判断ログ 1）
- `update` は state を同期的に更新し、保存は直列化する（直前の保存が終わってから次を保存。最後の呼び出しが勝つ）。アンマウントで中断しない
- 画面は `useSettings()` だけを見る。ストレージは Provider の外に漏らさない

### データ構造
```ts
// 保存形式（AsyncStorage の 'appSettings.v1'）
{ "enabledKinds": ["book", "movie"] }
```
今後の設定（#49 の項目、#50 の条件、#54 の初期値）は `AppSettings` と `parseSettings` にフィールドを足す。キーのバージョンは、互換のない変更のときだけ上げる。

## テスト方針

| 受け入れ条件 | テスト |
|---|---|
| 既定値・壊れた保存値・失敗時・並び正規化 | `lib/__tests__/settingsStore.test.ts`（メモリ上の `KeyValueStorage`、例外を投げるストレージ） |
| 保存→作り直して読み込み／読み込み完了まで描画しない／Provider 無しの既定値／最後の 1 つは更新されない | `hooks/__tests__/useSettings.test.tsx` |
| `toggleKind` `filterRecordsByKinds` `resolveInitialKind` `formKindOptions` `addEntries` `firstMediaKind` | `lib/__tests__/enabledKinds.test.ts` |
| 設定画面のチップ操作・最後の 1 つは外せない・保存される・開き直しで保たれる | `screens/__tests__/SettingsScreen.test.tsx`（同じストアで画面を作り直す） |
| タブ「設定」が出る | `components/__tests__/TabBar.test.tsx`（既存があれば追記）。ルートの存在は `app/__tests__` の既存方式に合わせる |
| フォームの選択肢・種別が 1 つのとき UI なし・保存した `kind`・編集で元の種別を含む・初期の種別の置き換え | `components/__tests__/RecordForm.test.tsx`、`screens/__tests__/RecordFormScreen.test.tsx` |
| 追加シートの段の出し分け・手入力 1 つだけならシートなしで遷移 | `components/__tests__/AddSheet.test.tsx`、`hooks/__tests__/useAddSheet.test.ts(x)`（`router` はモック） |
| 一覧・振り返りで使わない種別が出ない／戻すと出る／記録は消えない | `screens/__tests__/RecordsScreen.test.tsx`、`ReviewScreen.test.tsx`（`withSettings` で設定を差し替え、リポジトリの内容は変えない） |
| 映画等検索のチップの絞り込み | `screens/__tests__/MediaSearchScreen.test.tsx` |

既存のテストは Provider なしで通ること（Context の既定値が全種別）。振る舞い（表示・操作結果）で検証し、内部構造には依存しない。変更行カバレッジ 80% 以上。

## 判断ログ

1. **設定の持ち方: React Context + 自前のストア**
   - 選んだ案: `SettingsContextProvider` + `createSettingsStore(KeyValueStorage)`。既存の `useMediaSearch`（注入できる Context）と `sortOrderStore`（ストアの注入）の組み合わせ。
   - 却下: Zustand 等の状態管理ライブラリ（CLAUDE.md が「まず Context で足りるか」を求め、設定は 1 つの小さなオブジェクトで足りる）。`useSortOrder` のように各画面でストアを個別に読む案（設定画面の変更が他のタブに即座に伝わらない）。
2. **保存形式: 1 つのキーに JSON 全体 + フィールドごとの検証**
   - 却下: 設定ごとに別キー（#49 以降で増えると読み込みが分散する。一括の書き出し（#55）もやりにくい）。
3. **読み込み完了まで子を描画しない**
   - 選んだ案: 読み込みは端末内で一瞬のため、完了まで `null`（スプラッシュ直後の空白）。却下: 既定値で先に描画し後から差し替え（全種別の表示が一瞬出てちらつく。使わない種別の記録が一瞬見える）。
4. **使う種別が 0 件にならないようにする方法**: 最後の 1 つのタップを無視する（`disabled` にせず説明文で理由を常に見せる）。却下: 外した時点でエラー表示（操作が増える）、全部外れたら全種別に戻す（意図しない動き）。
5. **追加の入口が手入力 1 つだけのとき、シートを出さずに直接フォームを開く**（Issue が許可していた判断）。シートに選択肢が 1 つしかないのはタップが増えるだけのため。却下: 常にシートを出す。
6. **保存失敗は握りつぶす**: 並び順（`useSortOrder`）と同じ扱い。設定は UI の好みで、失敗しても画面の状態は保たれる（次回起動で既定に戻る可能性は許容）。却下: トースト等のエラー表示（デザインにない部品を作ることになる）。
7. **編集中の記録が使わない種別のとき**: 選択肢に元の種別を含める（Issue の指示）。含める元の種別はマウント時点の値で固定し、いったん別の種別に切り替えても戻せるようにした。
8. **記録の絞り込みは画面側（`useRecords` の結果）で行い、リポジトリは変えない**: 記録は削除・変更されず、「戻せば元どおり」が構造的に保証される。却下: `useRecords` 内で絞る（詳細・編集など全件が必要な画面で意図せず欠ける）。
9. **使う記録が 0 件のとき（記録はあるが全部使わない種別）**: 「記録なし」の空の状態を出す。専用の文言（「使わない種別の記録があります」など）は、デザインにない表現を増やすため見送り。必要なら提案として #49 以降で扱う。
10. **記録詳細は絞り込まない**: ID 指定で開く画面で、一覧から到達できないため実害がなく、変更範囲を広げない。
11. **映画・ドラマ・アニメ検索（#63）の種別チップも絞る**: Issue の列挙にはないが「選んでいない種別は、アプリから消えたように見せる」に含まれると解釈。
12. **「設定」タブのアイコン**: デザイン画像の絵柄が文字アイコンで再現できない場合は、既存の文字アイコン方式（`TabBar.ICONS`）で近い記号を使う。アイコンの追加はデザインシステムの変更になるため、画像アイコンは作らず、必要なら人間への提案とする。
13. **新しいトークン・色は追加しない**。カードの角丸などがトークンにない場合は、最も近い既存トークンを使い、実装工程の判断ログに書く。
14. **ライブラリの追加なし**（`async-storage` は既存依存）。
