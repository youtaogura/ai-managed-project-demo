# Issue #50 設定で、記録一覧の上に大きく出す作品の条件を選べるようにする

## 背景・目的

記録一覧（`RecordsScreen`）のいちばん上には、作品を大きく横に並べる段（hero）がある。今は「最近読み終えた・見終えた」固定。何を出したいかは人によって違うため、設定画面（#48）で条件を 1 つ選べるようにする。

デザイン: `docs/design-system/screens/README.md`「上に大きく出す作品」（`settings-hero.png`）。

### 現状（コード上の事実）
- `RecordsScreen` は `recentlyFinished(records, 10)`（`lib/yearCounter.ts`）で hero を作り、見出し「最近読み終えた・見終えた」を固定で出す。0 件なら段ごと出さない。`records` は使う種別（#48）で絞り込み済み。
- 設定は `types/settings.ts` の `AppSettings`（今は `enabledKinds` のみ）、`lib/settingsStore.ts` の `parseSettings`（フィールドごとに検証）、`hooks/useSettings.tsx`（`update(patch)`）。
- `SettingsScreen` は `SettingsCard` で「使う種別」だけを持つ。`BottomSheet`（`showCloseButton`）、`SortSheet` が既存の前例。
- `getStatusLabel(kind, status)` は種別ごとに「読んでる／見てる」などを返す。
- #49（入力する項目の設定）は未実装（`AppSettings` に項目の設定がない）。

## スコープ

### やること
1. 設定に `heroCriterion`（5 条件のいずれか）を足す。保存・復元、壊れた値は初期値。
2. 条件ごとの「見出し・絞り込み・並び順」を 1 か所（テーブル）に定義し、`RecordsScreen` がそれを使う。
3. 設定画面に「記録一覧」カードと「上に大きく出す作品」の行（2 行目に今の値）。タップで `BottomSheet`、選ぶと保存して閉じる。
4. 「表示しない」では段を出さない。条件に合う作品がないときも段を出さない。

### やらないこと
- 条件の組み合わせ・自作、段の複数化
- #49 連動（入力項目がオフのときに条件を隠す・初期値に戻す）。#49 が未実装で参照先がないため。**拡張点だけ用意する**（判断ログ 3）
- 新しいライブラリの追加（**追加なし**）
- `YearCounter`、「すべての記録」、並び替えの変更

## 受け入れ条件

### 条件の定義（`lib/heroCriteria.ts`）
- [ ] 条件は `recent` `inProgress` `highRated` `planned` `none` の 5 つ。初期値は `recent`
- [ ] `recent`: `endDate` が null でない記録を `endDate` の新しい順（同日は `createdAt` の新しい順）。今の `recentlyFinished` と同じ結果
- [ ] `inProgress`: `status === 'in_progress'`。`startDate` の新しい順。`startDate` が null のものは、`startDate` がある記録より後ろ。null 同士・同日は `updatedAt` の新しい順
- [ ] `highRated`: `rating !== null && rating >= 4.0`。`rating` の高い順。同点は `createdAt` の新しい順
- [ ] `planned`: `status === 'planned'`。`createdAt` の新しい順
- [ ] `none`: 常に空
- [ ] どの条件も最大 10 件（`HERO_LIMIT`）。入力配列は書き換えない
- [ ] `dropped`・`completed` は `inProgress` `planned` に入らない。`highRated` はステータスを問わない
- [ ] 見出し: `recent`「最近読み終えた・見終えた」/ `inProgress`「今読んでる・見てる」/ `highRated`「評価の高い作品」/ `planned`「読みたい・見たい」。`none` は見出しなし

### 設定の保存（`settingsStore` / `useSettings`）
- [ ] 保存がないときの `heroCriterion` は `recent`
- [ ] 変更すると保存され、ストアを作り直して読み込むと同じ値になる。`enabledKinds` など他のフィールドは変わらない
- [ ] 保存値が不正（未知の文字列・文字列でない）なら `recent`。`heroCriterion` がない古い保存値（`appSettings.v1` に `enabledKinds` だけ）でも `enabledKinds` を保ったまま `recent` になる
- [ ] `DEFAULT_SETTINGS.heroCriterion` は `recent`

