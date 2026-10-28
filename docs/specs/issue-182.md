# Issue #182 読後メモを書く画面を作り直す（入力欄 1 つとヒント）

## 背景・目的

#181 で記録のデータを「この本をひとことで」（`oneLiner`）と読後メモ（`postReadMemos`）に置き換えた。
書く画面はまだ前のカードの形（ヒントごとのカード・「自由に書く」・「ここまでを残す」）を最低限合わせただけだった。
デザイン（`docs/design-system/screens/write.png`、`components/Hint/README.md`）どおり、
**大きな入力欄 1 つ**と、押すと最後に改行して入る**ヒント**の形に作り直す。

## スコープ

やること
- 書く画面（`screens/WriteScreen.tsx`）の作り直し: 上の「あとで」「読了 M/D」、「読後メモを書く」・タイトル・作者、「この本をひとことで」の欄、「読後メモ」の入力欄 1 つ、ヒント 3 つと「↻ ほかのヒント」、下に固定の「残す」
- ヒントの部品 `components/Hint.tsx`
- キーボードを開いているあいだ、ヒントの行をキーボードのすぐ上に出す（`hooks/useKeyboardVisible.ts`）
- 下書きの形を `{ oneLiner, text, hints, usedHints }` にする（保存キー `writeDraft.v2.<id>`）
- 前のカードの UI をなくす: `components/Starter.tsx`、`writeSession.ts` のカードの関数、文言「ヒントを選んで、続きを書こう」「自由に書く」「ここまでを残す」「ひとことで言うと、」
- 撮影シーン `write` を、デザインと同じ状態（ひとことが入り、読後メモにヒントを 1 つ入れたところ）にする

やらないこと
- 読み返す画面・読後メモを直すシート（#183）
- `docs/design-system/` とトークンの変更

## 受け入れ条件

- [x] ヒントを押すと、文章の最後に一段改行して入る。空のときは改行しない。改行で終わっているときは改行を重ねない（`WriteScreen.test.tsx`、`writeSession.test.ts`）
- [x] ヒントを入れたあと、入力欄にフォーカスし、カーソルを最後に置く（`WriteScreen.test.tsx`）
- [x] 入れたヒントは ✓（面 `surface-2`）になり、もう一度押しても入る（`WriteScreen.test.tsx`、`Hint.test.tsx`）
- [x] 「↻ ほかのヒント」で今と別のヒントに入れ替わる。「どうだった？」が 2.9 以下なら「合わなかったとき」が 1 つ入る（`WriteScreen.test.tsx`）
- [x] 「残す」で読後メモが 1 件増え、「この本をひとことで」も保存される。入力欄が空（空白だけ）なら読後メモは増えない（`WriteScreen.test.tsx`、`finished-write-route.test.tsx`）
- [x] 「あとで」で下書きが残り、開き直すと戻る（`WriteScreen.test.tsx`、`finished-write-route.test.tsx`）
- [x] キーボードを開いて読後メモを書いているあいだ、ヒントの行が「残す」の代わりに下（キーボードのすぐ上）に出る（`WriteScreen.test.tsx`。実機で確かめられない点は下に書く）
- [x] `pnpm shots -- write` で撮って画像と見比べる（下の「見た目の確認」）

## 設計

### 画面の組み（上から）

| 部分 | 中身 |
|---|---|
| 上（固定） | 左に「あとで」（`body`、`text-secondary`）、右に「読了 M/D」（`endDate` から。なければ出さない） |
| 見出し | 「読後メモを書く」（`section-title`、`text-secondary`）、タイトル（`book-title`）、作者（`label`、なければ出さない） |
| この本をひとことで | 見出し（`value`、`text-secondary`）と入力欄（`one-line` の明朝、面 `surface-1`、枠 `line`、`radius-card`）。開いたときは既存の `oneLiner` |
| 読後メモ | 見出し「読後メモ」と右に「思ったことを、そのまま」（`label`、`text-tertiary`）。入力欄（`reading` の明朝、10 行ぶんの高さ、フォーカス中は枠 `accent`）。開いたときは空（下書きがあれば下書き） |
| ヒント | 見出し「ヒント（押すと、最後に改行して入ります）」と右に「↻ ほかのヒント」。その下に `Hint` を 3 つ縦に並べる |
| 下（固定） | 主ボタン「残す」 |

