# Issue #54 設定で、新しく記録するときのステータスの初期値を選べるようにする

## 背景・目的

記録するタイミングは人によって違う（読み終えてから記録する人、読み始めに記録する人、読みたい本をためる人）。新しい記録のステータスの初期値を設定画面（#48）で選べるようにして、毎回の選び直しをなくす。

デザイン: `docs/design-system/screens/README.md`「ステータスの初期値」（`settings-status-default.png`）。

### 現状（コード上の事実）
- `AppSettings`（`types/settings.ts`）は `enabledKinds` と `heroCriterion`。`settingsStore.parseSettings` がフィールドごとに検証し、`useSettings().update(patch)` で保存する。
- `SettingsScreen` は「使う種別」「記録一覧」カードを持つ。`HeroCriterionSheet`（`BottomSheet` + radio の行）と `SettingsRow` が前例。
- `RecordFormScreen`（新規時）は `initialValues`（ISBN・バーコード・タイトル検索・メディア検索・手入力のいずれも `/record/new` 経由でここに来る）に `kind` だけ補正して `RecordForm` に渡す。`createFormValues` は `status` 未指定なら `'planned'`、日付は空。
- `applyStatusChange(values, status, today)` は、フォーム上でステータスを変えたときの日付補完（`in_progress` → 始めた日、`completed`/`dropped` → 終えた日）。
- `getStatusLabel(kind, status)` は種別ごとに「読んでる／見てる」などを返す。
- #49（記録する項目の設定）は未実装。`AppSettings` に項目のオン/オフはない。

## スコープ

### やること
1. 設定に `defaultStatus`（`RecordStatus`）を足す。初期値 `completed`。保存・復元、不正値は初期値。
2. 設定画面に「記録するとき」カードと「ステータスの初期値」の行（2 行目に今の値）。タップで `BottomSheet`、4 つから 1 つ選ぶと保存して閉じる。
3. 新規記録のフォームを、設定のステータスで開く。「読んでる・見てる」なら始めた日、「読み終わった・見終わった」なら終えた日に今日を入れる。「読みたい・見たい」「途中でやめた」は日付を入れない。
4. 編集では使わない。

### やらないこと
- 種別ごとに別の初期値を持つこと
- #49 連動（ステータスがオフなら行を隠す、日付がオフならその日付を入れない）。未実装で参照先がないため。拡張点だけ用意する（判断ログ 3）
- 新しいライブラリの追加（**追加なし**）
- 既存の記録のステータスの変更、`applyStatusChange` の挙動変更

## 受け入れ条件

### 設定の保存（`settingsStore` / `useSettings`）
- [ ] `DEFAULT_SETTINGS.defaultStatus` は `completed`。保存がないときも `completed`
- [ ] 変更すると保存され、ストアを作り直して読み込むと同じ値。`enabledKinds`・`heroCriterion` は変わらない
- [ ] 保存値が不正（未知の文字列・文字列でない）なら `completed`。`defaultStatus` のない古い保存値でも、他のフィールドを保ったまま `completed`

### 設定画面
- [ ] 「記録するとき」カードに「ステータスの初期値」の行。2 行目に今の値（初期は「読み終わった・見終わった」）。`accessibilityRole="button"`、44px 以上
- [ ] タップで `BottomSheet`（見出し「ステータスの初期値」、閉じるボタン）が開き、4 つの選択肢が並ぶ: 「読みたい・見たい」「読んでる・見てる」「途中でやめた」「読み終わった・見終わった」。選択中は `selected` 状態を持つ
- [ ] 選択肢をタップすると、すぐ保存され、シートが閉じ、行の 2 行目が新しい値になる
- [ ] 設定画面を開き直しても（ストア再作成）選択が保たれる
- [ ] 「記録するとき」カードは「使う種別」カードと「記録一覧」カードの間に置く

