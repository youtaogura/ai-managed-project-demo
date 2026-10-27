# Issue #89 読み終えた画面と、書き出しの続きを書く画面

## 背景・目的

このアプリの中心の体験。読み終えた直後の新鮮なうちに、書き出しの続きを書くだけで感想が残るようにする。「読み終えた」（#88 の `ReadingScreen`）を押したあとに「読み終えた画面」（`FinishedScreen`）を出し、「どうだった？」の星・お気に入りを決めてから「書き出しの続きを書く画面」（`WriteScreen`）へ進む。あとから読み返す画面にも入口を置く。

データ（`MediaRecord.oneLiner` / `starters` / `quotes` / `freeTexts` / `favorite` / `rating`）は #84、書き出しの設定・抽選（`StarterSettings`、`pickStarters` / `swapStarters`）と「読んでる本」は既に main にある。デザインは `docs/design-system/screens/README.md` の「読み終えた」「書き出しの続きを書く」（`finished.png`、`write.png`）と、部品 `RatingStars`・`Starter`・`Toggle`。未リリースなので保存データの後方互換・移行は考えない（読めないときに落ちないことだけ守る）。

## スコープ

### やること
- 読み終えた画面 `FinishedScreen`（新ルート `/finished/[id]`）。背表紙と棚板、「読み終えた」（`ribbon`）、タイトル、「10/18 – 10/26 · 9 日間 · メモ 4 件」、「どうだった？」（星の入力・数字と言葉・言葉の目安）、「お気に入りにする」（`Toggle`）、主ボタン「記録を書く」、「あとで書く」。
- 「読み終えた」（`ReadingScreen`）の保存を直す: ステータス `completed`、`endDate` は**すでに入っていれば変えない**（なければ今日）。保存後は `/records/[id]` ではなく `/finished/[id]` へ `replace`。触覚フィードバックを 1 回出す。
- 書き出しの続きを書く画面 `WriteScreen`（新ルート `/write/[id]`）。「ひとことで言うと、」、書き出しのカード（設定の数だけ、オンのものからランダム）、「ほかの書き出しを見る」、「自由に書く」、「あとで」、「ここまでを残す」。書き出しの機能がオフのときは「ひとことで言うと、」と自由に書く欄だけ。
- 書きかけの下書き保存（`writeDraftStore`。「あとで」で閉じても残る）。
- 部品 `Starter`（書き出しのカード）、`RatingSlider`（星をなぞる入力）。
- 読み返す画面（`RecordDetailScreen`）に「書き出しの続きを書く」の入口（`status === 'completed'` のとき）。
- 純粋関数 `lib/finished.ts`、`lib/writeSession.ts`。

### やらないこと
- 書き出しの管理画面（#90）。読み返す画面の作り直し（#91）。`RecordDetailScreen` は入口の追加だけ。
- `tokens.ts` / `docs/design-system/` の変更、新しい依存の追加（**なし**）。
- 既存の `RatingInput`（`RecordForm` が使うレーティング入力）の変更。

## 受け入れ条件

### 「読み終えた」の保存と遷移（`ReadingScreen`、Jest）
- [ ] 「読み終えた」を押すと `status: 'completed'`。`endDate` が `null` のときだけ今日（`todayString()`）を入れ、すでにあれば変えない。ほかの項目は変えない。
- [ ] 保存に成功したら `onFinished(id)` を呼び、ルートは `/finished/<id>` へ `replace` する（`reading-route.test.tsx`）。保存に失敗したら遷移せず、既存の文言「保存できませんでした。もう一度お試しください」を出す。
- [ ] 保存に成功したとき `triggerImpactHaptic` を 1 回呼ぶ。失敗したときは呼ばない。