### ヒント（`components/Hint.tsx`）

- `radius-full`、面 `surface-1`、枠 `line`、文字は明朝 `starter`・`text-primary`、右に「＋」。入れたヒントは面 `surface-2`・「✓」（`accessibilityState.checked`）。高さは `touch-min` 以上
- 押すと `appendHint(text, hint)`: 空なら `hint`、改行で終わっていれば `text + hint`、それ以外は `text + "\n" + hint`
- 入れたあと、入力欄に `focus()` し、`setSelection(長さ, 長さ)` でカーソルを最後に置く（文章が画面に反映されたあとの effect で行う）。`setSelection` がない環境（Web）では呼ばない
- ヒントは `pickHints(record.rating)`、「ほかのヒント」は `pickOtherHints(今の 3 つ, rating)`（#181 の `lib/hints.ts`）
- 入れたヒントの記録（`usedHints`）は ✓ のためだけに使い、保存する読後メモには残さない（Hint/README）

### キーボードの上のヒントの行

- 新しい依存は足さない。React Native の `Keyboard` のイベントと `KeyboardAvoidingView` で作る
- `useKeyboardVisible()`: iOS は `keyboardWillShow` / `keyboardWillHide`、Android は `keyboardDidShow` / `keyboardDidHide`（Android には Will のイベントが来ない）
- 画面全体を `KeyboardAvoidingView behavior="padding"` で包む（`BottomSheet` と同じ。RN 0.88 の Android は edge-to-edge でウィンドウがリサイズされないので、両方とも padding にする）
- 「キーボードが開いている」かつ「読後メモの入力欄にフォーカスしている」あいだは、
  - 入力欄の下のヒントの行を消し、
  - 下の固定の「残す」の帯の代わりに、ヒントの行（見出し＋横スクロールのヒント）を出す。この帯は `KeyboardAvoidingView` の一番下にあるので、キーボードのすぐ上に来て、入力欄と一緒にスクロールしない
- 帯の横スクロールは `keyboardShouldPersistTaps="always"`。ヒントを押してもキーボードが閉じない
- 「この本をひとことで」を書いているときは、ヒントの行は動かさない（ヒントは読後メモに入るので）

### 保存と下書き（`lib/writeSession.ts`・`lib/writeDraftStore.ts`）

- `isUnchanged(record, { oneLiner, text })`: 読後メモが空白だけで、ひとことが開いたときの値（前後の空白を除く）と同じなら true
- `buildWriteInput(record, { oneLiner, text })`: `oneLiner` は前後の空白を除き、空なら null。読後メモは本文を前後の空白で整え、空でなければ 1 件だけ既存の後ろに足す
- 「残す」: 変わっていなければ保存せず、下書きを消して閉じる。変わっていれば `repository.update` し、下書きを消して閉じる。失敗したらエラーを出して入力を残す。遷移先はこれまでどおり（ルート `write/[id]` は変えない）
- 「あとで」（と Android の戻る操作）: 変わっていなければ下書きを消し、変わっていれば `{ oneLiner, text, hints, usedHints }` を `writeDraft.v2.<id>` に保存する
- 開くとき: 下書きがあれば ひとこと・本文・ヒントの顔ぶれ・✓ を戻す。下書きのヒントが 3 つとも今の一覧にないときは選び直す（`restoreHints`）
- `toWriteDraft`: `oneLiner` と `text` が文字列でなければ null。`hints` / `usedHints` は文字列だけを残す

## 判断ログ

