# Issue #86 自分で本棚を作り、本を複数の本棚に入れられるようにする

## 背景・目的

「すべての本」とは別に、自分で本棚（SF、哲学、いつか読み返す など）を作り、1 冊を複数の本棚に入れられるようにする（タグ方式）。データ（`Shelf`、`MediaRecord.shelfIds`、`shelfRepository`、`deleteShelf`、バックアップ対応）は #84 で用意済み。本棚の画面の `ShelfChips` と「＋ 本棚を作る」の口は #85 で用意済み（押しても何も起きない）。この Issue でそれらをつなぎ、作成・選択・本の振り分け・管理の UI を作る。デザインは `docs/design-system/screens/README.md` の「本棚」「本棚を作る」「本棚を選ぶ」（`shelf-new.png`、`shelf-pick.png`）、部品 `Chip`・`BottomSheet`・`Button`・`TextField`。未リリースのため保存データの後方互換・移行は考えない。

## スコープ

### やること
- 本棚の画面（`RecordsScreen`）で、チップから本棚を切り替える。選んだ本棚の本だけを棚に並べる。ステータスの絞り込みと組み合わせる。
- 「＋ 本棚を作る」で、名前を入れる `ShelfCreateSheet`（例のチップ付き）を開き、作る。同じ名前は作れない。
- 本棚を選ぶ `ShelfPickSheet`（チェックで複数選択、各本棚の冊数、シートの中から新規作成、主ボタン「N つの本棚に入れる」）。開く場所は次の 2 つ。
  - 本の画面: 読んでる本・読み返すはまだ無いので、今の詳細画面（`RecordDetailScreen`）に「本棚」の行を足し、そこから開く。画面ができたら同じ部品をつなぐ。
  - 本の登録・編集（`RecordForm`）: 「本棚」の行から開く。
- 設定の「本棚の管理」（新しいルート `/shelves`、`ShelvesScreen`）: 名前の変更、並べ替え、削除（本は消えない。確認のシートを出す）。
- 本棚の名前の検証（空・長すぎ・重複）を `shelfRepository` と UI の両方で行う。

### やらないこと
- 本棚の共有・公開。
- 読んでる本・読み返す画面の作り直し（#87 以降）。本の登録フォームの見た目の作り直し（#87）。
- 本棚ごとの色・アイコン、本棚の入れ子。
- `tokens.ts` / `docs/design-system/` の変更、新しい依存の追加（なし）。

## 受け入れ条件

### 本棚の名前（`lib/shelfName.ts`、`shelfRepository`）
- [ ] `validateShelfName(name, shelves, exceptId?)` は、前後の空白を除いた名前を返す。空・空白だけは「本棚の名前を入力してください」、21 文字以上は「本棚の名前は 20 文字までです」、既存の本棚と同じ名前は「同じ名前の本棚があります」、予約語「すべての本」は「その名前は使えません」。重複の比較は前後の空白を除き、全角英数を半角にそろえ（NFKC）、大文字小文字を区別しない。`exceptId` の本棚自身との一致は重複にしない（名前の変更で同じ名前のまま保存できる）。
- [ ] `shelfRepository.create` / `rename` も同じ検証を行い、違反は `ValidationError`（上と同じ文言）で reject する。保存は変わらない。
- [ ] 同じ名前の本棚は作れない（Jest: repository と `ShelfCreateSheet`）。

### 本棚の切り替え（`RecordsScreen` / `ShelfChips`）
- [ ] 本棚を作ると、チップの行の「すべての本」の後ろ、「＋ 本棚を作る」の前に、作成順（`order`）で出る。作った直後はその本棚が選択される。
- [ ] チップを押すと選択が移り（`accessibilityState.selected`）、その本棚（`shelfIds` に ID を含む本）だけが棚に並ぶ。「すべての本」を押すと全冊に戻る。初期値は「すべての本」。選択は保存しない。
- [ ] 1 冊が複数の本棚に入っていれば、どの本棚を選んでもその本が出る。
- [ ] ステータスのタブと組み合わせられる（本棚 × ステータス）。タブの件数は選択中の本棚の中で数える（「すべての本」のときは全記録）。見出しの「<全冊数> 冊 · 今年読んだ <n> 冊」は、本棚の選択に影響されず全記録のまま。
- [ ] 選んだ本棚 × ステータスが 0 冊のとき、「この状態の本はまだありません」。選んだ本棚に 1 冊も入っていないときは「この本棚にはまだ本がありません」。
- [ ] 選択中の本棚が（管理画面で）削除されたあと画面に戻ると、「すべての本」に戻る。本は「すべての本」に出る。
- [ ] 画面に戻るたび（`useFocusEffect`）本棚を読み直す。読み込み失敗は本棚 0 件として扱い、落ちない。
- [ ] 本が 1 冊もなくても本棚は作れる（`EmptyState` の画面にチップの行は出さない。#85 の挙動のまま）。→ 本が 0 冊のときは本棚の UI を出さない。
- [ ] 「＋ 本棚を作る」を押すと `ShelfCreateSheet` が開く。`RecordsScreen` の `onCreateShelf` props は外す（画面の中で完結する）。