### 読み終えた画面（`FinishedScreen`、Jest）
- [ ] 背表紙（`Shelf` + `Spine`）、「読み終えた」、タイトル、要約行を表示する。
- [ ] 要約行（`buildFinishedSummary`）: `startDate` と `endDate` があれば「<M/D> – <M/D> · N 日間 · メモ N 件」。日数は両端を含める（10/18 – 10/26 は 9 日間、同じ日は 1 日間）。`startDate` がなければ「<終了 M/D> · メモ N 件」。`endDate` がなければ日付と日数を出さず「メモ N 件」だけ。終了日が開始日より前なら日数は出さない。メモ 0 件でも「メモ 0 件」を出す。
- [ ] 「どうだった？」の見出しと `RatingSlider`（星 34px、部分塗りは 0.1 刻み）。初期値は `record.rating`（なければ未選択。未選択のとき数字・言葉は出さない）。選択後は数字と言葉（「4.5 よかった」。言葉は既存の `getRatingWord`）を出す。
- [ ] なぞる・タップで 1.0〜5.0 を 0.1 刻みで変える（`ratingFromPosition`）。言葉は 5.0 で「最高」、4.0〜4.9「よかった」、3.0〜3.9「まあまあ」、2.9 以下「あんまり」と境界ちょうどで切り替わる。整数の境目をまたぐときだけ `triggerRatingHaptic` を呼ぶ。
- [ ] 言葉の目安（4 つの言葉と点数の目安をすべて表示）と、案内文「星をなぞると 0.1 ずつ変わります」。
- [ ] アクセシビリティ: 星は `accessibilityRole="adjustable"`、`accessibilityLabel="どうだった？"`、`accessibilityActions` の increment / decrement で 0.1 ずつ増減する。
- [ ] 評価の変更は `recordRepository.update` で保存する（変更のたびに保存。保存は直列にし、最後の値が残る）。保存失敗は「保存できませんでした。もう一度お試しください」を出し、画面は落とさない。
- [ ] 「お気に入りにする」の `Toggle`（初期値は `record.favorite`）。切り替えると `favorite` を保存する（本棚の背表紙に栞が出ることは `Spine` の既存テストで確認済みなので、ここでは保存内容を確認）。保存失敗時は元の値に戻し、エラー文言を出す。
- [ ] 「記録を書く」で `onWrite(id)`、「あとで書く」で `onLater()` を呼ぶ。ルートは `/write/<id>`（`replace`）と `/`（`replace`）。
- [ ] 記録が見つからない・読み込み失敗のときは「本が見つかりません」と戻る手段を出し、落ちない。
- [ ] 画面に「評価」「問い」「お題」という言葉が出ない（`queryByText(/評価|問い|お題/)` が null。`accessibilityLabel` も確認）。