| 判断 | 選んだ案 | 却下した案 | 理由 |
|---|---|---|---|
| 「残す」を押せる条件 | いつも押せる。何も変えていなければ保存せずに閉じる | 何か書くまで disabled（前の画面） | 読み返す画面から開いて何も書かずに閉じたい人が迷わない。押しても何も壊れない。Issue の指示の提案どおり |
| キーボードの上のヒントの行 | `Keyboard` のイベント + `KeyboardAvoidingView`（依存なし） | `InputAccessoryView`（iOS のみ）、`react-native-keyboard-controller` | `InputAccessoryView` は Android にない。両方で同じ組みにでき、依存も増えない。キーボードに張り付く動きの滑らかさは controller に劣るが、まず足りるか実機で確かめる |
| キーボードを開いているあいだの「残す」 | 隠して、その位置にヒントの行を出す | ヒントの行の下に「残す」も出す | デザインは「キーボードのすぐ上にヒントの行」。キーボードを閉じればすぐ「残す」が出る |
| キーボードの上のヒントの並べ方 | 横スクロール 1 行 | 縦に 3 つ | 縦に 3 つ（約 150pt）だとキーボードと合わせて入力欄がほとんど見えなくなる |
| ヒントの行を上に出す条件 | 読後メモの欄にフォーカスしているときだけ | どの欄でも | ヒントは読後メモに入る。ひとことを書いているときに出すと、押した結果が見えない欄に入る |
| 改行 | 一段（`\n` 1 つ）。改行で終わっていれば足さない | 空行を挟む（`\n\n`） | Issue と Hint/README の「最後に改行して入る」。write.png では段のあいだが空いて見えるが、文章の決まりは README を優先する |
| 下書きの形と保存キー | `{ oneLiner, text, hints, usedHints }`、キーを `writeDraft.v2.` に変える | 同じキーで形だけ変える | 形がまったく違う。未リリースなので前の版の下書きは読まない（Issue: 移行・後方互換は考えなくてよい）。キーを変えると、古い形を読もうとして失敗する経路がなくなる |
| ヒントの顔ぶれも下書きに残す | 残す（`hints`） | 開き直すたびに選び直す | 「✓」が付いたヒントが開き直すと消えると、何を入れたかわからなくなる |
| 「読了 M/D」 | `endDate` を `M/D`（先頭の 0 なし）。なければ出さない | 今日の日付 | write.png の「読了 10/20」。読み終えた日は記録にある |
| 「思ったことを、そのまま」 | 入れる（`label`、`text-tertiary`） | 入れない | screens/README には書いていないが write.png にある。新しい色・スタイルは使わない |
| 「この本をひとことで」の文字 | `one-line`（22px） | 画像の大きさ（約 17px） | screens/README が「`one-line` の明朝」と指定。画像と README が違うときは README を優先する（AGENTS.md） |
| ヒントの高さ | `touch-min`（44）以上 | 画像の高さ（約 35） | タップできるものは 44 以上（CLAUDE.md） |
| 撮影シーンの作り方 | シーンに `writeDrafts`（下書き）を足し、`localStorage` に入れる | `actions` で入力し、ヒントを押す | ヒントはランダムなので、押す対象を決められない。下書きなら write.png と同じヒント・✓ を再現でき、アプリに撮影用の分岐も要らない |
| `ONE_LINER_PROMPT`（「ひとことで言うと、」） | 消す | 残す | 見出しを「この本をひとことで」にしたので使う場所がない |
| 消したテスト | `Starter.test.tsx`（部品ごと削除）、`writeSession.test.ts` のカードの関数（`createCards` `replaceUnwrittenCards` `restoreCards` `createFreeCard` `hasAnythingToSave` `isDraftBlank`）、`writeDraftStore.test.ts` のカードの下書き、`WriteScreen.test.tsx` のカード・「自由に書く」・「ここまでを残す」の disabled、`types.test.ts` の `ONE_LINER_PROMPT` | — | 対象の機能（カードの UI と自由記述の欄）を外したため。保存・下書き・ヒント・見つからないときのテストは新しい形に書き直して残した |

## テスト方針

