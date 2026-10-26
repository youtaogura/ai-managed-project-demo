# Issue #2 基盤: 記録のデータモデル・端末内保存・タブ構成

## 背景・目的

読んだ本・漫画、見た映画・ドラマ・アニメを記録するアプリを作る。以降の機能（#3 入力、#4 一覧、#5〜#8 書誌取得・写真、#9 分析）が共通で使う
「記録」のデータモデル・端末内保存・画面の骨組みを先に用意する。

## スコープ

### やること
- 記録（`MediaRecord`）の型定義と、型ガードによる検証
- 種別ごとのステータス表示文言を返す関数
- レーティング・日付の検証関数
- 端末内永続化のデータ層（追加・更新・削除・全件取得）。保存先は差し替え可能
- 下部タブ「記録一覧」「分析」（各画面は空状態表示のみ）。Expo Router を導入する

### やらないこと
- 記録の入力画面、一覧の中身、分析の中身
- アカウント、クラウド同期、バックアップ、外部 API 呼び出し
- 写真ファイルそのものの保存処理（#8。本 Issue では `photoUri` の文字列フィールドを持つのみ）

## 受け入れ条件

- [ ] `getStatusLabel(kind, status)` が 5 種別 × 4 ステータス = 20 通りすべてで下表の文言を返す（テストで 20 通りを網羅）
  - 本・漫画（読）: 読みたい / 読んでる / 途中でやめた / 読み終わった
  - 映画・ドラマ・アニメ（見）: 見たい / 見てる / 途中でやめた / 見終わった
- [ ] `isValidRating(value)`: `null` は有効。1.0, 1.5, 3, 5.0 は有効。0.9, 5.1, 3.25, 0, NaN, `"3"`（文字列）, `undefined` は無効
- [ ] `isValidDateRange(start, end)`: 両方あり → `end >= start` のとき有効（同日は有効、`end < start` は無効）。片方のみ・両方 `null` は有効。`YYYY-MM-DD` として実在しない日付（`2024-02-30` など）や形式違いは無効
- [ ] データ層 `RecordRepository` で `add` / `update` / `delete` / `getAll` が動作する。保存先（`KeyValueStorage`）をインメモリのモックに差し替えたテストで確認する
  - `add` は `id`・`createdAt`・`updatedAt` を付与して返す
  - `update` は `updatedAt` を更新し `createdAt` は不変。存在しない id は `null` を返す（例外にしない）
  - `delete` は存在すれば `true`、なければ `false`
  - `add` / `update` は入力が不正（タイトル空、レーティング不正、日付逆転）なら保存せずエラー（`ValidationError`）を投げる
  - 別の Repository インスタンス（同じ storage）から `getAll` すると保存済みの記録が読める（再起動後も残ることの代替確認）
- [ ] 読み込み時に、JSON として壊れたデータ、配列でない値、型が不正な記録、未知のフィールド付きの記録があっても例外を出さない。不正な記録は読み飛ばし、有効な記録だけを返す。未知のフィールドは無視（除去）する。storage の読み出し自体が失敗した場合も空配列を返す
- [ ] アプリを描画すると下部タブに「記録一覧」「分析」が表示され、タブを押すと各画面に切り替わる。各画面は空状態の文言（記録一覧: 「まだ記録がありません」、分析: 「分析できる記録がまだありません」）を表示する

## 画面・振る舞い

- 起動直後は「記録一覧」タブを表示。下部に「記録一覧」「分析」の 2 タブ
- 記録一覧画面: 中央に「まだ記録がありません」と補足「記録を追加するとここに表示されます」
- 分析画面: 中央に「分析できる記録がまだありません」
- 本 Issue では画面はデータ層を呼ばない（空状態固定）。#4 で接続する
- エラー時: 保存データが壊れていても起動は成功し、空または有効分のみ扱う。書き込み失敗は例外を呼び出し側に伝える（UI での通知は #3 以降）

## 設計

### データ構造（`src/types/record.ts`）

```ts
export const MEDIA_KINDS = ['book', 'manga', 'movie', 'drama', 'anime'] as const;
export type MediaKind = (typeof MEDIA_KINDS)[number];
export const RECORD_STATUSES = ['planned', 'in_progress', 'dropped', 'completed'] as const;
export type RecordStatus = (typeof RECORD_STATUSES)[number];

export type MediaRecord = {
  id: string;
  kind: MediaKind;
  title: string;                 // 必須・trim 後 1 文字以上
  creator: string | null;        // 作者・著者・監督など
  publisher: string | null;
  isbn: string | null;
  coverUrl: string | null;       // 書影 URL
  photoUri: string | null;       // 自分で撮った写真（1 枚）
  startDate: string | null;      // YYYY-MM-DD
  endDate: string | null;        // YYYY-MM-DD
  status: RecordStatus;
  review: string | null;         // 感想（複数行）
  rating: number | null;         // 1.0〜5.0、0.1 刻み
  createdAt: string;             // ISO 8601
  updatedAt: string;             // ISO 8601
};
export type NewRecordInput = Omit<MediaRecord, 'id' | 'createdAt' | 'updatedAt'>;
```

