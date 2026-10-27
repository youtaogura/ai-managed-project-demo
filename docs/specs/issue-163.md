# Issue #163: 本が少ないときも、空の棚の段を並べる

## 背景・目的

本棚の画面は、本が少ないと棚板が 1 段だけで、その下が空白になり寂しい。本が少なくても棚板の段を並べて、「まだまだ増やしていきたい」と思える見た目にする。

## スコープ

やること
- 本棚の画面（`RecordsScreen`）の `Shelf` に、最低 3 段の棚板を表示する。本のない段は棚板だけを置く
- 3 段以上ある（本で 3 段以上埋まっている）とき、一番下の段がいっぱいなら、空の棚を 1 段足す
- 本棚・ステータスで絞り込んで本が減ったときも同じルール（`visible` をそのまま `Shelf` に渡すため自然に満たされる）
- スクリーンショット: `pnpm shots -- shelf shelf-empty` に「本が 1 冊」のシーンを足して撮り、PR に書く

やらないこと
- 振り返り「今年のお気に入り」の棚（`ReviewScreen`）への適用
- 読み終わった画面（`FinishedScreen`）の 1 冊表示への適用
- 空いた場所への花・オブジェなどの飾り（別 Issue。ブランド原則に関わる）
- 新しい色・部品・トークンの追加

## 受け入れ条件

- [ ] `layoutShelfRows` 相当のロジックで、段の数が次のとおりになる（Jest）
  - [ ] 本 0 冊 → 3 段（`Shelf` 単体では。画面側の 0 冊表示は下記）
  - [ ] 本 1 冊 → 3 段（本が 1 段目、2・3 段目は空）
  - [ ] 本が 2 段にわたる → 3 段
  - [ ] 本がちょうど 3 段に収まり、3 段目がいっぱい → 4 段（空の段を 1 段追加）
  - [ ] 3 段以上で、一番下の段に余裕がある → 本の段数のまま（追加しない）
  - [ ] 4 段以上で一番下がいっぱい → 本の段数 + 1
- [ ] 空の段は `shelf-board`（棚板）だけが描画され、背表紙（button）は出ない
- [ ] `Shelf` はデフォルトでは従来どおり（空の段を足さない）。`ReviewScreen` のお気に入り棚、`FinishedScreen` の 1 冊表示は段数が変わらない
- [ ] `RecordsScreen` で本が 1 冊のとき、棚板が 3 枚表示される。ステータスで絞り込んで 1 冊になっても 3 枚
- [ ] `RecordsScreen` で、本棚に本が 0 冊 / 絞り込みで 0 冊のときは、従来どおり空の案内文を表示し、棚板の段は出さない
- [ ] 既存の `Shelf` / `RecordsScreen` / `ReviewScreen` のテストが通る

## 画面・振る舞い

- 本棚タブの一覧: 背表紙を下揃えで並べた段の下に、棚板が続く。本がない段は高さを持たない棚板だけ（本の段と同じ余白 `SHELF_ROW_GAP` を空けて並べる）。空の段の高さは、背表紙の最大の高さを取らず棚板の高さ + 段間の余白だけにしない点に注意: 本の段と並んだときに棚らしく見えるよう、空の段にも背表紙の最小高さ（`size.spineHeightMin`）分の空間を取る
- 「いっぱい」の定義: 一番下の段の使用幅 + `SPINE_GAP` + `size.spineWidthMin` が `width` を超える（最も細い背表紙ももう置けない）
- 本が 0 冊の場合、画面側は従来の案内文のみ（空の棚を並べない）。Issue は「本が少ないとき」を対象にしており、0 冊は案内文で意図を伝えるため
- エラー時の振る舞い: なし（表示のみの変更）

## 設計

- `app/src/lib/spineLayout.ts`
  - `isShelfRowFull(row, availableWidth, gap = SPINE_GAP): boolean` を追加
  - `MIN_SHELF_ROWS = 3` を export
  - `padShelfRows<T>(rows: T[][], availableWidth): T[][]` を追加。段数が 3 未満なら空配列 `[]` で 3 段まで埋め、3 段以上で最後の段がいっぱいなら `[]` を 1 段足す（`rows.length >= 3` かつ最後の段が full のとき。本 0 冊は `rows` が空なので 3 段になる）
- `app/src/components/Shelf.tsx`
  - prop `fillEmptyRows?: boolean`（デフォルト `false`）を追加。`true` のとき `padShelfRows` を通す
  - 空の段: `key` は `empty-${i}`、`minHeight: size.spineHeightMin` の `books` ビューと棚板を描画（背表紙なし）
- `app/src/screens/RecordsScreen.tsx`: `visible.length > 0` の `Shelf` に `fillEmptyRows` を渡す
- `app/scripts/screenshots/scenes.cjs` / `seed.cjs`: `shelf-one`（本 1 冊）のシーンを追加。既存シーンは変えない
- 新規ライブラリなし。`docs/design-system/` は人間のみ変更のため触らない（「棚 1 段の幅に収まる数で折り返す」に空の段の記述が欲しい場合は判断ログの提案を参照）

## テスト方針

| 受け入れ条件 | テスト |
|---|---|
| 段数のルール（0/1/2 段/ちょうど満杯/余裕あり/4 段以上満杯） | `lib/__tests__/spineLayout.test.ts` で `padShelfRows` と `isShelfRowFull` |
| 空の段は棚板のみ | `components/__tests__/Shelf.test.tsx`: `fillEmptyRows` で 1 冊 → 棚板 3 枚・button 1 個 |
| デフォルトは従来どおり | `Shelf.test.tsx`: `fillEmptyRows` なしで棚板 1 枚（既存テスト） |
| RecordsScreen で 1 冊 → 3 枚、絞り込み後も 3 枚、0 冊は案内文のみ | `screens/__tests__/RecordsScreen.test.tsx` |
| ReviewScreen / FinishedScreen は変わらない | 既存テスト（棚板数を確認していなければ `ReviewScreen` に 1 件追加） |

「いっぱい」の境界のテストは、`getSpineSize` で幅を求めて `width` を計算して作る。

## 判断ログ

- **段数の制御は `Shelf` の opt-in prop（`fillEmptyRows`）にした**。却下: デフォルトで常に適用 → お気に入り棚と `FinishedScreen` の 1 冊表示に影響し、Issue の範囲外になる
- **「一番下がいっぱい」の定義は「最小幅の背表紙も置けない」**。Issue に定義がない。却下: 「ちょうど幅いっぱい」→ ほぼ成立せず意味がない。次に置く本の幅は不明なので最小幅を基準にした
- **本 0 冊の画面は案内文のままにした**。却下: 空の棚 3 段 + 案内文 → 案内文の置き場所の設計が増える。必要なら別 Issue
- **空の段の高さは `spineHeightMin` の空間を取る**。棚板だけだと段間が詰まって棚に見えないため。新しいトークンは不要
- **デザインシステムへの提案**: `docs/design-system/README.md`「背表紙と本棚」に「本が少ないときも最低 3 段の棚板を並べ、いっぱいなら 1 段足す。お気に入りの棚は対象外」を追記したい（人間が変更）