### 書き出しの続きを書く画面（`WriteScreen`、Jest）
- [ ] 見出し「読み終えた」、タイトル、作者（なければ出さない）、「書き出しを選んで、続きを書こう」と書いた数「<書いた数> / <カードの数>」。書いた数は本文が空でない書き出しカードの数。
- [ ] 一番上に固定の「ひとことで言うと、」（`STARTER_FIXED`）の欄。初期値は `record.oneLiner`（なければ空）。
- [ ] 書き出しの機能がオン（`starterSettings.enabled`）のとき、オンの書き出しから重複なく設定の数（`count`）だけ `Starter` のカードを出す（`pickStarters`）。オンが `count` より少なければあるだけ、0 件ならカードなし。カードは初期はすべて「選んでいない」（書き出しと右に「書く」）。
- [ ] カードをタップすると選ぶ（枠が `ribbon`、続きの入力欄が開く）。選べるのは 1 枚だけで、別のカードをタップするとそちらに移る（書いた内容は残る）。選んだカードには続きの入力欄（明朝）と「引用として残す」（`Toggle`）がある。**ページ（任意、`maxLength` 10、数字キーボード）は「引用として残す」がオンのときだけ出す**（判断ログ参照）。
- [ ] 「ほかの書き出しを見る」を押すと、まだ何も書いていないカードが、オンの書き出しの中から入れ替わる（`swapStarters`。今出ている書き出し以外を優先）。書いたカードは入れ替えず残し、その分を除いた枚数だけ入れ替える。オンの書き出しが `count` 以下のときは顔ぶれが変わらなくてよい。
- [ ] 「自由に書く」を押すと、書き出しなしの欄（`accessibilityLabel="自由に書く"`）が 1 つ足される（何度でも）。書き出しの機能がオフのときは最初から 1 つ出ていて、書き出しのカード・「ほかの書き出しを見る」は出ない。
- [ ] 「ここまでを残す」は、「ひとことで言うと、」・書き出しの続き・自由記述のどれかに本文（空白だけは空とみなす）があるあいだ有効、すべて空なら `disabled`。押すと `recordRepository.update` で次を保存する:
  - `oneLiner` = 前後の空白を除いた入力（空なら `null`）。
  - 続きが書かれた書き出しカードごとに、「引用として残す」オフなら `starters` に `StarterEntry`（`starter` = 書き出しの文そのもの、`text` = 前後の空白を除いた続き）を**書き出しの文と一緒に**追加。オンなら `quotes` に `QuoteEntry`（`text` = 続き、`page` = `normalizePage`、`comment` = null）を追加。
  - 本文のある自由記述ごとに `freeTexts` に `FreeTextEntry` を追加。
  - 既存の `starters` / `quotes` / `freeTexts` / `memos` は消さず、後ろに足す（書いた順）。ほかの項目は変えない。`id` は `generateId`、`createdAt` は `new Date().toISOString()`（ともに注入可能）。
- [ ] 保存に成功したら下書きを消し、`onSaved(id)` を呼ぶ（ルートは `/records/<id>` へ `replace`）。失敗したら遷移せず「保存できませんでした。もう一度お試しください」を画面内に出し、入力は残す。
- [ ] 「あとで」を押すと、書きかけがあれば下書きを保存して `onLater()`（ルートは `/` へ `replace`）。何も書いていなければ下書きは保存せず（保存済みなら消す）に `onLater()`。Android の戻る操作も同じ扱い。
- [ ] 下書きの復元: 画面を開き直す（再起動を含む）と、ひとこと・出ていたカードの顔ぶれ（`StarterItem.id` の並び）・各カードの続き / ページ / 「引用として残す」・自由記述の欄と内容・選んでいたカードが戻る。復元のときは抽選しない。下書きの書き出し ID が設定から消えている／書き出しがオフのときは、そのカードは捨てる（オンのときは足りない分を抽選で補う。オフのときは自由記述とひとことだけ復元する）。
- [ ] 下書きの読み込み・保存の失敗や壊れたデータでは落ちず、空の状態で開く。
- [ ] 画面に「評価」「問い」「お題」という言葉が出ない。
- [ ] 記録が見つからない・読み込み失敗のときは「本が見つかりません」と戻る手段を出し、落ちない。

### 入口（`RecordDetailScreen`、Jest）
- [ ] `status === 'completed'` の本の詳細に「書き出しの続きを書く」の行（高さ 44 以上）を出し、押すと `onWrite(id)`。ルートは `/write/<id>` へ `push`（戻ると詳細に戻る）。completed 以外では出さない。

### 純粋関数・ストア（Jest）
- [ ] `buildFinishedSummary` / `daysBetween`、`createCards` / `replaceUnwrittenCards` / `restoreCards` / `buildWriteInput` が上記のとおり動く（`random`・`generateId`・`now` を注入）。
- [ ] `writeDraftStore`: `load` / `save` / `clear`（キー `writeDraft.v1.<recordId>`）。値は型ガードで検証し、壊れていたら `null`。ストレージが例外を投げても `load` は `null` を返す。

## 画面・振る舞い