### 新規記録のフォーム
- [ ] 設定が `completed`（初期）: ステータス「読み終わった／見終わった」が選ばれ、終えた日に今日、始めた日は空
- [ ] 設定が `in_progress`: 「読んでる／見てる」が選ばれ、始めた日に今日、終えた日は空
- [ ] 設定が `planned` / `dropped`: 該当ステータスが選ばれ、日付は両方空
- [ ] 種別に合わせた言い方（本・漫画は「読」、映画・ドラマ・アニメは「見」）。種別を切り替えても選択中のステータスは保たれる
- [ ] ISBN・バーコード・タイトル検索・メディア検索から来た `initialValues`（`status` なし）でも同じ
- [ ] `initialValues` が `status` / 日付を明示しているときはそれを優先（上書きしない）
- [ ] 編集（`recordId` あり）では、設定にかかわらず記録のステータス・日付が変わらない
- [ ] フォーム内でステータスを手で変えたときの挙動（`applyStatusChange`）は今までどおり

## 画面・振る舞い

### 設定画面
- 「使う種別」の下に `SettingsCard title="記録するとき"`、行 `SettingsRow label="ステータスの初期値" value=<今の値>`。
- 今の値・選択肢の表示は、読む系/見る系の両方を併記する中立表記（`lib/statusDefault.ts` の `STATUS_DEFAULT_LABELS`）: planned「読みたい・見たい」/ in_progress「読んでる・見てる」/ dropped「途中でやめた」/ completed「読み終わった・見終わった」。
- シート（`StatusDefaultSheet`、`HeroCriterionSheet` と同じ作り）: 縦に並ぶ radio の行。選択中は白い面＋黒い文字＋チェック表現（`Chip` の選択表現に揃え、色は `tokens.ts` から）。選ぶと `update({ defaultStatus })` → シートを閉じる。保存の完了は待たない（失敗は握りつぶす既存挙動）。

### 新規記録のフォーム
- `RecordFormScreen` の新規時に `applyDefaultStatus(initialValues, settings.defaultStatus, todayString())` で `initialValues` を作り、`RecordForm` に渡す。`RecordForm` 自体は変更しない（`createFormValues` の既定 `planned` も変えない）。
- エラー時の振る舞い: なし（純粋な計算のみ）。

## 設計

### 追加・変更するファイル
| ファイル | 内容 |
|---|---|
| `src/types/settings.ts`（変更） | `AppSettings.defaultStatus: RecordStatus`、`DEFAULT_SETTINGS.defaultStatus = 'completed'` |
| `src/lib/settingsStore.ts`（変更） | `defaults()` に追加。`parseDefaultStatus(value)`（`RECORD_STATUSES.find`）で検証し、不正なフィールドだけ既定値 |
| `src/lib/statusDefault.ts`（新規） | `STATUS_DEFAULT_LABELS`、`STATUS_DEFAULT_OPTIONS`（`RECORD_STATUSES` 順）、`applyDefaultStatus(initial, status, today)` |
| `src/components/StatusDefaultSheet.tsx`（新規） | `visible` `value` `onClose` `onChange`。`HeroCriterionSheet` と同構造 |
| `src/screens/SettingsScreen.tsx`（変更） | 「記録するとき」カードとシートの開閉 state |
| `src/screens/RecordFormScreen.tsx`（変更） | 新規時に `applyDefaultStatus` を通す |

### `applyDefaultStatus(initial, status, today)`
- `initial.status` が未指定のときだけ `status` を入れる。指定があればそのまま返す（日付も補完しない）。
- 入れたステータスが `in_progress` なら `startDate`、`completed` なら `endDate` を、未指定（`undefined`/`null`）のときだけ `today` にする。`planned`/`dropped` は日付に触れない。
- `applyStatusChange` を再利用せず自前で書く理由は、`dropped` で終えた日を入れない（Issue の指定）ため。
- 入力は書き換えない（新しいオブジェクトを返す）。
- 拡張点（#49）: 将来の `fields.status` / `fields.startDate` / `fields.endDate` のオフを引数で受けられるよう、日付を入れる判定を関数内の 1 か所にまとめる。今回は引数を足さない。