| 確かめること | テスト |
|---|---|
| ヒントの入れ方（空・改行・改行を重ねない） | `lib/__tests__/writeSession.test.ts`（`appendHint`）、`screens/__tests__/WriteScreen.test.tsx`（画面で押して入力欄の値を見る） |
| カーソルとフォーカス | `WriteScreen.test.tsx`（TextInput の `focus` / `setSelection` が最後の位置で呼ばれる） |
| ✓・もう一度押せる | `WriteScreen.test.tsx`、`components/__tests__/Hint.test.tsx`（面の色・枠・角丸・＋/✓） |
| ほかのヒント・低評価 | `WriteScreen.test.tsx` |
| キーボードの上の行 | `WriteScreen.test.tsx`（`Keyboard` のイベントを送り、行の場所と「残す」の有無を見る）、`hooks/__tests__/useKeyboardVisible.test.tsx`（iOS は Will、Android は Did） |
| 保存（1 件増える・空なら増えない・ひとこと・変えていなければ保存しない・失敗） | `WriteScreen.test.tsx`、`writeSession.test.ts`（`buildWriteInput` `isUnchanged`） |
| 下書き（保存・戻す・壊れた下書き・消す） | `WriteScreen.test.tsx`、`lib/__tests__/writeDraftStore.test.ts`、`src/__tests__/finished-write-route.test.tsx`（読み返す画面 → 書く →「あとで」→ もう一度開くと戻る） |
| ルート（記録を書く → 残す → 読み返す画面、戻る操作） | `finished-write-route.test.tsx`、`back-navigation.test.tsx` |
| 撮影シーンの下書き | `scripts/screenshots/__tests__/scenes.test.ts`（保存キーが一致、下書きがアプリの読み込みを通る、ヒントが一覧にある） |

### 実機で確かめていないこと

この環境には iOS / Android の実機・シミュレーターがなく、Expo のドキュメント（docs.expo.dev）にもネットワークの制限で届かなかった。次は実機で確かめる。

- iOS: キーボードが開く途中でヒントの行が上に出て、キーボードの上端にぴったり付くこと（`KeyboardAvoidingView` の padding とホームインジケータの余白）
- Android（edge-to-edge）: `keyboardDidShow` のあとにヒントの行がキーボードの上に出ること（開き終わってから切り替わるので一瞬遅れる）。機種・IME によって `KeyboardAvoidingView` の高さがずれないか
- 両方: 帯のヒントを押してもキーボードが閉じず、カーソルが文章の最後に来ること（`setSelection`）
- ずれる・滑らかでない場合は、`react-native-keyboard-controller` の `KeyboardStickyView` への置き換えを提案する（依存の追加になるので、そのときは仕様書に書く）

## 見た目の確認（`pnpm shots -- write` と `docs/design-system/screens/write.png`）

撮影シーン: 「三体」（読了 2025-10-20、ひとこと入り）に、write.png と同じ下書き（読後メモの本文とヒントの顔ぶれ、「この本を渡したいのは、」に ✓）を入れて開く。

| 部分 | 結果 | メモ |
|---|---|---|
| 「あとで」「読了 10/20」 | 一致 | 上の余白は Web の撮影にセーフエリアがないぶん画像より狭い（端末ではセーフエリアが入る） |
| 「読後メモを書く」・タイトル・作者 | 一致 | |
| 「この本をひとことで」の見出しと欄 | 残した | 欄の文字が画像より大きく 2 行になる。README の `one-line` を優先した（判断ログ） |
| 「読後メモ」と「思ったことを、そのまま」 | 一致 | screens/README にはないが画像にあるので入れた（判断ログ） |
| 読後メモの入力欄（大きさ・面・枠・明朝） | 一致 | 画像の枠が墨なのはフォーカス中の状態。撮影ではフォーカスしていないので `line` |
| 読後メモの段のあいだ | 残した | 画像は段のあいだが 1 行空く。改行は一段（README・Issue） |
| 読後メモの文字の太さ | 残した | 画像より細く見える。README の `reading`（600）のまま |
| ヒントの見出しと「↻ ほかのヒント」 | 直した | 見出しとヒントのあいだが広かったので、行のあいだの余白をなくした（「ほかのヒント」の押せる高さ 44 はそのまま） |
| ヒント 3 つ（丸・面・枠・明朝・＋/✓） | 一致 | 高さは `touch-min`（44）で、画像（約 35）より少し高い（判断ログ） |
| 下の「残す」 | 一致 | 撮影の画面の高さ（844）では、ヒントの 2 つ目から下は「残す」の帯の下に隠れ、スクロールで見える。画像は高さ 1000 で描かれている |
| キーボードの上のヒントの行 | 撮影できない | Web ではキーボードのイベントが来ない。Jest と実機で確かめる |
