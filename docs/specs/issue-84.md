# Issue #84 記録のデータを作り替える: ひとこと・書き出し・引用・メモ・お気に入り・本棚

## 背景・目的

感想を「自由記述の 1 欄」から、「ひとこと」「書き出しの続き」「引用」「メモ」「自由に書いた文章」に作り替える。あわせて、お気に入り・背表紙の色・本棚（タグ）を持てるようにする。この Issue は**データとロジックだけ**を作る（画面は #85 以降）。まだリリースしていないので、保存データの後方互換・移行は考えない。古い形式は読めなくてよいが、読めないときに落ちない。

## スコープ

### やること
- `MediaRecord` に次を追加する: `oneLiner` / `starters`（書き出しの続き・複数）/ `quotes`（複数）/ `memos`（複数）/ `freeTexts`（自由に書いた文章・複数）/ `favorite` / `spineColor` / `shelfIds`。`review`（感想）は削除する。
- 本棚（`Shelf`）の型・保存・作成・名前変更・削除・並べ替え。削除すると記録の `shelfIds` からも外れる（本は残る）。
- 書き出しの設定（`StarterSettings`）の型・保存・読み込み。
- 書き出しを選ぶロジック（`pickStarters` / `swapStarters`）。
- 評価の言葉（`getRatingWord`）。
- 背表紙の色の自動割り当て（新規記録に `spine-1`〜`spine-10` を順に）。
- バックアップ（#55）の形式・読み込みを新データ構造に合わせる（本棚と書き出しの設定を含める）。CSV の「感想」列を「ひとこと」に置き換える。
- 既存の画面のうち `review` を使う箇所（記録フォームの感想欄、詳細・情報欄の感想表示）は、**型が通るよう最小限で外す**（作り直しは後続）。

### やらないこと
- 画面・デザインの作り直し（#85 以降）。本棚・書き出し・引用などの入力 UI、本棚フィルタ、お気に入りボタン。
- 保存データの移行処理（`CURRENT_SCHEMA_VERSION` を上げるが、古い `review` などは単に無視する）。
- `src/design/tokens.ts` と `docs/design-system/` の変更。
- 新しい依存の追加（なし）。

## データ構造

```ts
// types/record.ts
export const SPINE_COLORS = ['spine-1', ..., 'spine-10'] as const;
export type SpineColor = (typeof SPINE_COLORS)[number];

export type StarterEntry = {
  id: string;
  starter: string;     // 書いたときの書き出しの文（コピー。設定を変えても変わらない）
  text: string;        // 続きの文章（空文字は保存しない）
  createdAt: string;   // ISO 8601
};
export type QuoteEntry = { id: string; text: string; page: string | null; comment: string | null; createdAt: string };
export type MemoEntry  = { id: string; text: string; page: string | null; createdAt: string };
export type FreeTextEntry = { id: string; text: string; createdAt: string };

export type MediaRecord = {
  ...既存（review を除く）,
  oneLiner: string | null;     // 「ひとことで言うと、」の続き
  starters: StarterEntry[];
  quotes: QuoteEntry[];
  memos: MemoEntry[];
  freeTexts: FreeTextEntry[];
  favorite: boolean;
  spineColor: SpineColor;
  shelfIds: string[];
};
export type NewRecordInput = Omit<MediaRecord, 'id' | 'createdAt' | 'updatedAt' | 'spineColor'>;
```

- ページは文字列（`"12"`、`"12-14"` など自由）。空は `null`。
- `photoUri` / `coverUrl` はこれまでどおり保存する（`coverUrl` は画面では使わなくなる想定。削除しない）。`rating` もそのまま。
- `starters` の `starter` は `STARTER_FIXED`（「ひとことで言うと、」）では作らない（固定欄は `oneLiner` に入る）。

```ts
// types/shelf.ts
export type Shelf = { id: string; name: string; order: number };   // order は 0 始まりの連番に正規化
// types/starter.ts
export const STARTER_FIXED = 'ひとことで言うと、';
export const STARTER_COUNT_OPTIONS = [2, 3, 5] as const;
export type StarterItem = { id: string; text: string; enabled: boolean; custom: boolean };
export type StarterSettings = {
  enabled: boolean;        // 書き出し機能そのもののオン・オフ（初期値 true）
  count: 2 | 3 | 5;        // 初期値 3
  items: StarterItem[];    // 初期値は Starter/README.md の 8 つから固定を除いた 7 つ（すべて enabled: true, custom: false）
};
```

初期 7 つ: いちばん心に残ったのは、／読み終えて、見方が変わったのは、／この本を渡したいのは、／似ていると思ったのは、／作者がいちばん伝えたかったのは、たぶん／自分のことのように感じたのは、／少し引っかかったのは、。ID は固定文字列（`starter-default-1`〜`7`）。固定の「ひとことで言うと、」は `items` に含めない（オフにできない）。

