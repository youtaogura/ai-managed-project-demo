# Issue #142 見た目を直す: 読んでる本（#121 の残り）

## 背景・目的

#121 のマージ後も、「読んでる本」（`ReadingScreen`）が `docs/design-system/screens/reading.png` と違う。Issue の 7 項目を、`pnpm shots -- reading note-sheet` で撮って画像と見比べながら直す。画像と部品の README が食い違うときは README を優先し、色・余白・角丸・文字は `design/tokens.ts` のトークンで直す。画像の本・作者・文章（サンプル）の違いは直さない。

## スコープ

### やること（Issue の項目ごと。実装担当は撮影して確かめ、書いてない差も見つけたら直す）

| # | 項目 | 今のコード | 直す方向 |
|---|---|---|---|
| 1 | 戻るボタンが丸い背景つき | `Button variant="icon"`（`surface2` の円） | 背景なしの「‹」だけにする（色は `textSecondary`、画像と同じ。大きさは `sectionTitle` 相当以上でよい）。押せる範囲は 44×44 以上、`accessibilityLabel="戻る"` を維持。**`Button` の `icon` variant は他画面が使うので変えない**。`ReadingScreen` 内で `Pressable` を使う（「編集」と同じ作り） |
| 2 | 背表紙が細く小さい | `Spine` が ID から決めた大きさ（`reading-1` は 28×166 程度）。`hero` は `alignItems: 'flex-end'`・`gap: space[4]` | `Spine` の `dimensions` で、画像どおり幅 40・高さ 150 にする（`Spine` 本体は変えない）。右の文字の塊の下端を背表紙の下端に揃える（今の `flex-end` を維持）。文字の左は背表紙から `space[4]`〜`space[5]` を画像と見比べて決める |
| 3 | タイトルが軽く見える | `AppText variant="bookTitle"`（トークンは明朝 26/34・weight 800） | 800 が実機で効いているか（`fonts.ts` の `resolveFontFamily` が太い明朝に解決しているか）を確認する。効いていなければ `fonts.ts` 側の解決を直す（`regularTextStyle` 等の上書きが `bookTitle` に掛かっていないかも確認）。トークンの値は変えない |
| 4 | 「作者 · 本棚」の本棚が出ない | `names = shelfNames(record, shelves)`、`useShelves` は初回 `[]` で非同期に読む | まず原因を切り分ける: (a) 撮影時に本棚の読み込みより先に撮っている（`waitFor: '読み終えた'` が本棚の反映より早い）、(b) 撮影の seed の `shelfIds: ['shelf-sf']` と `SHELVES` が合っていない、(c) 画面の不具合（`useShelves` の `useFocusEffect` が走らない等）。(c) なら画面を直す。(a) ならシーンの `waitFor` を本棚名（`SF`）にするなど `scenes.cjs` を直す（`scripts/screenshots/` は変更してよい）。**本棚に入っていないときは「作者」だけを出す**（「 · 」だけ・空の本棚名を出さない）。作者もないときは行ごと出さない（今のまま）。この「入っていない」ケースのテストを足す |
| 5 | メモ本文が小さく行間が狭い | `MemoRow` の本文 `body` | 画像（390pt 幅で本文が約 17px・行間が広い）に寄せる。`typography` に合う種類が無いかを確認して使う（`body` のトークン値を確認。大きい種類が無ければ `body` のまま、`lineHeight` もトークン値）。トークンに無い大きさ・行間が必要なら**判断ログに提案として書き**、画面には書かない。行の間隔（`paddingVertical`）は `space` のトークンで画像に寄せる。ページ列の幅 38 は維持 |
| 6 | ページなしの左が「—」 | `MemoRow` が `'—'` | 画像は「p.—」。`docs/design-system/components/MemoRow/README.md` を読み、README が「—」なら README を優先して残し（理由を表に書く）、README が曖昧・「p.—」なら「p.—」に直す。直す場合は `MemoRow.test.tsx` を更新 |
| 7 | 下の「読み終えた」が小さい | `Button`（`rect`: 高さ 48、`radius.button` 12、`button` 15px） | 画像は幅いっぱい（左右 `space[5]`）・高さ約 50・角丸大きめ・文字大きめ。`tokens` で近いのは `button-height`(48)・`radius.card`(12)・`typography.button`(15)。差がトークンの範囲に収まるか確認し、**収まらない差は「残した（理由）」にしてトークン追加を提案**する。`Button` の主ボタンを変えるときは他画面に影響するので、変えずに済む場合は変えない（`ReadingScreen` 内の `style` で足りる範囲） |

### やらないこと
- `tokens.ts` / `docs/design-system/` / CI の変更
- メモ・引用の保存ロジック、NoteSheet の見た目（#121 で対応済み。本 Issue の `note-sheet` 撮影は退行確認だけ）
- `Spine` `Button` `BottomSheet` 本体の変更（変える必要が出たら、他画面への影響を撮って PR に書く。仕様としては「変えない」）