### 設定画面
- [ ] 「記録一覧」カードに「上に大きく出す作品」の行があり、2 行目に今の条件名（初期は「最近読み終えた・見終えた」）。`accessibilityRole="button"`、44px 以上
- [ ] タップすると `BottomSheet`（見出し「上に大きく出す作品」、閉じるボタン、説明文）が開き、5 つの選択肢（名前＋補足）が並ぶ。選択中は `selected` 状態を持つ
- [ ] 補足: `recent`「終えた日の新しい順」/ `inProgress`「読んでる・見てるの作品」/ `highRated`「レーティング 4.0 以上を高い順」/ `planned`「これから読む・見る作品」/ `none` は補足なし
- [ ] 選択肢をタップすると、すぐ保存され、シートが閉じ、行の 2 行目が新しい条件名になる。「表示しない」の 2 行目は「表示しない」
- [ ] 設定画面を開き直しても（ストア再作成）選択が保たれる

### 記録一覧
- [ ] 条件を変えて一覧を開くと、hero の見出しと作品が条件どおりに変わる（`recent` 以外でも該当作品が出る）
- [ ] hero は最大 10 件、条件の並び順
- [ ] 条件に合う作品が 0 件、または `none` のとき、hero の見出しと段が出ない（「すべての記録」は出る）
- [ ] 初期値では今までと同じ表示（見出し「最近読み終えた・見終えた」、終えた日の新しい順）
- [ ] 使わない種別（#48）の記録は hero にも出ない

## 画面・振る舞い

### 設定画面
- 「使う種別」カードの下に `SettingsCard title="記録一覧"` を置き、行を 1 つ入れる。行は左に「上に大きく出す作品」（`body`）と 2 行目に今の値（`label`・`textSecondary`）、右に `›`（装飾。読み上げ対象外）。`accessibilityLabel` は「上に大きく出す作品、<今の値>」。
- シート: 見出し `section-title`、下に説明文「記録一覧のいちばん上に、大きく並べる作品です。合う作品がないときは表示しません。」（`micro`・`textTertiary`）。選択肢は縦に並ぶ行（面 `surface2` 系、選択中は白い面＋黒い文字。`Chip` の選択表現に揃え、色は `tokens.ts` から）。1 行目は条件名（`body` 太字）、2 行目は補足（`label`）。
- 状態遷移: 行タップ → シート開 → 選択肢タップ → `update({ heroCriterion })` → シート閉。保存の完了は待たない（失敗は握りつぶす。`useSettings` の既存挙動）。
- 条件の言い方は読む系／見る系の種別混在のため、中立の併記（「読んでる・見てる」）で固定する。

### 記録一覧
- `hero = selectHeroRecords(records, settings.heroCriterion)`、見出しは `HERO_CRITERIA[criterion].title`。`hero.length > 0` のときだけ見出しと `ScrollView` を描画（今の分岐を引き継ぐ）。
- エラー時の振る舞い: なし（純粋な計算のみ）。

## 設計

### 追加・変更するファイル
| ファイル | 内容 |
|---|---|
| `src/types/settings.ts`（変更） | `HERO_CRITERIA_IDS = ['recent','inProgress','highRated','planned','none'] as const`、`HeroCriterion`。`AppSettings` に `heroCriterion: HeroCriterion`、`DEFAULT_SETTINGS.heroCriterion = 'recent'` |
| `src/lib/settingsStore.ts`（変更） | `defaults()` に `heroCriterion` を足す。`parseHeroCriterion(value: unknown): HeroCriterion \| null`（`HERO_CRITERIA_IDS` に含まれる文字列のみ）。`parseSettings` で不正ならそのフィールドだけ既定値 |
| `src/lib/heroCriteria.ts`（新規） | `HERO_LIMIT = 10`、`HERO_RATING_THRESHOLD = 4`、`HeroCriterionDef = { id, title: string \| null, description: string \| null, select(records): MediaRecord[] }`、`HERO_CRITERIA: Record<HeroCriterion, HeroCriterionDef>`、`HERO_CRITERION_OPTIONS`（シート用の並び＝`HERO_CRITERIA_IDS` 順）、`selectHeroRecords(records, criterion)`（フィルタ → 並べ替え → `slice(0, HERO_LIMIT)`）。**条件を足すときは `HERO_CRITERIA_IDS` とこのテーブルに 1 件足すだけ**にする（Record 型なので足し忘れは型エラー） |
| `src/lib/yearCounter.ts`（変更） | `recentlyFinished` は `heroCriteria` の `recent` と同じ結果。重複を避け、`recent` の `select` から `recentlyFinished` を呼ぶ形にしてよい（既存テストはそのまま通す） |
| `src/components/HeroCriterionSheet.tsx`（新規） | props `{ visible, value: HeroCriterion, onClose, onChange }`。`BottomSheet` + 選択肢の行（`Pressable`、`accessibilityRole="radio"`、`accessibilityState={{ selected, checked }}`、`accessibilityLabel` は条件名） |
| `src/components/SettingsRow.tsx`（新規） | `{ label, value, onPress }`。タップできる設定行（#49 以降の「ステータスの初期値」なども使う） |
| `src/screens/SettingsScreen.tsx`（変更） | 「記録一覧」カードと `HeroCriterionSheet`。開閉の state はこの画面のローカル |
| `src/screens/RecordsScreen.tsx`（変更） | `recent` / `RECENT_LIMIT` を `selectHeroRecords` に置き換え、見出しを条件から出す |