任意項目は未入力を `null` で統一（`undefined` は持たない）。

### ファイル

| ファイル | 内容 |
|---|---|
| `src/types/record.ts` | 上記の型・定数 |
| `src/lib/statusLabel.ts` | `getStatusLabel(kind, status)`、`KIND_LABELS`（種別の日本語名: 本/漫画/映画/ドラマ/アニメ） |
| `src/lib/validation.ts` | `isValidRating`、`isValidDateRange`、`isValidRecordInput`（タイトル・レーティング・日付をまとめて検証）。レーティングは `Math.round(v*10)` と比較して小数第 1 位を判定（浮動小数誤差対策） |
| `src/lib/recordGuard.ts` | `isMediaRecord(value: unknown): value is MediaRecord`、`parseRecords(raw: unknown): MediaRecord[]`（未知フィールド除去・不正スキップ） |
| `src/lib/storage.ts` | `KeyValueStorage` インターフェース（`getItem(key): Promise<string \| null>` / `setItem` / `removeItem`）と AsyncStorage 実装 `asyncKeyValueStorage` |
| `src/lib/recordRepository.ts` | `createRecordRepository(storage, options?)`。`options` で `now()` / `generateId()` を差し替え可能（テスト容易化）。保存キー `records.v1`、値は JSON 配列。書き込みは Promise チェーンで直列化し競合（lost update）を防ぐ |
| `src/app/_layout.tsx` | ルート Layout（`Stack` もしくは `Slot`、`StatusBar`） |
| `src/app/(tabs)/_layout.tsx` | `Tabs`（タイトル「記録一覧」「分析」） |
| `src/app/(tabs)/index.tsx` | 記録一覧画面（`RecordsScreen` を描画） |
| `src/app/(tabs)/analytics.tsx` | 分析画面（`AnalyticsScreen` を描画） |
| `src/screens/RecordsScreen.tsx` / `AnalyticsScreen.tsx` | 空状態の中身。`src/components/EmptyState.tsx` を共有 |
| `src/theme.ts` | 色・余白の定数 |
| `app.json` / `package.json` | `scheme`、`expo-router` plugin、`main` を `expo-router/entry` に変更 |
| 削除 | `App.tsx` / `index.ts` / `HomeScreen.tsx` とそのテスト（Expo Router のエントリに置換するため）。画面テストは新画面のテストに置き換え（テスト数が減らないよう、テストケース数は旧より増やす） |

ルート定義ファイルは Expo Router の仕様上 default export が必須。CLAUDE.md の「default export は App.tsx のみ」の例外として判断ログに記載する。ロジックと画面本体は named export。

### 状態管理
本 Issue では React の state すら不要（データ層は純粋な関数 + Promise。画面は未接続）。`createRecordRepository` を `src/lib/` で提供し、#3/#4 で hook（`src/hooks/`）から利用する。

### 追加する依存（`npx expo install` で SDK 互換版を解決）

- `@react-native-async-storage/async-storage` … 端末内保存。記録は数百〜数千件・単純な CRUD・全件取得中心で、AsyncStorage の JSON 保存で足りる。
  - 代替案: `expo-sqlite`（検索・分析で有利だが、スキーマ移行やモックが重くこの基盤段階では過剰）、`expo-file-system`（自前で排他・整合性を管理する必要）。件数増で性能問題が出たら `KeyValueStorage` の差し替えまたは Repository 実装の入替で移行可能。
- `expo-router` … タブ構成。AGENTS.md が Expo Router を指定し、#3 以降で詳細画面・入力画面への遷移が必要になる見込みのため。
  - 代替案: `@react-navigation/bottom-tabs` 直接利用（遷移が増えると再設計になる）。
- Expo Router の必須 / peer 依存（`expo install expo-router` が要求するもの）: `expo-linking`, `expo-constants`, `react-native-screens`, `react-native-safe-area-context`, `react-native-gesture-handler`, `react-native-reanimated`, `react-native-worklets`, `@expo/vector-icons`。実装時に `expo install` / `expo-doctor` が要求するものだけを追加し、不要なものは入れない（要求されたものはこの一覧の範囲に限る）。
- テストで AsyncStorage を使う場合は同パッケージ付属の jest mock（`@react-native-async-storage/async-storage/jest/async-storage-mock`）を使う。Repository のテストは自前のインメモリ storage を使い、AsyncStorage 実装の薄いラッパーのみ mock で 1〜2 ケース確認する。