## 受け入れ条件

- [ ] 戻るボタンが背景なしの「‹」で、名前「戻る」で押すと `onBack` が呼ばれる
- [ ] 上の背表紙が幅 40・高さ 150 で、タイトル・作者の塊と下端が揃う
- [ ] タイトルが `bookTitle` トークンの太さ（800）の明朝で表示される（`fonts` の解決を確認）
- [ ] 本棚に入っている本は「作者 · 本棚名」（複数は「、」でつなぐ）、入っていない本は「作者」だけ、作者も本棚もなければ行が出ない
- [ ] 撮影した `reading` で「作者 · SF」が出る（出ない原因が撮影側なら `scenes.cjs` を直す）
- [ ] メモ本文の文字・行間が画像に近い（トークンの範囲で。範囲外は判断ログに提案）
- [ ] ページのないメモの表記が README の方針に沿う（決めた方でテストが通る）
- [ ] 「読み終えた」が画像と同じ配置（幅いっぱい・上に線）で、トークンの範囲で画像に近い大きさ。読んでる状態のときだけ出て、失敗するとエラー文が出てボタンは再び押せる（既存）
- [ ] 既存の `ReadingScreen` `MemoRow` `Quote` のテストが通る（ラベル・ロールを変えない）
- [ ] `pnpm shots -- reading note-sheet` を撮り直し、Issue の 7 項目すべてについて「一致 / 直した / 残した（理由）」の表を PR 本文に書く。共通部品（`MemoRow` `Quote` `Spine` `Button`）を変えた場合は、その画面（`reread` `home` `shelf` ほか）も撮って PR に書く
- [ ] `cd app && pnpm check` が通る

## 画面・振る舞い

構成と状態は #121 のとおり（上に「‹」と「編集」、背表紙＋文字、「メモと引用」と件数、メモ・引用、点線の「＋ メモ・引用を書く」、下に固定の「読み終えた」）。読み込み中・見つからないときの表示も変えない。変えるのは見た目と、本棚名の出し方（項目 4）だけ。

## 設計

変更するファイル（`app/`）:
- `src/screens/ReadingScreen.tsx` — 戻るボタン、`hero`（`Spine` の `dimensions`）、本棚名の組み立て、下のバー
- `src/components/MemoRow.tsx` — 文字・行間・ページなしの表記（項目 5・6）
- `src/design/fonts.ts` — 項目 3 の原因がここにあるときだけ
- `scripts/screenshots/scenes.cjs` — 項目 4 の原因が撮影側のときだけ
- 対応する `__tests__/`（`ReadingScreen.test.tsx` `MemoRow.test.tsx` ほか）

状態管理・データ構造の変更なし。**依存の追加なし。**

## テスト方針

| 受け入れ条件 | テスト |
|---|---|
| 戻る（名前「戻る」で `onBack`） | `ReadingScreen.test.tsx`（既存を維持） |
| 作者・本棚の出し方 3 通り（本棚あり・本棚なし・作者も本棚もなし） | `ReadingScreen.test.tsx`（本棚なしは新規） |
| ページなしの表記 | `MemoRow.test.tsx` |
| 読み終えた（出し分け・失敗） | `ReadingScreen.test.tsx`（既存） |
| 数値（大きさ・色・余白）・背表紙の寸法 | テストしない。撮影と見比べで確認 |

スタイル値だけを確かめるテストは足さない。テストを消す・弱めるときは PR 本文の判断ログに書く。

## 判断ログ

- **戻るボタン**: `Button` の `icon` variant を変えず、`ReadingScreen` 内で背景なしの `Pressable` にする。却下案: `Button` に背景なしの variant を足す（他画面の戻る・閉じるに波及する。必要になったら別 Issue）。
- **背表紙の大きさ**: `Spine` README は「ID から決める」だが、画像は 40×150 の固定。この画面だけ `dimensions` で固定にする。却下案: `Spine` 本体の最小幅を上げる（本棚など他画面が変わる）、ID 由来の大きさを 1.4 倍にする（画像と一致する保証がない）。本棚での大きさと違って見えることは許容し、PR に書く。
- **本棚が出ない**: 原因が未確定のため、実装担当が (a)(b)(c) を順に切り分ける手順を項目 4 に書いた。画面の仕様としては「入っていなければ作者だけ」。
- **ページなしの表記**: #121 では README 優先で「—」にした。MemoRow README を再確認して決める（上の項目 6）。画像の「p.—」は画像側の簡略の可能性があり、README と画像が食い違うなら README を優先する。
- **文字の大きさ・行間・ボタンの大きさ**: トークンに無い値は画面に直書きせず、判断ログに「トークン追加の提案」として書く（追加は人間）。
