# Issue #109 シートの入力欄がキーボードで隠れる

## 背景・目的

下から出るシート（`BottomSheet`）の中の入力欄にフォーカスすると、ソフトウェアキーボードが入力欄と主ボタンを覆ってしまう。`BottomSheet` は `Modal`（透明）の中で画面下端に固定されており、キーボード回避が入っていない。`NoteSheet` だけが中身を個別に `KeyboardAvoidingView` で包んでいる（iOS のみ `padding`、Android は何もしない）。
`BottomSheet` 側で一括して対応し、入力欄のあるシートすべて（`ShelfCreateSheet`、`ShelfPickSheet` 内の新規作成、`StarterEditSheet`、`NoteSheet` など）でキーボードを開いても入力欄と主ボタンが見えるようにする。

## スコープ

### やること
- `BottomSheet` の `Modal` 内のレイアウトを `KeyboardAvoidingView`（`behavior="padding"`、iOS・Android 共通）で包み、シート本体がキーボードの上に載るようにする。
- シートの背が高くなりすぎないよう、シート本体に最大高さ（画面高さ − キーボード回避後の余白を考慮した割合）を設け、中身は `ScrollView`（`keyboardShouldPersistTaps="handled"`）で縦にスクロールできるようにする。つまみ・見出し・「閉じる」ボタンは固定、`children` をスクロール領域に入れる。
- `NoteSheet` の個別の `KeyboardAvoidingView` を外す（`BottomSheet` に一本化）。`NoteSheet` 内の `ScrollView` が二重にならないよう整理する。
- Android の設定を確認する。`app/app.json` の `android.softwareKeyboardLayoutMode` は未指定（既定 `resize`）。`Modal` 内は Activity の resize が効かない（edge-to-edge）ため、アプリ側の `KeyboardAvoidingView` で対応し、`app.json` は変更しない（判断ログ参照）。
- キーボードを開いたまま主ボタンが押せる: スクロール領域に `keyboardShouldPersistTaps="handled"` を付け、1 回目のタップがキーボードを閉じるだけで終わらないようにする。

### やらないこと
- 各シート個別のキーボード対応の追加（`BottomSheet` に集約する）。
- `BottomSheet` の見た目（色・角丸・スワイプで閉じる動き）の変更。
- 新しい依存の追加（なし。`react-native-keyboard-controller` 等は使わない）。
- `WriteScreen`（画面）の既存の `KeyboardAvoidingView` の変更。

## 受け入れ条件

- [ ] `BottomSheet` の中身が `KeyboardAvoidingView`（testID `bottom-sheet-keyboard-avoiding`）で包まれ、`behavior` が `padding`（iOS・Android 両方）である。
- [ ] `BottomSheet` の `children` が `keyboardShouldPersistTaps="handled"` の `ScrollView`（testID `bottom-sheet-scroll`）内に描画される。
- [ ] 見出し・つまみ・「閉じる」ボタン（`showCloseButton`）は従来どおり表示され、scrim タップ・閉じる・戻る・下スワイプで `onClose` が呼ばれる（既存テストが通る）。
- [ ] `ShelfCreateSheet` で名前を入力して「作る」を押すと本棚が作られる（キーボード回避の部品の中でも操作できる）。`StarterEditSheet` でも入力・保存ができる。
- [ ] `NoteSheet` は個別の `KeyboardAvoidingView` を持たず（`NoteSheet` 単体のレンダーに含まれない）、`BottomSheet` 経由でキーボード回避される。入力・保存・削除確認の操作は従来どおり。
- [ ] `visible=false` では何も描画しない（従来どおり）。
- [ ] 実機（iOS / Android）で確認できなかった点は PR 本文に書く。

## 画面・振る舞い

- キーボードが出ると、シートはキーボードの上端に張り付いて持ち上がる。シートが画面に収まらないときは、`children` の領域がスクロールし、フォーカス中の入力欄と主ボタンに届く。
- キーボードを閉じる（背面タップ・「完了」）と元の位置に戻る。scrim タップ・戻る・スワイプは今までどおりシートを閉じる。
- エラー時の振る舞いに変更なし。