### 状態管理・データ構造
- 保存は既存の `appSettings.v1` に `heroCriterion` を足すだけ。キーは上げない（足しただけで互換がある。判断ログ 4）。
- ライブラリ追加なし。

## テスト方針

| 受け入れ条件 | テスト |
|---|---|
| 条件の定義（各条件の絞り込み・順・件数・null 日付・不変） | `lib/__tests__/heroCriteria.test.ts`（各条件に 11 件以上のデータで 10 件制限、同点・null のタイブレーク、rating 3.5 / 4 / 4.5 の境界、`dropped`・`completed` の除外） |
| 設定の保存・復元・不正値・古い保存値 | `lib/__tests__/settingsStore.test.ts` に追記 |
| 設定画面（行・シート・選択・保存・再オープン） | `screens/__tests__/SettingsScreen.test.tsx` に追記（インメモリの `KeyValueStorage` でストアを作り、Provider を作り直して保持を確認） |
| 記録一覧（見出し・作品の切り替え・0 件で非表示・`none`・初期値） | `screens/__tests__/RecordsScreen.test.tsx` に追記（`SettingsContextProvider` に条件入りのストアを渡す） |
| 使わない種別が hero に出ない | `RecordsScreen.test.tsx`（既存の種別絞り込みテストを hero の見出し付きで確認） |

行・シートの描画は画面のテスト経由で通るが、`HeroCriterionSheet` の補足文・選択状態は個別にも確認する（`components/__tests__/HeroCriterionSheet.test.tsx`）。変更行 80% 以上を満たすこと。

## 判断ログ

1. **条件を 1 つのテーブル（`HERO_CRITERIA`）に集約**。選んだ案: 見出し・補足・絞り込み/並びを `Record<HeroCriterion, Def>` に持たせ、画面・シートが参照する。却下: 画面側で `switch` を並べる案（条件追加のたびに 3 か所を触る。Issue の「足しやすい作り」に反する）。
2. **`inProgress` の並び**: Issue どおり開始日の新しい順で、開始日なしは末尾、同順は `updatedAt` の新しい順。Issue の「なければ更新日時」は「開始日がない記録は更新日時で並べる」とも読めるが、日付と日時を混ぜて比較すると順が不安定になるため、開始日あり→なしの 2 群に分け、各群内を決める案にした。却下: 開始日がなければ `updatedAt` の日付部分で同じ軸に混ぜる案（日付と日時の意味が違い、直感と合いにくい）。
3. **#49 連動は実装しない**。#49 は未完了で、入力項目の設定（`AppSettings` のフィールド）がない。Issue も「#49 が先に完了している場合」と条件付き。選んだ案: 今は何もせず、`HeroCriterionDef` に将来 `requires?: 項目名` を足して、シートの選択肢のフィルタと `heroCriterion` の初期値フォールバックを #49 側（または後続）で足せるようにする。却下: 存在しない設定を先取りして型を作る案（使われないコードになり、#49 の設計を縛る）。**この受け入れ条件は #49 完了後の別作業**として、レビューで残課題に挙げる。
4. **保存キーは `appSettings.v1` のまま**。`parseSettings` がフィールドごとに検証するため、`heroCriterion` のない古い保存値は `recent` で読める（#48 の方針）。却下: `v2` に上げる案（移行コードが要り、データ互換のメリットがない）。
5. **シートの選択は選んだらすぐ保存して閉じる**。デザイン（`settings-status-default.png` と同じ作法）に合わせた。「適用」ボタンは作らない。
6. **条件名は「読む／見る」併記で固定**。種別混在の一覧では、種別ごとの言い分けができないため。デザイン（`settings-hero.png`）の文言そのまま。
7. **「評価の高い作品」のしきい値 4.0 は定数 `HERO_RATING_THRESHOLD`**。設定化しない（Issue のやらないこと）。レーティングは 0.5 刻みの数値（`MediaRecord.rating: number | null`）で、`>= 4` で判定する。
8. **デザインシステム**: シートの選択行（面＋選択中は白）は既存の `Chip` と同じ表現で、新しい色・トークンは使わない。行の `›` は文字で表現し、アイコン部品は足さない。トークン追加の提案はなし。