### 本棚を作るシート（`ShelfCreateSheet`）
- [ ] 見出し「本棚を作る」、名前の入力欄（明朝、`TextField`）、例のチップ「SF」「哲学」「いつか読み返す」「仕事の本」。チップを押すと名前の欄に入る（上書き）。すでにある名前のチップは出さない。主ボタン「作る」。
- [ ] 「作る」で `onSubmit(name)` を呼ぶ。検証エラーは入力欄の下に出してシートを閉じない。成功したら閉じる。保存に失敗したら「保存できませんでした。もう一度お試しください」を出して閉じない。
- [ ] シートを閉じて開き直すと、入力欄とエラーは空に戻る。

### 本棚を選ぶシート（`ShelfPickSheet`）
- [ ] 見出し「本棚を選ぶ」。本棚の行ごとにチェック（`accessibilityRole="checkbox"`、`accessibilityState.checked`）、名前、冊数（その本棚に入っている記録の数。`countShelfRecords`）。「すべての本」は行に出さず、説明「「すべての本」にはいつも入ります」を出す。
- [ ] 初期のチェックは `selectedIds`。行を押すと切り替わる。主ボタンは「N つの本棚に入れる」（N = チェック数）。N が 0 のときは「本棚に入れない」。押すと `onSubmit(ids)`（`shelves` の並び順の ID 配列）を呼んで閉じる。
- [ ] 本棚が 0 件のとき、案内「まだ本棚がありません」と「＋ 本棚を作る」だけを出す。
- [ ] 「＋ 本棚を作る」（行の末尾）でシート内に名前入力（`ShelfCreateSheet` を重ねて開く）。作ると一覧に増え、チェックが入った状態になる（`onCreate(name)` は作った `Shelf` を返す Promise）。
- [ ] 閉じて開き直すとチェックは `selectedIds` に戻る（キャンセルでは何も保存しない）。

### 本の画面・登録フォームからの振り分け
- [ ] `RecordDetailScreen` に「本棚」の行（入っている本棚の名前を「、」でつなぐ。無ければ「まだ入れていません」）。押すと `ShelfPickSheet` が開き、「N つの本棚に入れる」で `recordRepository.update` により `shelfIds` が保存され、行の表示が更新される。ほかの項目は変わらない。保存失敗は「保存できませんでした」を出して画面は落ちない。
- [ ] `RecordForm`（登録・編集）に「本棚」の行（同じ表示）。押すと `ShelfPickSheet`。選んだ ID はフォームの値（`RecordFormValues.shelfIds`）として持ち、「保存」で `NewRecordInput.shelfIds` に入る。編集のとき初期値は記録の `shelfIds`。存在しない本棚の ID は表示に出さず、シートのチェックにも入れない。
- [ ] 1 冊を複数の本棚に入れて保存すると、どの本棚を選んでも棚に出る（Jest: 保存 → 画面で切り替え）。

### 本棚の管理（`/shelves`、`ShelvesScreen`）
- [ ] 設定画面に「本棚」のカードと「本棚の管理」の行（値は「<N> つ」、0 件なら「まだありません」）。押すと `/shelves` を開く。
- [ ] 一覧は `order` 順に、名前と冊数。0 件のときは案内「まだ本棚がありません」。
- [ ] 名前の変更: 行の「名前を変える」（`accessibilityLabel` は「<名前>の名前を変える」）で `ShelfRenameSheet`（`ShelfCreateSheet` と同じ作りで、初期値は今の名前、主ボタン「保存する」）。検証は作成と同じ（自分自身の名前のままは可）。保存後、一覧とチップの表示が変わる。
- [ ] 並べ替え: 各行に「上へ」「下へ」ボタン（`accessibilityLabel`「<名前>を上へ」「<名前>を下へ」）。先頭の「上へ」と末尾の「下へ」は `disabled`。押すと `shelfRepository.reorder` で保存され、一覧と本棚の画面のチップが同じ順になる。
- [ ] 削除: 行の「削除」（`accessibilityLabel`「<名前>を削除」）で確認のシート「この本棚を削除しますか？」「「<名前>」を削除します。中の本は消えず、「すべての本」には残ります」。「削除する」を押したときだけ `deleteShelf` で消える（記録の `shelfIds` からも外れる）。「キャンセル」では何も変わらない。
- [ ] 一覧に「＋ 本棚を作る」（点線の枠のボタン）を置き、`ShelfCreateSheet` で作れる。
- [ ] 保存・削除の失敗は画面を落とさず、シートにエラー文言を出す（作成・変更は「保存できませんでした。もう一度お試しください」、削除は「削除できませんでした。もう一度お試しください」）。