## 受け入れ条件

- [ ] 新しいフィールドをすべて持つ記録を `add` → 新しい repository（同じ storage）の `getAll` で読むと、すべて同じ値で戻る（再起動後も保たれる）。
- [ ] `update` で各フィールド（ひとこと・書き出し・引用・メモ・自由な文章・お気に入り・本棚）を変更でき、`id` / `createdAt` / `spineColor` は保たれる。
- [ ] `StarterEntry.starter` は保存された文のまま。`StarterSettings` の項目の文を変更・削除・オフにしても、保存済みの記録の `starters[].starter` は変わらない。
- [ ] 新規記録の `spineColor` は、既存記録の件数 `n` に対し `spine-${(n % 10) + 1}`（1 件目 `spine-1` … 11 件目 `spine-1`）。`NewRecordInput` で指定できない。
- [ ] 本棚: 作成（末尾に追加、名前は前後の空白を除く、空・空白だけは `ValidationError`）、名前変更（同様の検証、存在しない ID は `null`）、並べ替え（ID の並びを渡すと `order` が 0..n-1 に振り直される。一覧に無い ID は無視、渡されなかった本棚は末尾に元の順で残る）、削除。一覧は `order` 順。
- [ ] 本棚を削除すると、その ID が全記録の `shelfIds` から外れ、記録の件数は変わらない。ほかの本棚 ID は残る。
- [ ] 「すべての本」は本棚として保存されない（`getAll` の結果に出ない）。
- [ ] `pickStarters(settings, random)`: `enabled` かつ `items[].enabled` のものだけから、重複なく `count` 個を返す。オンが `count` 未満ならあるだけ。オン 0 件・機能オフなら空配列。固定の書き出しは含まない。`random` は注入でき（既定 `Math.random`）、同じ値列なら同じ結果。
- [ ] `swapStarters(settings, current, random)`: 現在出ている ID（`current`）以外のオンの項目から `count` 個を選ぶ。足りなければ残りのオンの項目（`current` 内）を補って `count` 個までにする（重複なし）。オンの総数が `count` 以下なら `current` と同じ集合を返す。
- [ ] `getRatingWord(rating)`: `5.0`→「最高」、`4.9`/`4.0`→「よかった」、`3.9`/`3.0`→「まあまあ」、`2.9`以下（`1.0` 含む）→「あんまり」。`null` は `null`。浮動小数点（`4.1`, `2.9` など）で境界を誤らない（`Math.round(x*10)` の整数で比較）。
- [ ] 書き出し設定の保存・読み込み: 保存して `load` すると同じ値。未保存・壊れた JSON・不正な項目は既定値（項目ごとに検証し、不正な `items` 要素は捨てる。`count` が 2/3/5 以外は 3）。
- [ ] バックアップ: `buildBackup(records, shelves, starterSettings, settings, exportedAt)` を `parseBackup` で読むと、記録（新フィールドすべて）・本棚・書き出し設定が元に戻る。`photoUri` は `null` で書き出す（既存どおり）。`BACKUP_VERSION` は 2。
- [ ] `parseBackup`: `version: 1`、新フィールドが欠けた記録、不正な型の新フィールド、`shelfIds` が存在しない本棚を指す場合は `invalid`。落ちない。`not_json` / `not_backup` / `too_new` は変わらない。ID 重複（記録・本棚）は `invalid`。
- [ ] `applyImport`: `replace` では記録と本棚が置き換わる。`merge` では記録は既存どおり、本棚は同じ ID はファイルの内容、それ以外は両方残す（`order` は再採番）。`includeSettings` のとき書き出し設定も保存する。失敗時は記録・本棚・設定を元に戻して reject。
- [ ] `deleteAllRecords`（すべての記録を削除）は記録と写真を消し、**本棚と書き出し設定は残す**。
- [ ] 保存済みの古い形式の記録（`review` あり、新フィールドなし）は読めなくてよいが、`getAll` は例外を投げず、読めない記録は一覧から除かれる（既存の `parseRecords` の挙動）。
- [ ] CSV: 見出し「感想」が「ひとこと」になり、`oneLiner` が出る。それ以外の列順は変えない。
- [ ] 既存画面（記録フォーム・詳細）から感想欄・感想表示がなくなり、そのほかは今までどおり動く。
- [ ] `pnpm check` が通り、全体・差分カバレッジの閾値を満たす。

## 画面・振る舞い

画面の新設はない。変更は既存画面からの `review` の除去だけ。