## 設計

変更ファイル:
- `app/src/components/BottomSheet.tsx`: `root` の `View` 内、`sheet` を `KeyboardAvoidingView`（`style={styles.root}` ではなく root 自体を `KeyboardAvoidingView` に置換。`behavior="padding"`、`testID="bottom-sheet-keyboard-avoiding"`）で包む。scrim は絶対配置のため `KeyboardAvoidingView` の外に出さず、root と同階層の兄弟として保つ（`root` を `View` のまま、その中の `justifyContent: 'flex-end'` 領域を `KeyboardAvoidingView` にする構造でもよい。実装時に scrim がキーボード分も覆うことを確認）。
  `children` を `ScrollView`（`testID="bottom-sheet-scroll"`、`keyboardShouldPersistTaps="handled"`、`bounces={false}`、`style={{ flexGrow: 0 }}`）に入れる。`sheet` に `maxHeight: '90%'` を付ける。
- `app/src/components/NoteSheet.tsx`: `KeyboardAvoidingView` と import の `Platform` / `KeyboardAvoidingView`（不要になれば）を外し、内側の `ScrollView` は `BottomSheet` 側のスクロールに任せて通常の `View`（`contentContainerStyle` の `form` スタイルを移す）に置き換える。
- `app/src/components/__tests__/BottomSheet.test.tsx`、`ShelfCreateSheet` / `StarterEditSheet` / `NoteSheet` の既存テストを更新・追加。
- `app/app.json` は変更しない。

状態管理・データ構造の変更なし。

## テスト方針

| 受け入れ条件 | テスト |
|---|---|
| KeyboardAvoidingView で包まれる・`padding` | `BottomSheet.test.tsx`: `getByTestId('bottom-sheet-keyboard-avoiding')` の `behavior`。`Platform.OS` を `ios` / `android` に切り替えて両方確認 |
| children が `ScrollView` 内・`keyboardShouldPersistTaps` | `BottomSheet.test.tsx`: `bottom-sheet-scroll` の props と、子要素がその内側にあること |
| 閉じる操作が従来どおり | `BottomSheet.test.tsx` の既存ケース |
| 入力→作成 | `ShelfCreateSheet` / `StarterEditSheet` の既存テストで通ること。なければ入力→ボタン押下を追加 |
| NoteSheet の整理 | `NoteSheet` の既存テスト（入力・保存・削除確認）が通ること。`BottomSheet` 内に描画して確認 |
| 実機の見え方 | Jest では不可。PR 本文に「未確認」と書く |

## 判断ログ

- **`BottomSheet` に集約（採用）** / 各シートで個別に対応（却下）: Issue の希望どおり。入力欄のあるシートが多く、追加時の漏れも防げる。
- **`KeyboardAvoidingView` `behavior="padding"` を両 OS で使う（採用）** / Android は何もしない・`height`（却下）: SDK の edge-to-edge 下では `Modal` 内で `adjustResize` が効かないことがあり、アプリ側で回避する必要がある。`height` はシートの高さが縮み、`padding` のほうが下端固定のレイアウトと相性が良い。
- **`app.json` の `softwareKeyboardLayoutMode` は変更せず（採用）**: 既定の `resize` のまま。`app.json` 変更はビルド設定の変更になり、ネイティブ再生成が必要。コード側の回避で足りる想定。実機で不十分なら PR に記載して別 Issue で扱う。
- **ライブラリ追加なし（採用）** / `react-native-keyboard-controller`（却下）: 標準部品で足り、依存追加の審査コストが見合わない。
- **中身を `ScrollView` に入れて `maxHeight: 90%`（採用）**: 小さい画面・大きなキーボード・文字拡大で、シートが画面を超えると主ボタンに届かないため。固定フッターにはせず、「閉じる」ボタンのみ固定。
- **`keyboardShouldPersistTaps="handled"`（採用）**: キーボードを開いたまま主ボタンを 1 回のタップで押せるようにする（受け入れ条件）。
- 新しい依存・色・部品の追加なし。
