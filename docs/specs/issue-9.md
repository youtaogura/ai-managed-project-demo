# Issue #9 分析画面（月別の完了数・レーティング分布）

## 背景・目的

記録をもとに読書・視聴の傾向を振り返れるよう、分析タブ（現状は空状態の固定表示のみ）に 2 つの指標を表示する。
1. 月別の完了数（直近 12 か月、種別内訳つき棒グラフ）
2. レーティングの分布（1〜5 点台）と平均（全体・種別ごと）

## スコープ

### やること
- 集計の純粋関数（`src/lib/analytics.ts`）。画面から分離してテストする。
- `AnalyticsScreen` で記録を読み込み、2 指標を表示。0 件のときは空状態。
- 画面表示（フォーカス）のたびに再読込（既存の `useRecords` が `useFocusEffect` で実現済み）。

### やらないこと
- 期間切り替え、その他の指標
- グラフライブラリの追加（依存追加なし）

## 受け入れ条件

### 集計関数
- [ ] 月別: 現在月を末尾とする 12 か月分の枠（古い順）を返す。記録がない月は 0 件
- [ ] 13 か月以上前・未来月の終了日は含めない
- [ ] `status === 'completed'` 以外は数えない
- [ ] 終了日が未入力（null）の完了記録は数えず、件数を `undatedCompleted` として返す
- [ ] 月ごとに種別（book/manga/movie/drama/anime）別の件数と合計を持つ
- [ ] 終了日が不正な形式の完了記録は「終了日未入力」と同様に扱う（注記件数に含める）
- [ ] 分布: 1.0〜1.9→1点台 … 4.0〜4.9→4点台、5.0→5点台。rating が null の記録は含めない
- [ ] 平均: 小数第 2 位を四捨五入して小数第 1 位の文字列（例 3.25→"3.3"）。対象 0 件は「—」
- [ ] 種別ごとの平均を出す（評価ありの種別のみ。0 件は「—」）
- [ ] 分布・平均はステータスに関係なく rating がある全記録が対象

### 画面
- [ ] 記録 0 件: 「分析できる記録がまだありません」を表示（既存文言を維持）
- [ ] 記録あり: 「月別の完了数」「レーティングの分布」「平均」セクションが表示される
- [ ] 月ラベル 12 個（例「2026-10」）と各月の件数が表示される
- [ ] 種別内訳が凡例または数値で判別できる
- [ ] 終了日未入力の完了記録があるときだけ「終了日が未入力の記録: N 件」を表示
- [ ] 分布 1〜5 点台の件数、全体平均（例「平均 3.5」）、種別ごとの平均が表示される。評価が 0 件のとき平均は「—」
- [ ] 記録を追加・編集後に分析タブを開くと最新内容が表示される

## 画面・振る舞い

- ヘッダーは Tabs 標準（タイトル「分析」）。本文は `ScrollView`。
- ローディング中は何も表示しない（空状態を一瞬出さない）。
- 読込失敗時は `useRecords` が空配列にするため空状態になる（既存挙動）。
- セクション 1「月別の完了数」: 12 本の縦棒グラフ。棒は種別ごとの積み上げ（色分け）、棒の上に合計、下に月ラベル（`YYYY-MM`）。凡例に種別名と色。件数 0 の棒は高さ 0（数値「0」は表示）。最大値に対する比率で高さを決める（最大 0 のときは全て 0）。
- セクション 2「レーティングの分布」: 1〜5 点台の横棒（件数つき）。「平均 3.5（N 件）」と、種別ごとの平均を行表示。
- 完了記録が 1 件もなく評価もある場合: 月別は全 0 で表示、分布は表示。評価も完了も 0 でも記録があれば両セクションを表示（平均は「—」）。

## 設計