### 削除後の整合
- [ ] 本棚を削除しても本は残り、「すべての本」には出る（Jest: `deleteShelf` の既存テストに加え、画面で確認）。

## 画面・振る舞い

### 本棚の画面
#85 の構成のまま、チップの行を次のようにする。
`[すべての本] [SF] [哲学] … [＋ 本棚を作る]`（横スクロール）。選択中は `accent` の面・`accentInk` の文字、ほかは `lineStrong` の実線、「＋ 本棚を作る」は点線。チップはすべて `Pressable`（`accessibilityRole="button"`、選択中は `selected: true`、高さ 36 + `hitSlop` で 44 以上）。名前が長いときはチップの中で 1 行に切る（`numberOfLines={1}`、最大幅 160）。

状態: `selectedShelfId: string | null`（null = すべての本）、`filter: StatusFilter`、`createOpen: boolean`。表示する本 = `sortRecords(filterByStatus(inShelf(records, selectedShelfId), filter), order)`。タブの件数 = `countByStatus(inShelf(records, selectedShelfId))`。選択中の ID が本棚の一覧に無いときは、描画上 null として扱う（state を書き換えず、導出する）。

### 本棚を作るシート
`BottomSheet`。上から: 名前（`TextField`、明朝の値。ラベル「名前」、`placeholder`「例: SF」）、「例」のラベルと例のチップ（`Chip` 部品の見た目の小さなボタン。折り返し）、主ボタン「作る」。エラーは `TextField` の `error`。入力が 1 文字でもあれば、エラーは次の入力で消える。

### 本棚を選ぶシート
`BottomSheet`。上から: 見出し「本棚を選ぶ」、説明（「すべての本」にはいつも入ります）、本棚の行（チェック・名前・冊数。行全体が `size.touchMin` 以上のタップ領域）、「＋ 本棚を作る」（点線）、主ボタン。チェックの印は `View` で描く（新しい依存を足さない）。

### 本棚の管理
`ScreenHeaderBar`（タイトル「本棚の管理」、戻る）と一覧。1 行 = 名前・冊数と、「名前を変える」「上へ」「下へ」「削除」の 4 つの操作（アイコンだけにせず、小さな文字ボタン。すべて 44px 以上のタップ領域）。画面を離れて戻るたびに読み直す。

### エラー・端のケース
- 本棚の読み込み失敗（`getAll` が reject）は空配列として扱う。
- 本が参照する `shelfIds` に存在しない ID が残っていても落ちない（表示・冊数・チップに出さない）。
- 本棚の作成・並べ替えが同時に走っても、`shelfRepository` の内部キューで直列化される（既存）。画面側は処理中に主ボタンを `disabled` にして二重送信を避ける。

## 設計