### 状態管理
`useSettings` の既存の context を使う。追加のライブラリ・context なし。保存キーは `appSettings.v1` のまま（フィールドごとの検証で後方互換。バージョンは上げない）。

## テスト方針

| 受け入れ条件 | テスト |
|---|---|
| 既定値・不正値・古い保存値・保存と復元 | `lib/__tests__/settingsStore.test.ts`（追記） |
| `applyDefaultStatus` の 4 ステータス・日付・明示値の優先・非破壊 | `lib/__tests__/statusDefault.test.ts`（新規） |
| 行の表示・シート・選択で保存して閉じる・再作成後も保持 | `screens/__tests__/SettingsScreen.test.tsx`（追記） |
| シートの選択状態 | `components/__tests__/StatusDefaultSheet.test.tsx`（新規） |
| 新規フォームのステータス・日付・種別別の言い方・検索経由・編集で不変 | `screens/__tests__/RecordFormScreen.test.tsx`（追記） |

- 日付は `jest.useFakeTimers().setSystemTime(...)` で固定する。
- 既定が `planned` → `completed` に変わるため、既存テストで新規フォームの初期ステータスを前提にしているものは、設定（`SettingsContextProvider` の `store`）で明示するか期待値を更新する。テストを削除・緩和しない。

## 判断ログ

1. **初期値の保存形式**: `defaultStatus: RecordStatus` を `AppSettings` に追加し、既存キー `appSettings.v1` に同居させた。却下: 別キー（読み込みが 2 回になり、`useSettings` の一括管理から外れる）、キーのバージョンアップ（フィールドごとの検証で足りる）。
2. **適用場所**: `RecordFormScreen` の新規時で適用し、`RecordForm`/`createFormValues` は変えない。却下: `createFormValues` の既定を設定に依存させる（純粋関数でなくなり、編集時にも影響しうる）、`RecordForm` 内で `useSettings`（編集と新規の分岐が増える）。ISBN・バーコード・検索の全経路が `/record/new` → `RecordFormScreen` を通るため、1 か所で全部に効く。
3. **#49 連動はしない**: #49 は未実装で項目の設定がない。Issue も「#49 が先に完了している場合」と条件付き。`applyDefaultStatus` の日付判定を 1 か所にまとめ、#49 側で足せるようにした。**提案**: #49 実装時に、ステータスがオフなら行を隠し、フォームでは `completed` を使わず `planned` 相当（ステータス自体を保存しない・既定値のまま）にする。日付項目がオフならその日付は入れない。
4. **`dropped` は日付を入れない**: フォームで手でステータスを変えると `dropped` でも終えた日が入る（`applyStatusChange`）が、Issue は「途中でやめた」では日付は空と指定しているため従う。却下: `applyStatusChange` を再利用（Issue と食い違う）。
5. **`initialValues` に明示された `status`/日付は優先**: 現状そうした経路はないが、呼び出し元の意図を上書きしないため。
6. **既定値を `completed` にする**: Issue 指定。現状の `planned` から変わるため、見た目の挙動が変わる（デザインの正本も `completed` を初期値としている）。既存テストは期待値を更新する（判断ではなく仕様変更）。
7. **表示は併記表記に固定**: 設定画面は種別をまたぐため「読みたい・見たい」と併記する（デザインどおり）。既存の `getStatusLabel` は種別が要るので使わない。フォームでは従来どおり種別別の言い方になる。
8. **チェック表現**: デザインは「白い面とチェック」。`HeroCriterionSheet` と同じ白い面＋黒文字に、文頭の `✓` を足す（装飾、読み上げ対象外）。新しい色・部品は足さない。
