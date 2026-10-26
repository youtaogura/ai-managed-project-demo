# Issue #36 【部品】書影カード（CoverCard）と文字の表紙

## 背景・目的

デザインの中心は「書影が主役で、画像がなくても美しい」こと。一覧（#39）・詳細・検索結果・フォームで使えるよう、任意の幅で描ける書影部品（`Cover`、文字の表紙を含む）と、タップできる一覧用カード（`CoverCard`）を作る。デザイン仕様は `docs/design-system/components/CoverCard/README.md` と `docs/design-system/README.md`（「文字の表紙」）。

### 現状（コード上の事実）
- `src/components/Thumbnail.tsx`: 写真 → 書影 URL の順に候補を試し、失敗で次へ。どちらもなければ絵文字のプレースホルダー。`RecordListItem` `RecordDetailScreen` `PhotoField` が使用。色は互換層 `theme.ts`。
- `src/lib/thumbnail.ts`: `getThumbnailCandidates`（写真 → 書影の候補配列）、`PLACEHOLDER_LABELS`。
- `src/design/tokens.ts`: `colors.cover<Kind>Bg/Ink`、`typography.coverTitleHero/Card/Thumb`（Shippori Mincho 800）、`radius.thumb/card`、`size.heroCardWidth`、`space`。`src/design/fonts.ts` の `resolveFontFamily`、`AppText`（#35）。
- `src/lib/statusLabel.ts` の `getStatusLabel`（読んでる／見てる等）、`src/lib/format.ts` の `formatRating`。
- アニメーション・画像ライブラリは未導入（`expo-image` なし、`react-native` の `Image` / `Animated` を使う）。

## スコープ

### やること
1. `Cover`（新規・再利用の核）: 幅だけ受け取り、高さ = 幅 × 3/2 で書影を描く。写真 → 書影 URL → 文字の表紙の優先順。読み込み失敗で次の候補へ、最後は文字の表紙。`resizeMode="cover"`（中央で切り抜き）。角丸は呼び出し側指定（`radius`）。
2. 文字の表紙（`TextCover`、`Cover` 内部で使う。単体でも export）: 種別ごとの `cover-<kind>-bg` 地、`cover-<kind>-ink` の文字、タイトルは明朝体、作者・監督を小さく添える。
3. `CoverCard`（新規）: `variant: 'hero' | 'thumb'`。タップ（`onPress`）で押した瞬間に scale 0.97 / 100ms。ステータスが「読んでる／見てる」（`in_progress`）のときだけ左上に `accent` の点（読み上げラベル付き）。`hero` は下に星の数字と終了日。
4. 既存 `Thumbnail` は **置き換えず維持**（中身は変えない）。`lib/thumbnail.ts` の `getThumbnailCandidates` は `Cover` から再利用する。

### やらないこと
- 一覧・詳細・検索画面への組み込み（#39 以降）。`RecordListItem` `RecordDetailScreen` は変更しない。
- 一覧から詳細への拡大の動き、`RatingStars` 部品（別 Issue。hero の評価は数字テキストのみ）
- 影（`shadow-cover`）は付けない（一覧では詰めて並べる決まり。詳細画面側の Issue で扱う）
- 新しい色・文字スタイル・ライブラリの追加

## 受け入れ条件

- [ ] 写真あり: 写真 URI の `Image` が表示される。書影あり（写真なし）: 書影 URL の `Image`。写真・書影とも無し: 文字の表紙（`Image` なし）
- [ ] 写真の読み込みに失敗すると書影 URL に、書影も失敗する（または写真なしで書影のみ失敗）と文字の表紙に切り替わる
- [ ] 文字の表紙にタイトルが表示される。作者があれば小さく表示され、`null` なら出ない
- [ ] 文字の表紙の地・文字色は種別ごとに `colors.cover<Kind>Bg` / `Ink`（5 種別すべて）。タイトルのフォントは `ShipporiMincho_800ExtraBold`、サイズは `hero`/`card`/`thumb` に応じて `coverTitleHero/Card/Thumb`
- [ ] `Cover` の高さは幅の 1.5 倍（任意の幅、例 56・150・196）。画像は `resizeMode="cover"`
- [ ] `Cover` は、画像のとき `accessibilityLabel`（タイトル）の画像として扱われ、文字の表紙のときは中の `Text` が読み上げ対象（二重読み上げにしない）
- [ ] `CoverCard` は `accessibilityRole="button"`、`accessibilityLabel` にタイトルを含み、タップで `onPress(record)` が呼ばれる
- [ ] `status === 'in_progress'` の記録だけに点が出る。読み上げラベルは本・漫画「読んでる」、映画・ドラマ・アニメ「見てる」（`getStatusLabel` と同じ）。planned / dropped / completed では出ない。点は左上、色 `colors.accent`
- [ ] `hero`: 幅 `size.heroCardWidth`（150）、角丸 `radius.card`、下に星の数字（`★ 4.2` 形式、評価あり）と終了日（`endDate`）を出す。評価が `null` なら星の数字を出さず、`endDate` が `null` なら終了日を出さない。両方なければ下の領域自体を出さない
- [ ] `thumb`: 幅は props（`width`）、角丸 `radius.thumb`、下に何も出さない（評価・終了日があっても出ない）
- [ ] 画像の上にテキストの要素が重ならない（画像表示時、カード内の `Text` は画像の兄弟として画像の下にあり、点以外の重なり要素がない）。文字の表紙のみ文字が地の上に乗る
- [ ] 押した瞬間に scale 0.97 になる（`fireEvent` の pressIn 後に transform が `0.97`）、離すと 1 に戻る
- [ ] `pnpm check` が通る（カバレッジ閾値維持、新規ファイルの変更行 80% 以上）