### 追加・変更するファイル
- `src/lib/shelfName.ts`（新規）: `SHELF_NAME_MAX = 20`、`RESERVED_SHELF_NAME = 'すべての本'`、`validateShelfName(name, shelves, exceptId?): { ok: true; name: string } | { ok: false; error: string }`、エラー文言の定数。`SHELF_NAME_EXAMPLES`（SF・哲学・いつか読み返す・仕事の本）もここ。
- `src/lib/shelfRepository.ts`: `create` / `rename` で `validateShelfName` を呼び、違反は `ValidationError`。（`validName` は置き換える。`create` は検証のために `load` した結果を使うので、検証は `serialize` の中で行う。）
- `src/lib/shelfSelectors.ts`（新規）: `recordsInShelf(records, shelfId | null)`、`countShelfRecords(records, shelves): Record<string, number>`（存在する本棚の ID だけ数える）、`shelfNames(record, shelves): string[]`（`shelves` の順、存在しない ID は除く）、`moveShelf(ids, id, direction)`（並べ替え用の純関数）。
- `src/hooks/useShelves.ts`（新規）: `useShelves()` → `{ shelves, reload, loading }`。`useFocusEffect` で `useShelfRepository().getAll()` を読む。失敗は `[]`。
- `src/components/ShelfChips.tsx`: `selectedId?: string | null`、`onSelect?: (id: string | null) => void` を追加。`shelves` は #85 の口を使う。`onCreateShelf` は維持。
- `src/components/ShelfCreateSheet.tsx`（新規）: props `visible`、`shelves`（重複・例の絞り込み用）、`title?`（既定「本棚を作る」）、`initialName?`、`submitLabel?`（既定「作る」）、`exceptId?`、`onSubmit(name): Promise<void>`、`onClose`。名前変更にも使う（`ShelfRenameSheet` は作らず、これを props 違いで使う。判断ログ 5）。
- `src/components/ShelfPickSheet.tsx`（新規）: props `visible`、`shelves`、`counts`、`selectedIds`、`onSubmit(ids: string[]): void | Promise<void>`、`onCreate(name): Promise<Shelf>`、`onClose`。
- `src/components/ShelfRow.tsx`（新規、必要なら）: 管理画面の 1 行。
- `src/screens/RecordsScreen.tsx`: `useShelves` と `useShelfRepository` を使う。`onCreateShelf` props は削除し、`ShelfCreateSheet` を持つ。作成後は `reload` して新しい本棚を選択。
- `src/screens/ShelvesScreen.tsx`（新規）、`src/app/shelves.tsx`（新規。`headerShown: false` の Stack、`starters.tsx` と同じ形）、`src/app/_layout.tsx` に必要ならルートを足す（既存の `starters` の登録に合わせる）。
- `src/screens/SettingsScreen.tsx`: 「本棚」の `SettingsCard` と「本棚の管理」の行。`onOpenShelves` props を追加（既定は何もしない）。`src/app/(tabs)/settings.tsx` で `router.push('/shelves')`。
- `src/screens/RecordDetailScreen.tsx`: 「本棚」の行と `ShelfPickSheet`。保存は `repository.update(id, toInput(...))`（既存の `toInput` を使い `shelfIds` だけ差し替える）。
- `src/components/RecordForm.tsx`・`src/lib/recordForm.ts`: `RecordFormValues.shelfIds: string[]` を追加。`createFormValues`・`toNewRecordInput` で受け渡し（今 `carried.shelfIds` で引き継いでいる箇所を `values.shelfIds` に置き換える）。「本棚」の行は `RecordInfoSection` 等の既存の並びに合わせて、レーティングの前に置く。
- 追加済みの `deleteShelf`（`lib/deleteShelf.ts`）を管理画面から使う。依存は `useRecordRepository` と `useShelfRepository`。

### データ構造
追加の保存データなし。`Shelf = { id, name, order }`（`shelves.v1`）と `MediaRecord.shelfIds` を使う。本棚 → 記録の向きの保持はしない（`shelfIds` が正）。

### 状態管理
React の state と既存の Provider（`ShelfRepositoryProvider`、`RecordRepositoryProvider`）のみ。選択中の本棚は `RecordsScreen` の `useState`。新しいライブラリなし。

### デザイン値
色・余白・角丸は `tokens.ts` から。チェックの印・チップの高さ 36・最大幅 160 などトークンに無い寸法はファイル内の局所定数にする（色は足さない）。デザインシステムに無い部品が必要な場合は作らず、判断ログに提案を書く。

## テスト方針

| 受け入れ条件 | テスト |
|---|---|
| 名前の検証（空・長さ・重複・NFKC・予約語・自分自身） | `lib/__tests__/shelfName.test.ts` |
| repository の `create` / `rename` の重複拒否と保存が変わらないこと | `lib/__tests__/shelfRepository.test.ts`（既存に追加） |
| 絞り込み・冊数・名前の導出・並べ替え | `lib/__tests__/shelfSelectors.test.ts` |
| 本棚の読み込み・失敗で `[]` | `hooks/__tests__/useShelves.test.tsx` |
| チップの表示順・選択・作成の口 | `components/__tests__/ShelfChips.test.tsx`（既存を更新） |
| 作るシート: 例のチップ・重複エラー・保存失敗・開き直し | `components/__tests__/ShelfCreateSheet.test.tsx` |
| 選ぶシート: チェック・冊数・ボタン文言・0 件・シート内で作る・キャンセル | `components/__tests__/ShelfPickSheet.test.tsx` |
| 切り替えで本が絞られる・複数の本棚・ステータスとの組み合わせ・件数・見出し不変・空の案内・削除後の「すべて」 | `screens/__tests__/RecordsScreen.test.tsx`（既存に追加。`createShelfRepository` + メモリのストレージ） |
| 本の画面の「本棚」の行と保存 | `screens/__tests__/RecordDetailScreen.test.tsx`（既存に追加） |
| フォームの「本棚」の行・保存で `shelfIds` が入る・初期値・存在しない ID | `components/__tests__/RecordForm.test.tsx`、`lib/__tests__/recordForm.test.ts`（既存に追加） |
| 管理画面: 一覧・名前変更・並べ替え・削除（確認・キャンセル）・作成・エラー | `screens/__tests__/ShelvesScreen.test.tsx` |
| 設定の「本棚の管理」の行 | `screens/__tests__/SettingsScreen.test.tsx`（既存に追加） |
| ルート | `src/__tests__/shelves-route.test.tsx`（`starters-route.test.tsx` に倣う） |
| 本棚の名前の変更・並べ替えがチップに反映 | `RecordsScreen.test.tsx`（管理画面で変更した状態のストレージを渡して再描画）または `ShelvesScreen` と同じストレージを共有する結合テスト |