### 読み終えた（`finished.png`）
上から: 背表紙（中央、棚板付きの小さな表示。`ReadingScreen` と同じ `Shelf` の使い方）、「読み終えた」（`ribbon`、`label`）、タイトル（`bookTitle`）、要約（`label`・`textSecondary`）、区切り線、「どうだった？」（`sectionTitle`）、星（34px）、数字（`displayNumber`）と言葉（`ribbon` の明朝）、言葉の目安（`micro`・`textSecondary`）、案内文、区切り線、「お気に入りにする」（`Toggle`、行の高さ 52 以上）。スクロールするのは本文のみ。下に固定（`bottomInset` を考慮）: 主ボタン「記録を書く」、その下に文字ボタン「あとで書く」。読み終えた日は表示だけ（変えるときは編集）。

### 書き出しの続きを書く（`write.png`）
上: 「あとで」、「読み終えた」（`ribbon`）、タイトル、作者。「書き出しを選んで、続きを書こう」と右に「1 / 3」。次に「ひとことで言うと、」の欄（`surface2`、明朝）。その下に `Starter` のカード。選んでいるカードは `surface1`・枠 `ribbon` 1.5px・角丸 `radius.card`、書き出しを上に、続きの入力欄（明朝、最小 4 行、面 `bg`、枠 `textPrimary`）、「引用として残す」（`Toggle` small）、オンのときだけ「ページ」。選んでいないカードは `surface1`・枠 `line`、書き出しと右に「書く」。書き終えた未選択のカードは書き出しの下に続きの冒頭 1 行（`numberOfLines={1}`）を出す。その下に「↻ ほかの書き出しを見る」と「自由に書く」（高さ 44 以上）。下に固定の主ボタン「ここまでを残す」。キーボードで隠れないよう `NoteSheet` と同じ `KeyboardAvoidingView` の使い方に合わせる。

### 状態
- `FinishedScreen`: `record`、`loading`、`rating`、`favorite`、エラー文言。保存は常に `recordRepository.update(id, input)`（変えるのは `rating` / `favorite` だけ）。保存の直列化は `useRef<Promise>` に連ねる（`useStarterSettings` の `queue` と同じ作り）。
- `WriteScreen`: `record`、`loading`、`oneLiner`、`cards: WriteCard[]`（`{ key, kind: 'starter' | 'free', starterId: string | null, starter: string, text, page, asQuote }`）、`selectedKey`、`saving`、エラー文言。

### エラー時
読み込み・保存の失敗で画面を落とさず、文言を出して操作を続けられるようにする。

## 設計

### 追加するファイル
- `src/lib/finished.ts` … `buildFinishedSummary(record)`、`daysBetween(start, end)`（`lib/date.ts` の `parseDateParts` と `Date.UTC` で数える）、言葉の目安の定数（言葉の判定は `getRatingWord` を使い重複して持たない）。
- `src/lib/writeSession.ts` … `WriteCard` 型、`createCards`（`pickStarters`）、`replaceUnwrittenCards`（`swapStarters`）、`restoreCards`（下書き＋設定）、`isWritten`、`hasAnythingToSave`、`buildWriteInput(record, { oneLiner, cards }, options)`（`NewRecordInput` を返す。`lib/notes.ts` の `recordToInput` を再利用し、`starters` / `freeTexts` / `oneLiner` が `...record` から引き継がれることを確認。足りなければ引数を広げる）。
- `src/lib/writeDraftStore.ts` … `createWriteDraftStore(storage)`: `load(recordId)` / `save(recordId, draft)` / `clear(recordId)`（`noteDraftStore` と同じ作り）。`WriteDraft = { oneLiner: string; cards: { key; kind; starterId; starter; text; page; asQuote }[]; selectedKey: string | null }`。型ガードで検証し、不正なカードは捨てる。
- `src/hooks/useWriteDraftStore.tsx` … `useNoteDraftStore` と同じ context 方式（既定値あり。`_layout.tsx` は変更しない）。`testProviders.tsx` に `withWriteDraftStore`。
- `src/components/RatingSlider.tsx` … 星 34px のなぞる入力。`RatingInput` の `onResponderGrant` / `Move` の考え方と `lib/recordForm.ts` の `ratingFromPosition` / `crossesInteger` を使う。props: `value: number | null`、`onChange(value: number)`。数字・言葉・案内文は `FinishedScreen` に置く。
- `src/components/Starter.tsx` … `Starter`（props: `starter`、`selected`、`text`、`onChangeText`、`onSelect`、`asQuote`、`onChangeAsQuote`、`page`、`onChangePage`）と、固定の `OneLinerField`。
- `src/screens/FinishedScreen.tsx`、`src/screens/WriteScreen.tsx`
- `src/app/finished/[id].tsx`（ヘッダーなし。`onWrite` → `router.replace('/write/<id>')`、`onLater` → `router.replace('/')`）、`src/app/write/[id].tsx`（`onSaved` → `router.replace('/records/<id>')`、`onLater` → `router.replace('/')`）
- テスト: `lib/__tests__/{finished,writeSession,writeDraftStore}.test.ts`、`components/__tests__/{RatingSlider,Starter}.test.tsx`、`screens/__tests__/{FinishedScreen,WriteScreen}.test.tsx`、`src/__tests__/{finished,write}-route.test.tsx`