## 画面・振る舞い

### 優先順と失敗時
候補は `getThumbnailCandidates(record)`（写真 → 書影）。`failedCount` を state に持ち、`onError` で +1。候補を使い切ったら文字の表紙。`key={uri}` で候補切替時に再マウント（`Thumbnail` と同じ方式）。記録が差し替わって候補が変わったら失敗カウントはリセットされる必要があるので、`key` を候補列から作るか `useEffect` でなく state のキー比較でリセットする（実装担当が判断）。

### 文字の表紙
- 地: `cover<Kind>Bg`、文字: `cover<Kind>Ink`。内側余白は幅に比例（幅 × 約 0.08、最小 `space['1']`）。
- タイトル: 明朝体。サイズは幅から選ぶ — 幅 ≥ 150 は `coverTitleHero`、≥ 80 は `coverTitleCard`、それ未満は `coverTitleThumb`（閾値は定数として `lib/` に出してテスト）。`numberOfLines` は大きさに応じて上限（hero 6 / card 5 / thumb 4）、`ellipsizeMode="tail"`。長いタイトルでも枠からはみ出さない（`overflow: 'hidden'`）。
- 作者: `creator` があればタイトルの下に 1 行、`typography.micro`（`AppText`）、不透明度 0.7 程度、thumb サイズでは出さない（小さすぎて読めないため）。
- `Cover` の幅と `CoverCard` の variant は別概念。`Cover` は `width` と `radius` を受け取り、タイトルサイズは幅で決まる。

### CoverCard
- 縦並び: `Cover`（幅 = カード幅）→（hero のみ）下の情報行（星の数字 `★ 4.2`＝`typography.value`、終了日＝`typography.label`・`textSecondary`、間隔 `space['1']`）。
- 点: 左上から `space['2']` の位置に直径 8px 程度の円（`colors.accent`）、`accessible` + `accessibilityLabel`。画像の上に重なる唯一の要素。
- Pressable 全体が 1 つのボタン。`accessibilityLabel` は `タイトル` に加え、hero では評価・終了日があれば続けて含めてよい（最低限タイトルを含む）。点のラベルは Pressable のラベルとは別にテストで見つけられるよう `accessibilityLabel="読んでる"` を点の View に付ける（子の `accessible` を有効にするため Pressable は `accessible={false}` ではなくラベル付きの親とする。読み上げが二重になる場合は、親の label に状態を含めて点を `importantForAccessibility="no"` にする案も可 — 実装担当が選び判断ログへ追記）。
- 押下: `Animated.Value`（`react-native` 標準）で `onPressIn` → `timing(0.97, 100ms)`、`onPressOut` → `timing(1, 100ms)`。`useNativeDriver: false`（Jest ではネイティブドライバだと値・props が進まず scale の実値を検証できないため。100ms の scale のみで JS ドライバでも負荷は小さい）。Jest ではタイマーを進めるか、`transform` の初期値・呼び出しを検証できる形にする。
- 最小タップサイズ: thumb は幅 4 列（約 80px 超）で `touchMin`（44）以上を満たす。幅が極端に狭い場合の保証は呼び出し側（一覧）の責務。

### エラー時
画像が全部失敗しても例外を出さず文字の表紙。`title` が空文字でも描画できる（空のまま）。

## 設計

### 追加・変更ファイル
| ファイル | 内容 |
|---|---|
| `app/src/components/Cover.tsx` | `Cover`（`record: Pick<MediaRecord,'kind'|'title'|'creator'|'photoUri'|'coverUrl'>`, `width: number`, `radius?: number`）。画像 / 文字の表紙の切替。 |
| `app/src/components/TextCover.tsx` | 文字の表紙（`kind` `title` `creator` `width`）。 |
| `app/src/components/CoverCard.tsx` | `CoverCard`（`record: MediaRecord`, `variant`, `width?`, `onPress`）。`hero` は幅 `size.heroCardWidth` 固定、`thumb` は `width` 必須相当（既定値なし。props 型を判別共用体にして hero では width を受け取らない）。 |
| `app/src/lib/cover.ts` | 純粋ロジック: `COVER_ASPECT_RATIO = 2/3`、`getCoverColors(kind)`、`getCoverTitleVariant(width)`、`coverHeight(width)`。 |
| `app/src/components/__tests__/Cover.test.tsx` `TextCover.test.tsx` `CoverCard.test.tsx`、`app/src/lib/__tests__/cover.test.ts` | テスト |