### 追加・変更ファイル
1. `app/src/lib/analytics.ts`（新規・純粋関数）
   ```ts
   export type MonthlyCompletion = { month: string; total: number; byKind: Record<MediaKind, number> };
   export type MonthlyCompletionResult = { months: MonthlyCompletion[]; undatedCompleted: number };
   export function aggregateMonthlyCompletions(records: MediaRecord[], now: Date): MonthlyCompletionResult;

   export type RatingBucket = 1 | 2 | 3 | 4 | 5;
   export type RatingSummary = {
     distribution: Record<RatingBucket, number>;
     count: number;
     average: number | null;
     byKind: Partial<Record<MediaKind, { count: number; average: number }>>;
   };
   export function summarizeRatings(records: MediaRecord[]): RatingSummary;
   export function formatAverage(average: number | null): string; // "3.3" / "—"
   ```
   - 月キーは `endDate` 先頭 7 文字（`YYYY-MM`）を正規表現 `^\d{4}-\d{2}-\d{2}` で検証して使う。`now` はローカル時刻の年月。タイムゾーン変換はしない（日付文字列をそのまま扱う）。
   - バケット: `Math.min(5, Math.floor(rating))`。範囲外（<1）は防御的に無視。
   - 平均は評価の単純平均を `Math.round(avg*10)/10` ではなく `toFixed(1)` の浮動小数誤差を避けるため、合計を 10 倍した整数で扱い（評価は 0.1 刻み想定）`Math.round(sum*10/count)/10` を使う。
2. `app/src/components/MonthlyBarChart.tsx`（新規）: View による積み上げ棒グラフ。props: `months`。
3. `app/src/components/RatingDistribution.tsx`（新規）: 横棒 5 本。props: `distribution`。
4. `app/src/screens/AnalyticsScreen.tsx`: `useRecords()` で記録取得 → `loading` なら `null`、0 件なら `EmptyState`、それ以外は上記コンポーネントと集計を表示。`now` は `new Date()` を描画時に生成。
5. `app/src/theme.ts`: 種別ごとのグラフ色 `kindColors: Record<MediaKind, string>` を追加。
6. テスト（下記）。

### 状態管理・データ
React state のみ（`useRecords`）。永続化・データ構造の変更なし。

### グラフの実装判断（ライブラリ vs View）
View で自前描画。依存追加なし（`react-native-svg` 等は不要）。

## テスト方針

| 受け入れ条件 | テスト |
|---|---|
| 月別集計の全項目 | `lib/__tests__/analytics.test.ts`（`now` 固定。境界: 12 か月前の月初/13 か月前、未来月、年またぎ、非 completed、null/不正日付） |
| 分布・平均・種別平均 | 同上（1.0/1.9/2.0/5.0 境界、未評価、0 件→「—」、3.25→"3.3"） |
| 空状態 | `screens/__tests__/AnalyticsScreen.test.tsx`（`testProviders` で空リポジトリ） |
| セクション・月ラベル・件数・注記・平均表示 | 同上（`jest.useFakeTimers().setSystemTime` で日付固定） |
| 追加・編集後に最新表示 | `src/__tests__/tabs.test.tsx` に、リポジトリへ記録を追加後に分析タブを開いて反映を確認するケース。既存の「分析できる記録がまだありません」テストは維持 |
| コンポーネント | 画面テスト経由で検証（カバレッジ 80% 以上を確認） |

## 判断ログ

- **グラフ**: View 自前描画を採用。却下: `react-native-svg` / `victory-native` 等（12 本の棒と 5 本の横棒のみで足り、依存追加・ライセンス・expo 互換確認のコストに見合わない）。
- **集計単位**: 「直近 12 か月」は当月を含む 12 か月（例: 2026-10 なら 2025-11〜2026-10）。却下: 当日から 365 日（月単位集計と整合しないため）。
- **月の判定**: 終了日文字列の `YYYY-MM` で判定し、時刻・TZ 変換をしない（`endDate` は日付文字列のため）。
- **種別内訳**: 積み上げ棒＋凡例。却下: 種別ごとの棒の並列（12 か月×5 種別で狭い画面に収まらない）。
- **不正な終了日の完了記録**: 未入力と同じ扱いで注記に含める（無視すると件数が黙って消えるため）。
- **レーティング対象**: ステータスを問わず rating がある全記録（Issue の「入力された記録」の文言どおり）。
- **種別平均**: 評価のある種別のみ行表示（評価 0 件の種別を並べると冗長。0 件は「—」仕様は関数側で担保）。全体が 0 件の場合は「平均 —」を表示。
- **空状態**: 記録が 0 件のときのみ。記録はあるが完了・評価がない場合は各セクションを 0 件／「—」で表示（空状態の文言は既存を維持）。
- **ヘッダー/ScreenContainer**: Tabs のヘッダーがあるため `ScreenContainer` は使わない（#18/#21 の方針）。
- 最新表示は既存 `useRecords` の `useFocusEffect` に任せ、新たな仕組みは追加しない。