### 変更するファイル
- `src/screens/ReadingScreen.tsx` … `finish` の `endDate` を `record.endDate ?? todayString()` にし、成功で `triggerImpactHaptic()`。`ReadingScreen.test.tsx`・`reading-route.test.tsx` を新しい動き（endDate を変えない・遷移先 `/finished/<id>`）に合わせて更新。
- `src/screens/RecordDetailScreen.tsx` … `onWrite?` を足し、`completed` のとき「書き出しの続きを書く」の行を出す。`src/app/records/[id].tsx` で `router.push('/write/<id>')` を渡す。
- `src/testProviders.tsx` … `withWriteDraftStore`。

### 状態管理・データ
React の state / context のみ。**新しい依存はなし**。データ構造（`MediaRecord` など）の変更なし。下書きは `KeyValueStorage`（`asyncKeyValueStorage`）にキー `writeDraft.v1.<recordId>` で保存する。書き出しの設定は `useStarterSettings()`。

## テスト方針
- 純粋関数（要約・日数・カードの抽選／入れ替え／復元・保存内容の組み立て）: `finished.test.ts`、`writeSession.test.ts`。
- 下書きの保存・復元・壊れたデータ・失敗: `writeDraftStore.test.ts`。
- 星のなぞり（0.1 刻み、整数またぎの触覚）: `RatingSlider.test.tsx`（`onLayout` で幅を渡し、`onResponderGrant` の `locationX` を渡す）。言葉の境界（4.9→5.0、3.0、4.0）は `FinishedScreen.test.tsx` でも確認。
- `FinishedScreen.test.tsx`: インメモリ storage の本物のリポジトリで、表示、評価とお気に入りの保存内容、保存失敗、`onWrite` / `onLater`、見つからない、禁止語。
- `WriteScreen.test.tsx`: カードの数（設定の数・オンのものだけ）、入れ替え、オフのとき書き出しのカードが出ない、続きが書き出しの文と一緒に `starters` に保存される、引用（ページ付き）、自由記述、`oneLiner`、既存データが消えない、保存失敗、「あとで」で下書きが残り開き直しで復元、成功で消去、壊れた下書き、禁止語。
- `ReadingScreen.test.tsx`: 終えた日が変わらない・触覚。`RecordDetailScreen.test.tsx`: 入口の出し分けと `onWrite`。ルートテストで遷移先。
- 見た目の撮影ツールは使えない前提。表示要素・文言・状態ごとの出し分けを Jest で確認し、PR にその旨を書く。

## 判断ログ

