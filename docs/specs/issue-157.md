# Issue #157 メモ・引用を書くシートを開いたら、本文の入力欄にフォーカスする

## 背景・目的

「＋ メモ・引用を書く」でシート（`NoteSheet`）を開いても入力欄にフォーカスが当たらず、本文の欄をもう一度押さないと書き始められない。
開いたらすぐ書き始められるよう、本文の欄にフォーカスしてキーボードを出す。

## スコープ

やること
- `NoteSheet` が開いたら、シートが出る動きのあとに本文の欄（`accessibilityLabel="本文"`）にフォーカスする（新規・編集の両方）
- 「メモ」「引用」タブを切り替えても本文の欄からフォーカスが外れないようにする
- 入力が主目的のほかのシートの確認（下の判断ログ）

やらないこと
- ページ欄・ひとこと欄へのフォーカス
- `BottomSheet` の見た目・キーボード回避（#109）の変更
- 新しいライブラリの追加（なし）

## 受け入れ条件

- [ ] 新規でシートを開くと、本文の入力欄にフォーカスが当たる（`focus()` が呼ばれる／`onFocus` が発火する）
- [ ] フォーカスはシートが出る動き（`SLIDE_DURATION`）のあとに当たる。動きの途中（タイマーを進める前）には当たらない
- [ ] 下書きの読み込み（`ready` になる前）は本文の欄が無いので、読み込み後に欄が出てからフォーカスする
- [ ] 編集モード（`editing` あり）で開いても、本文の欄にフォーカスし、カーソルは末尾にある
- [ ] 「メモ」⇄「引用」を切り替えても、本文の欄は同じ入力欄のままで（再生成されず）フォーカスが外れない。切り替えのあとも本文の欄がフォーカス中である
- [ ] 削除確認の画面から「キャンセル」で戻ったときも、本文の欄にフォーカスし直す
- [ ] シートを閉じて開き直すと、もう一度フォーカスする
- [ ] 既存の挙動（下書き保存、保存・削除、エラー表示、`BottomSheet` のキーボード回避）が変わらない（既存テストが通る）

## 画面・振る舞い

1. シートが開く → スライドイン（250ms）
2. 動きが終わったら本文の欄にフォーカス → キーボードが出る
3. 編集で開いた場合は、既存の本文の末尾にカーソル
4. タブ切り替え時はフォーカスを維持。引用では本文の左に朱の線が付くが、入力欄は同じものを使い続ける
5. フォーカスに失敗しても（ref が無いなど）何も起きない。エラー表示はしない

## 設計

変更ファイル
- `app/src/components/NoteSheet.tsx`
- `app/src/components/BottomSheet.tsx`（`SLIDE_DURATION` を export するだけ。挙動は変えない）
- `app/src/components/__tests__/NoteSheet.test.tsx`

`NoteSheet.tsx`
- `FocusInput` を `forwardRef` にするか `inputRef` prop を受けて `TextInput` に渡す（React 19 なら `ref` を props で受けてよい。既存の React バージョンに合わせる）
- `Form` で `bodyRef = useRef<TextInput>(null)` を持ち、`useEffect` で「`ready` かつ `!confirming`」のとき `setTimeout(() => bodyRef.current?.focus(), SLIDE_DURATION)`、クリーンアップで `clearTimeout`。依存は `[ready, confirming]`
  - `Form` は `visible` のときだけ描画されるので、開き直すたびにマウントされ再フォーカスする
  - `autoFocus` は使わない（動きの途中で当たって表示が崩れる・キーボードが閉じるのを避ける）
- カーソルを末尾に: 編集モードのとき、初回だけ `selection={{ start: n, end: n }}` を渡し、`onSelectionChange` か最初の `onFocus` のあとで `undefined` に戻す（以降はユーザーが動かせる）。`n = editing.text.length`。実機で確実に末尾に出ない場合は、`focus()` の直後に `setSelection` 相当の初期 selection で補う
- タブ切り替えでフォーカスが外れる原因: `FocusInput` は `leading` があると `<View>` で包み、無いと `TextInput` 単体を返すため、メモ⇄引用で木構造が変わり `TextInput` が作り直される。常に同じ構造（`<View>` で包み、`leading` が無いときは線を描かない）にして再生成を防ぐ。念のため `draft.kind` の変更時に `bodyRef.current?.focus()` も呼ぶ（本文の欄がすでにフォーカス中なら何もしない）
  - ほかの `FocusInput`（ページ・ひとこと）の見た目は変えない。ラッパーは本文の欄だけに付ける（`leading` を使う本文用に、`wrap` のような指定を足してもよい）
- キーボード回避は `BottomSheet` の `KeyboardAvoidingView` のまま。変更しない

## テスト方針

`NoteSheet.test.tsx` に追加（`jest.useFakeTimers()`、`SLIDE_DURATION` 分 `act(() => jest.advanceTimersByTime(...))`）。フォーカスの確認は、本文の欄の `onFocus` 発火、または `TextInput.prototype.focus` の spy で行う。

| 受け入れ条件 | テスト |
|---|---|
| 新規で本文にフォーカス／動きのあと | 開いて、タイマーを進める前は未フォーカス、進めたあと本文の欄にフォーカス |
| 下書き読み込み後 | 下書きありのストアで開き、読み込み後に本文の欄にフォーカス |
| 編集でフォーカスと末尾 | `editing` ありで開き、本文の欄にフォーカス、selection が末尾 |
| タブ切り替えで外れない | フォーカス後に「引用」「メモ」を押し、本文の欄が同じ要素のままフォーカス中（`unmount` されていない） |
| 削除確認から戻る | 編集で「削除」→「キャンセル」のあと、本文の欄にフォーカス |
| 開き直しで再フォーカス | `visible` を false→true にして再度フォーカス |
| 既存挙動 | 既存の `NoteSheet` / `BottomSheet` テストが通る |

## 判断ログ

- **フォーカスの当て方**: `autoFocus` ではなく、動きのあとに `focus()` を呼ぶ。理由: Issue が「動きの途中で当てない」を求めているため。却下: `autoFocus`（`ShelfCreateSheet` などは使っているが、Modal のスライド中にキーボードが出て崩れる懸念がある）。`BottomSheet` に「表示完了」コールバックを足す案も却下（影響範囲が広い。`SLIDE_DURATION` を共有すれば足りる）
- **編集のときもフォーカスする**: する。理由: 直すために開いたので、すぐ書き換えられるほうが自然。Issue も「する」を第一案にしている。カーソルは末尾
- **フォーカス先は本文**: ページ欄は任意なので本文にする（Issue どおり）
- **ほかのシート**: `ShelfCreateSheet`（名前）と `StarterEditSheet`（書き出し）はすでに `autoFocus` がある。入力が主目的でない・選択中心のシート（`AddSheet`、`ShelfPickSheet`、`DatePickerSheet`、`StatusDefaultSheet`、`DeleteConfirmSheet`、`DeleteAllSheet`）は対象外。この Issue では変更しない。`autoFocus` を動きのあとに揃える変更が必要なら別 Issue で提案する
- **タブ切り替えの対策**: 入力欄の再生成を防ぐ（構造を揃える）ことを主、`focus()` の再呼び出しを保険にする。却下: 再生成を許して毎回 `focus()` だけで済ませる案（キーボードが一瞬閉じてちらつく）
- **削除確認から戻ったとき**: 本文の欄が作り直されるため、再度フォーカスする