- 記録フォーム: 感想の入力欄を削除。保存する `NewRecordInput` には、新規なら新フィールドの空の値（`oneLiner: null`、配列は `[]`、`favorite: false`、`shelfIds: []`）を入れ、**編集のときは既存記録の値をそのまま引き継ぐ**（フォームが知らないフィールドを消さない）。
- 記録詳細・情報欄（`RecordInfoSection`）: 感想の表示を削除。
- エラー: 保存データが壊れている・古い形式のときは、空（読めた分だけ）として扱い、例外を投げない。保存失敗（`setItem` の reject）は既存どおり呼び出し側に伝える。

## 設計

### 追加・変更するファイル
- `types/record.ts`（上記）、`types/shelf.ts`、`types/starter.ts`（新規）。
- `types/backup.ts`: `BackupFile` に `shelves: Shelf[]` と `starterSettings: StarterSettings | null` を追加。`BACKUP_VERSION = 2`。
- `lib/recordGuard.ts`: 新フィールドの検証（`toMediaRecord`）。エントリごとの型ガードは `lib/recordEntries.ts`（新規）に切り出す。`isValidRecordInput` は変更なし。
- `lib/recordRepository.ts`: `add` で `spineColor` を割り当て（`spineColorForIndex(n)` を `lib/spineColor.ts` に）。`removeShelfId(shelfId): Promise<void>` を追加（1 回の `setItem`）。`importRecords` のマージ時の写真の扱いは今のまま。
- `lib/recordMigration.ts`: `CURRENT_SCHEMA_VERSION = 3`、`MIGRATIONS` は変更しない（古い形式は読み飛ばし）。
- `lib/shelfRepository.ts`（新規）: `createShelfRepository(storage, { generateId })` → `getAll / create / rename / reorder / delete / importShelves(shelves, mode)`。キーは `shelves.v1`、`records` と同じく書き込みを直列化。`lib/shelfGuard.ts` に `parseShelves`。
- `lib/deleteShelf.ts`（新規）: `deleteShelf({ shelfRepository, recordRepository }, id)`。先に `recordRepository.removeShelfId(id)`、次に `shelfRepository.delete(id)`（途中で失敗しても再実行で整合する順）。
- `lib/starterSettingsStore.ts`（新規）: `createStarterSettingsStore(storage)` → `load / save`。キーは `starterSettings.v1`。`parseStarterSettings` も export。
- `lib/starterPicker.ts`（新規）: `pickStarters` / `swapStarters`。`lib/starterDefaults.ts`: 初期値。
- `lib/ratingWord.ts`（新規）: `getRatingWord`。
- `lib/backup.ts` / `lib/importBackup.ts`: 上記の受け入れ条件どおりに拡張。`applyImport` に `shelfRepository` と `starterSettingsStore` を渡す（呼び出し元の `DataScreen` / hooks の更新を含む）。
- `lib/deleteAllRecords.ts`: 変更なし（本棚・設定は触らない。テストで確認する）。
- `lib/csv.ts`: 「感想」→「ひとこと」。
- `lib/recordForm.ts` / `components/RecordForm.tsx` / `components/RecordInfoSection.tsx` / `screens/RecordDetailScreen.tsx`: `review` の除去と、編集時の新フィールドの引き継ぎ。`testUtils.ts` の `makeRecord` に新フィールドの既定値。
- hooks: `useShelfRepository.tsx`、`useStarterSettings.tsx`（既存の `useRecordRepository` / `useSettings` と同じ形の Provider）。画面からはまだ使わないが、`DataScreen` の読み込み・書き出しで必要になるため、この Issue で用意する。Provider は `app/_layout.tsx` と `testProviders.tsx` に足す。

### 状態管理
React の state / context のみ。新しいライブラリなし。

### 保存キー
`records.v1`（既存）/ `shelves.v1` / `starterSettings.v1` / `appSettings.v1`（既存）。

## テスト方針

| 受け入れ条件 | テスト |
|---|---|
| 保存・読み込み、update、spineColor | `lib/__tests__/recordRepository.test.ts`（メモリ storage で、別 repository インスタンスで読み直す） |
| 書き出しの文が変わらない | `recordRepository.test.ts`（記録を保存 → 設定を変更 → 記録の `starter` が同じ）+ `starterSettingsStore.test.ts` |
| 本棚の CRUD・並べ替え・検証 | `lib/__tests__/shelfRepository.test.ts` |
| 本棚削除で `shelfIds` から外れる | `lib/__tests__/deleteShelf.test.ts` |
| pickStarters / swapStarters | `lib/__tests__/starterPicker.test.ts`（固定の random 列、オン不足、0 件、機能オフ、固定を含まない） |
| 評価の言葉 | `lib/__tests__/ratingWord.test.ts`（2.9 / 3.0 / 3.9 / 4.0 / 4.9 / 5.0、1.0、null、4.1） |
| 書き出し設定の保存・不正値 | `lib/__tests__/starterSettingsStore.test.ts` |
| ガード | `lib/__tests__/recordGuard.test.ts`（新フィールドの正常・不正） |
| バックアップのラウンドトリップ・不正 | `lib/__tests__/backup.test.ts` |
| 読み込みの merge / replace / ロールバック | `lib/__tests__/importBackup.test.ts` |
| 全削除で本棚・設定が残る | `lib/__tests__/deleteAllRecords.test.ts` |
| CSV | `lib/__tests__/csv.test.ts` |
| 画面から感想が消える・編集で引き継ぐ | `components/__tests__/RecordForm.test.tsx`、`screens/__tests__/RecordDetailScreen.test.tsx`、`lib/__tests__/recordForm.test.ts` |