- **画面は 2 つのルートに分ける**: 選んだ案＝`/finished/[id]` と `/write/[id]`。却下＝1 画面でステップ切り替え（下書き・戻る操作が複雑になる）／`BottomSheet`（カードと入力で縦に長く、キーボードと相性が悪い）。
- **「読み終えた」の遷移先は `onFinished` の先を差し替えるだけ**: #88 で props にしてあるため、`ReadingScreen` は endDate の扱いと触覚だけ直し、ルートの遷移先を `/finished/<id>` にする。
- **終えた日**: Issue の「すでに入っていれば変えない」に従い `endDate ?? today`（#88 の「常に今日」を直す）。開始日は補完しない。
- **日数は両端を含める**: design の例（10/18 – 10/26 = 9 日間）に合わせた。開始日なし・終了日なし・逆転のときは日数を出さない。
- **評価の入力は新部品 `RatingSlider`**: 既存 `RatingInput` は `RecordForm` 用の「レーティング」ラベル・±ボタン・クリア付きで design（星 34px、案内文）と違う。壊さないため触らず、計算は `lib/recordForm.ts` を共有する。範囲は既存どおり 1.0〜5.0（`isValidRating`）。評価しないで進めるときは触らない。
- **評価・お気に入りは変更のたびに保存（直列化）**: 却下＝ボタンを押したときだけ保存（Android の戻るで失われる）。デバウンスは入れない（`AsyncStorage` で足りる軽さ）。
- **「引用として残す」の保存先とページ**: `StarterEntry` はページを持たず、読み返す画面では書き出しの続きは「書き出し＋続き」の一続きの文章、引用は `Quote` で出す。そのため、オンなら続きを `QuoteEntry`（ページ付き）に保存し書き出しの文は残さない（引用は本の言葉で、書き出しへの返答ではないため）。オフなら `StarterEntry` で書き出しの文と一緒に保存する。却下＝`StarterEntry` にページを足す／引用に書き出しを持たせる（型・検証・CSV・バックアップの変更が広がる）。**ページ入力は「引用として残す」がオンのときだけ出す**（design は常に並べているが、オフでは保存先がないため。差異は PR に書く）。
- **自由に書く**は `FreeTextEntry` に保存（読み返す画面の「自由に書いた文章も同じ流れで」に合わせる）。何度でも足せる。
- **ひとことで言うと、**は `oneLiner` に保存（`starters` には入れない）。入口から再度開いたときは既存の値を初期値にして編集できる。空にして残すと `null`。
- **入れ替えでは書いたカードを動かさない**: 書いた文を消さないため。却下＝全入れ替え（書いた内容が消える）／書いたカードがあるとボタン無効（使い方が伝わりにくい）。
- **下書きは 1 記録につき 1 つ・`KeyValueStorage`**: `NoteSheet` の下書き（#88）と同じ方針と作り。復元では抽選せず保存した顔ぶれを使う（開くたびに書き出しが変わると書いたものとずれるため）。却下＝`MediaRecord` に下書きを足す（バックアップや検証に混ざる）。
- **「あとで書く」「あとで」の行き先は本棚（`/`）**: 書かないまま戻りたい意思に合わせる。読み返す画面に入口があるのであとから書ける。
- **「記録を書く」は `replace`**: 戻ると読み終えた画面に戻る二重の流れを避ける。入口（読み返す画面）からは `push`。
- **入口は `RecordDetailScreen` に行を 1 つ足すだけ**: 作り直しは #91。`completed` のときだけ。
- **触覚**: 読み終えた保存の成功時に 1 回（`triggerImpactHaptic`）、星は既存 `triggerRatingHaptic` を整数の境目で。
- **禁止語**: 「評価」「問い」「お題」は文言・`accessibilityLabel` に使わない。既存 `RatingStars` の「レーティング …」は禁止語ではないのでそのまま。
- **デザイン上の提案（人間向け）**: 言葉の目安の表示、「ひとことで言うと、」欄の専用部品はデザインシステムにない。既存トークンで組むが、専用部品が必要なら人間に追加を提案する。