## テスト方針

| 受け入れ条件 | テスト |
|---|---|
| ステータス文言 20 通り | `src/lib/__tests__/statusLabel.test.ts`（`it.each` で 5×4 を網羅） |
| レーティング検証 | `src/lib/__tests__/validation.test.ts` |
| 日付検証 | 同上 |
| CRUD・ID/日時付与・不正入力拒否・再生成した Repository から読める | `src/lib/__tests__/recordRepository.test.ts`（インメモリ storage、固定 `now` / `generateId`） |
| 壊れたデータ・未知フィールド・読み出し失敗 | `src/lib/__tests__/recordGuard.test.ts` と `recordRepository.test.ts`（壊れた JSON、非配列、不正要素混在、`getItem` が reject） |
| AsyncStorage 実装 | `src/lib/__tests__/storage.test.ts`（jest mock） |
| タブ表示・切替・空状態 | `src/app/__tests__/tabs.test.tsx`（`expo-router/testing-library` の `renderRouter`、タブをタップして画面切替を確認）。`RecordsScreen` / `AnalyticsScreen` / `EmptyState` は単体テストも追加 |

カバレッジ（全体 行・関数・文 80% / 分岐 70%、差分 80%）を満たすため、検証関数・ガードは分岐を網羅する。
`expo-router/testing-library` が使えない場合に備え、jest 設定（人間のみ変更可）は触らずに済む範囲で書く。どうしても jest 設定変更が必要になったら、判断ログに提案として書いて `needs_clarification` ではなく実装側で回避策（画面コンポーネントの単体テスト + Layout の描画テスト）を取る。

## 判断ログ

1. **保存方式: AsyncStorage（JSON 配列を 1 キーに保存）を採用**
   - 却下: `expo-sqlite`（クエリは強力だが、基盤段階ではスキーマ管理・モックのコストが過剰。#9 分析の要件が固まってから Repository の差し替えで移行できる）、`expo-file-system`（排他制御を自前で持つ必要）。
   - `KeyValueStorage` インターフェースと Repository を分離し、移行・テストを容易にする。キーに `v1` を付けスキーマ変更に備える。
2. **ナビゲーション: Expo Router を導入**
   - 理由: AGENTS.md が Expo Router を指定。以降の Issue で入力・詳細画面への遷移が確実に必要。却下: `@react-navigation/bottom-tabs` 直接利用（後で移行コストが発生）。
   - 副作用: エントリが `expo-router/entry` になり `App.tsx` / `index.ts` を削除。ルートファイルは default export 必須のため CLAUDE.md の規約の例外（`src/app/` 配下のルートのみ）。ルートは薄く、本体は `src/screens/` に named export で置く。
3. **ステータスの内部値は種別非依存の 4 値**（`planned` / `in_progress` / `dropped` / `completed`）。表示は `getStatusLabel` のみで切り替える（Issue 指示どおり）。
4. **日付は `YYYY-MM-DD` 文字列で保持**（時刻・タイムゾーンを持たない日記的データのため。`Date` は TZ ずれが出るので却下）。作成・更新日時は ISO 8601 文字列。実在しない日付は無効。
5. **未入力は `null` に統一**（JSON で `undefined` が消えて型ガードが複雑になるのを避ける）。
6. **レーティングは `number`（1.0〜5.0、0.1 刻み）**。`Math.round(v*10)/10 === v` の誤差に注意して `Math.abs(v*10 - Math.round(v*10)) < 1e-9` で判定する。整数 `3` は有効（3.0）。
7. **種別とステータスの組み合わせ制約・開始/終了日とステータスの整合性は課さない**（Issue に記載なし。入力 UI 側 #3 で必要なら扱う）。
8. **ID は `expo-crypto` を使わず、タイムスタンプ + 乱数の文字列を自前生成**（依存を増やさない。単一端末内でのみ一意であればよい）。`generateId` を差し替え可能にしてテストを決定的にする。
9. **読み込み時の不正データは黙って読み飛ばす**（Issue の要件）。読み飛ばした件数のログは出さない（lint で console を避けるため）。不正記録は保存データ上は残し、次回の書き込み時に有効分のみで上書きされる点を許容する（データ消失の可能性はあるが、壊れた記録を扱う手段が現段階でなく、将来バージョンのデータ互換は `v1` キーで分離する）。
10. **空状態の文言は Issue 例の「まだ記録がありません」を記録一覧に採用し、分析は「分析できる記録がまだありません」とした**（文言は推測で決定）。
11. **`CLAUDE.md` / jest 設定の変更は不要と判断**。必要になった場合は人間への提案とする。
