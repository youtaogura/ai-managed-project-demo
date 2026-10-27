# Issue #156 読み終えた本にメモ・引用を足せない（読み返す画面に入口がない）

## 背景・目的

メモ・引用を書くシート（`NoteSheet`）は「読んでる本」画面（`ReadingScreen`）にしかなく、読み終えた本・途中でやめた本の「読み返す」画面（`RereadScreen`）からは開けない。読み終えてから引用を書き写したり、思い出したことをメモしたりできるようにする。
`RereadScreen` に `ReadingScreen` と同じ「＋ メモ・引用を書く」の入口を置き、出ているメモ・引用を押して直す・削除できるようにする。

## スコープ

やること
- `RereadScreen` の `completed` / `dropped` の本に、「メモ」の節と点線ボタン「＋ メモ・引用を書く」を出す（メモが 0 件でも出す）
- 書いたメモは「メモ」節（ページ順、`sortMemos`）、引用は既存どおり書き出しの続きと同じ流れ（書いた順、`buildRereadEntries`）に出る
- 読み返す画面のメモ・引用を押すと `NoteSheet` が編集モードで開き、直す・削除ができる
- 保存・削除後は画面の `record` を更新する（他の項目は失われない）

やらないこと
- `planned`（読みたい）の画面には出さない（「読み始める」だけ）
- `ReadingScreen`・`NoteSheet`・`MemoRow`・`Quote`・`lib/notes.ts` の変更（そのまま使う）
- 書き出しの続き・自由記述の編集、新しい色・部品・トークン、新規ライブラリ

## 受け入れ条件

- [ ] `completed` の本の読み返す画面に「メモ・引用を書く」ボタンが出る。メモ・引用が 1 件もない本（「まだ何も書いていません」の案内が出る状態）でも出る
- [ ] `dropped` の本にも出る
- [ ] `planned` の本には出ない
- [ ] ボタンを押すと `NoteSheet` が新規モードで開く。メモを書いて保存すると、記録の `memos` に追加され、「メモ」節に表示される
- [ ] 引用を書いて保存すると、記録の `quotes` に追加され、書き出しの続きと同じ流れ（書いた順）に表示される
- [ ] 「メモ」節のメモを押すと編集モードで開き、本文を直して保存すると表示が更新される
- [ ] 引用を押すと編集モードで開き、直せる
- [ ] 編集モードの削除でメモ・引用が消え、表示からも無くなる（メモが 0 件になっても入口は残る）
- [ ] 保存時にひとこと・評価・書き出しの続き・本棚・日付などが失われない
- [ ] 既存の表示・テスト（ボタンまわり以外）は変わらない

## 画面・振る舞い

`completed` / `dropped` の並び（上から）:
1. 既存のヘッダー・タイトル・ひとこと・評価
2. 書き出しの続き・引用・自由記述（既存。引用だけ押せるようにする）
3. 区切り線 → 見出し「メモ」→ メモ行（押せる。`MemoRow` に `onPress` と `textColor: textSecondary`）→ 点線ボタン「＋ メモ・引用を書く」（`accessibilityLabel="メモ・引用を書く"`）
4. 既存の「まだ何も書いていません…／書き出しの続きを書く」案内（`empty && completed` のとき）、`dropped` の「もう一度読む」案内
5. 本棚の行ほか既存の行

- 見出し「メモ」は常に出す。メモ 0 件のときは見出しとボタンだけ（件数や空文言は足さない）
- ボタンは `ReadingScreen` の `styles.add` と同じ見た目（点線・`size.touchMin`・`radius.card`・`textTertiary`）
- 保存・削除の失敗は `NoteSheet` が内部でエラー表示する（`onSubmit` が reject すればシートが開いたまま）。画面側の追加処理は不要
- 保存した本文が空だけの引用は `buildRereadEntries` が除外するので、`NoteSheet` の送信条件（本文必須）に任せる

## 設計

変更ファイルは `app/src/screens/RereadScreen.tsx` とそのテストのみ。