既存テストの `review` を使う箇所は、感想の削除に合わせて更新する（テストの削除・skip はしない。感想欄の確認テストは「出ない」ことの確認に置き換える）。

## 判断ログ

1. **感想（`review`）**: 削除する。却下: 残して `freeTexts` と併存させる（二重管理になり、画面の作り直しで迷う）。理由: 未リリースで移行不要。UI からの入力欄・表示は同時に外す。
2. **自由に書いた文章**: 複数（配列 `freeTexts`）。却下: 1 つだけ。理由: 書き出し・引用・メモと同じ「日時付きの積み上げ」に揃えられ、1 つに絞るより後で緩める手戻りがない。1 つだけ使う画面でも、配列の先頭を使えばよい。
3. **ID を持つエントリ**: 書き出し・引用・メモ・自由な文章は各々 `id` を持つ。理由: 後続の画面で個別に編集・削除するため（配列の添字は並び替えや削除で不安定）。
4. **書き出し設定の保存場所**: `AppSettings` に入れず別キー・別ストア（`starterSettings.v1`）。却下: `AppSettings` に統合。理由: 項目が配列で大きく、既存の設定（ヒーロー・ステータス）と検証・既定値の扱いが違う。バックアップ上は別フィールドにして、`includeSettings` で一緒に読み込む。
5. **固定の書き出し**: `items` に含めず定数 `STARTER_FIXED`。理由: オフ・削除できず、`pickStarters` の対象外という条件をデータ構造で保証する。固定欄の回答は `oneLiner` に保存する（`starters` には入れない）。
6. **本棚の保存**: 記録とは別キーの `shelves.v1`。記録側は `shelfIds` のみ持つ。削除時の整合は `deleteShelf`（記録 → 本棚の順）で取る。却下: 記録と本棚を 1 つのキーにまとめる（既存の記録の保存形式を壊し、全削除・読み込みの扱いが複雑になる）。2 キーの書き込みは原子的ではないが、記録の更新が先なら失敗時も「存在しない本棚 ID が残る」状態にはならない。なお読み込み時は存在しない `shelfIds` を無視して表示する想定。
7. **背表紙の色の割り当て**: 既存件数 `n` から `spine-(n%10+1)`。却下: 使用中でない色を探す・ランダム。理由: 「順に」の指定どおりで、テストしやすい。削除で重複・欠番が出ても問題にしない。入力で指定できなくする（色を選ぶ画面は仕様外）。
8. **書影・写真**: `coverUrl`・`photoUri` は今どおり保存する（Issue の方針）。画面での扱いは後続。
9. **バックアップ版**: `BACKUP_VERSION` を 2 に上げ、1 は `invalid`。理由: 未リリースで旧ファイルの互換は不要。`not_backup`/`too_new` と区別するための新理由は足さない（画面の文言変更を避ける）。
10. **merge のときの書き出し設定**: `includeSettings` が真なら上書き（既存の `AppSettings` と同じ扱い）。本棚は記録に合わせて mode に従う（merge は ID で統合）。
11. **評価の言葉**: 小数の誤差を避けるため `Math.round(rating * 10)` の整数（50 / 40〜49 / 30〜39 / それ以下）で判定。範囲外（1 未満・5 超）は記録として保存できないが、関数は「あんまり」/「最高」に寄せて返す。
12. **`swapStarters` の足りないとき**: オンの総数が `count` を超えない場合は新しいものが無いので、現在のものを返す。Issue は「今出ているもの以外から入れ替えられる」としか書いていないため、不足分は現在のものから補う案を採用（却下: 不足分は返さず `count` 未満にする。画面側で枚数が減って見えるため）。
13. **既存画面の変更範囲**: 型を通すための最小限に限る。編集時にフォームが知らないフィールドを落とさないよう、`RecordForm` は既存記録の新フィールドをそのまま `NewRecordInput` に載せる。
14. **見た目の確認**: 画面を新設しないため撮影は不要。感想欄が出ないことは Jest（`queryByText`）で確認する。