見た目の確認: 撮影ツールが使えれば `shelf-new.png`・`shelf-pick.png` と見比べて PR に書く。使えなければその旨を書き、要素・文言・状態の出し分けを Jest で確認する。

## 判断ログ

1. **本棚の画面ごとのタブ件数**: 選択中の本棚の中で数える。却下: 常に全記録で数える（本棚を選んだのに「読んだ 12」と出て、押すと 3 冊しか出ないのは誤解を生む）。見出しの冊数は #85 のとおり全記録（棚全体の積み上がりを示す）。
2. **選択の保存**: 保存しない。理由: ステータスの絞り込み（#85 判断ログ 10）と同じ扱いで、デザインにも記述が無い。選択中の本棚が消えたときの扱いを単純にできる。
3. **本の画面の入口**: 読んでる本・読み返す画面がまだ無いので、今の詳細画面に「本棚」の行を足す。却下: 入口を作らず部品だけ作る（受け入れ条件を画面から検証できない）、ここで読み返す画面を作る（スコープ外・#87 以降）。部品（`ShelfPickSheet`）を独立させ、後続の画面から同じ props でつなげるようにする。
4. **登録・編集フォームの入口**: デザインの `Chip` 複数選択ではなく、「本棚」の行から `ShelfPickSheet` を開く。却下: `ChipGroup` を複数選択に拡張する（`ChipGroup` は radio 専用で、#87 でフォームごと作り替えるため手戻りが大きい）。シートなら冊数・新規作成も同じ部品で足りる。#87 でチップに変える場合も `shelfIds` の受け渡し（`RecordFormValues.shelfIds`）はそのまま使える。
5. **名前の変更シート**: `ShelfCreateSheet` を props（`title`、`initialName`、`submitLabel`、`exceptId`）違いで使い回す。却下: 別部品にする（ほぼ同じ見た目・検証で重複する）。
6. **名前の重複判定**: 前後の空白を除き、NFKC で正規化し、大文字小文字を区別しない。却下: 完全一致のみ（「ＳＦ」と「SF」が別の本棚になる）。上限 20 文字、予約語「すべての本」は Issue に無いが、チップの行で「すべての本」と見分けがつかなくなるため決めた。
7. **並べ替えの操作**: 「上へ」「下へ」のボタン。却下: ドラッグ（依存が要る、テストしづらい、アクセシビリティで劣る）。ほかの画面（書き出し #90）もドラッグはやらない方針。
8. **管理画面の置き場所**: 設定に「本棚」のカードを足し、「本棚の管理」の行を置く（デザインの設定の構成。並び順の行はこのカードに入る予定だが、今の並び順の入口は本棚の画面の「並び替え」ボタンなので、この Issue では動かさない）。
9. **`onCreateShelf` props の削除**: 画面の中でシートを持つ。却下: ルートからシートを開く（状態が画面の外に出て、作成後の選択と読み直しがつなげにくい）。#85 のテストのうち `onCreateShelf` を検証するものは「シートが開く」に更新する（テストの削除ではなく置き換え。PR 本文の判断ログに書く）。
10. **本が 0 冊のときの本棚の UI**: 出さない（#85 の `EmptyState` のまま）。本棚の作成は、本を 1 冊入れてから、または設定の管理画面から。却下: 0 冊でもチップを出す（デザインの「本棚（本がない）」に無い）。
11. **同名チェックの二重化**: UI は事前に `validateShelfName` で確認して即座にエラーを出し、repository でも拒否する（別経路や競合でも守る）。repository の `ValidationError` は UI がそのまま文言として出す。
12. **本を消したときの冊数**: `shelfIds` が正で、冊数は毎回数え直す。本棚側に ID の配列を持たない（二重管理による不整合を避ける）。