- `ReadingScreen` と同じ形で、`SheetState`（`{mode:'new'} | {mode:'edit'; item: NoteItem} | null`）を state に持つ
- `draftOf(item)` は `ReadingScreen` にローカルで定義されている。同じ関数を `lib/notes.ts` に移して両画面で使うのが理想だが、`ReadingScreen` を触らない方針なので、`RereadScreen` 側で同じ実装を定義せず **`lib/notes.ts` に `noteItemToDraft` として切り出し、`ReadingScreen` もそれを使うよう置き換える**（小さなリファクタ。挙動は変えない）
- `save(input: NewRecordInput | null)`：`null` なら `throw`、`repository.update` → `setRecord(updated)`（`ReadingScreen.save` と同じ）。既存の `saveShelves` / `start` も内部で近い処理をしているが、触らない
- メモ・引用の追加/更新/削除は `addNote` / `updateNote` / `removeNote`（`lib/notes.ts`）を使い、他の項目は `recordToInput` が引き継ぐ
- 引用: `entries` のループで `item.kind === 'quote'` の `Quote` に `onPress={() => setSheet({mode:'edit', item:{kind:'quote', entry:item.entry}})}` を渡す
- メモ: `memos` 配列の `MemoRow` に `onPress={() => setSheet({mode:'edit', item:{kind:'memo', entry:memo}})}` を渡す
- メモ節の表示条件は `record.status !== 'planned'`（`memos.length > 0` の条件は外す）。`planned` は従来どおり、メモがあれば（過去データ用）メモ節を押せない状態で表示する
- `NoteSheet` は `record.status !== 'planned'` のときだけ描画する
- 状態管理に新しいライブラリ・context は不要

## テスト方針

`app/src/screens/__tests__/RereadScreen.test.tsx` に追加（既存のモック repository の流儀に合わせる）。`lib/notes` に切り出す関数があれば `lib/__tests__/notes.test.ts` に追加し、`ReadingScreen` の既存テストが通ることで挙動不変を確認する。

| 受け入れ条件 | テスト |
|---|---|
| completed・メモなしでも入口が出る / dropped で出る / planned で出ない | `queryByLabelText('メモ・引用を書く')` の有無 |
| メモを追加 | ボタン押下 → シートに入力 → 保存 → repository の `memos` と「メモ」節の表示 |
| 引用を追加 | 引用タブで入力 → 保存 → `quotes` と表示（書き出しの続きとの順序は createdAt 順） |
| メモ・引用を直す | `メモ <本文>` / `引用 <本文>` を押す → 編集 → 保存 → 表示更新 |
| 削除 | 編集モードで削除 → 表示から消え、入口は残る |
| 他の項目が失われない | 保存後の repository の記録に oneLiner・rating・shelfIds・starters が残る |

`pnpm shots -- reread` で画面を撮り、PR 本文に書く。

## 判断ログ

1. **入口の場所**: 案「『メモ』見出しのあたり」を採用し、見出しの下のメモ行の後ろに点線ボタンを置く。却下: ヘッダーの右に「書く」を足す案（アイコン／文言が増え、デザインにない）、画面下に固定バー（読んでる本の「読み終えた」と紛らわしい）。
2. **メモ 0 件でも見出し「メモ」を出す**: 入口がどこにあるか分かるため。見出しなしでボタンだけにする案は、読んでる本画面の「メモと引用」の流れと離れるので却下。
3. **`dropped` にも出す**: Issue に「読み終わった・途中でやめた本」とある。`planned` だけ除外。
4. **引用の場所は既存のまま**: Issue の指定どおり、新しい節は作らず書き出しの続きと同じ流れ（書いた順）。
5. **デザインにない入口**: `reread.png` に入口はない。Issue の補足どおり `ReadingScreen` と同じ点線ボタンの部品・スタイルで組み、新しいトークン・部品は足さない。ボタンのスタイルは `ReadingScreen` と同じ値をローカルに定義する（共通部品化は今回のスコープ外。重複が増えるなら別 Issue で提案）。
6. **`draftOf` の共通化**: 同じ関数の複製を避けるため `lib/notes.ts` へ移す。`ReadingScreen` の変更はこの置き換えのみで、挙動は変えない。却下: `RereadScreen` にコピー（二重管理になる）。
7. **保存後の遷移はしない**: 読み返す画面に留まり、`setRecord` で再描画する。