### データ構造・状態
- 新しい型は追加しない（`MediaRecord` を使う）。`getCoverColors(kind): { bg: string; ink: string }` は `Record<MediaKind, …>` で `tokens.colors` から引く（値のリテラルを書かない）。
- 状態は `Cover` の `failedCount`（画像失敗数）と `CoverCard` の `Animated.Value` のみ。

### 依存
新規ライブラリなし（`react-native` の `Image` `Animated` `Pressable`）。

### 代替案
- `expo-image`（キャッシュ・フェード付き）→ 依存追加が増えるため却下。
- `react-native-reanimated` で押下アニメーション → 追加依存、100ms のスケールだけには過剰。

## テスト方針

| 受け入れ条件 | テスト |
|---|---|
| 3 通りの表示、失敗時の切替 | `Cover.test.tsx`（`Image` の `onError` を `fireEvent` で発火。写真→書影→文字の表紙の順） |
| タイトル・作者の表示、種別ごとの地色・文字色、フォント・サイズ | `TextCover.test.tsx`（5 種別を `it.each`、スタイルを `StyleSheet.flatten` で検証） |
| 高さ = 幅 × 1.5、`resizeMode` | `Cover.test.tsx` / `cover.test.ts` |
| ボタン・ラベル・`onPress` | `CoverCard.test.tsx` |
| 点の出し分けとラベル、位置 | `CoverCard.test.tsx`（`it.each` で 4 ステータス × 種別） |
| hero の星の数字・終了日・欠損時 / thumb は出さない | `CoverCard.test.tsx` |
| 画像に文字が重ならない | `CoverCard.test.tsx`（画像表示時、`Text` が画像と同じ絶対配置の親にない、重ねる要素は点のみ、を構造で確認） |
| 押下で scale 0.97 | `CoverCard.test.tsx`（`fireEvent(pressIn)` → `Animated` を `jest.useFakeTimers` + `act(advanceTimersByTime(100))` で進めて transform を確認） |
| ロジック | `cover.test.ts`（閾値境界 79/80/149/150） |

「見た目の確認」: `orchestrator/tools/ui-preview` はこのリポジトリに存在しないため撮影できない。PR 本文にその旨を書き、「デザインどおり」とは書かない。構成と出し分けは Jest で確認する。

## 判断ログ

1. **`Cover` と `CoverCard` を分けた**（選択）／1 つの `CoverCard` に統合（却下）。Issue が「任意の幅で描ける書影を部品として切り出す」を求めており、詳細（196×294）・検索結果（小）・フォームで押下動作やステータス点が不要なため。
2. **既存 `Thumbnail` は置き換えず維持、`lib/thumbnail.ts` の `getThumbnailCandidates` を再利用**（選択）／`Thumbnail` を削除して `Cover` に統一（却下）。組み込みは #39 以降で、今回消すと `RecordListItem` `RecordDetailScreen` `PhotoField` の変更と見た目の変更が必要になりスコープ外。不要になった時点で #39 以降で削除を検討する（提案）。
3. **hero の評価は数字テキスト `★ 4.2`（`formatRating` は未評価を「未評価」と返すため使わず、評価ありのときだけ `★ ${rating.toFixed(1)}` を出す）**。デザイン文言「星の数字と終了日」に合わせ、`RatingStars` は未実装のため使わない。Issue は「評価がないときはその部分を出さない」ので「未評価」も出さない。
4. **点を出すのは `in_progress` のみ**。ラベルは `getStatusLabel` を再利用（本・漫画「読んでる」、他「見てる」）。
5. **押下アニメは標準 `Animated`**。依存を増やさない（代替案参照）。
6. **文字の表紙のタイトルサイズは幅で決める**（hero ≥ 150 / card ≥ 80 / thumb 未満）。デザインに「大きさに応じて hero/card/thumb」とあるが境界が書かれていないため。`CoverCard` の hero(150px) は `coverTitleHero` の 46px では大きすぎる可能性があるが、トークン指定どおり（詳細画面の 196px 幅は hero 相当）に従う。**提案**: 150px の `hero` カードにどの文字スタイルが合うかは撮影で確認できない。実機で大きすぎる場合は、150px 幅に `coverTitleCard` を使う案を人間が判断してほしい（`hero` 閾値を 150 → 180 に変えるだけで切替可能なよう定数化しておく）。
7. **thumb では作者を出さない**。9px のタイトルしか許されない小ささで、作者を載せると読めずノイズになるため。
8. **影は付けない**（デザイン README の決まり）。
