# Issue #143 ISBN を入力する画面で、確定キーを押しても検索されない

## 背景・目的

`IsbnLookupScreen`（ISBN を入力する）の入力欄は `TextField variant="isbn"` で、キーボード側の確定キー（return / 完了 / 検索）を押しても何も起きない。`onSubmitEditing` が未設定のため、「探す」ボタンを別に押す必要がある。タイトル検索画面（`TitleSearchScreen`）は `returnKeyType="search"` + `onSubmitEditing` で検索できるので、ISBN 画面も揃える。

注: Issue 本文は取得できなかったため（`gh issue view` の出力が空）、タイトルから要件を読み取った。

## スコープ

### やること
- ISBN 入力欄で確定キーを押すと、「探す」ボタンと同じ検索（`search()`）が走る
- 確定キーのラベルを検索にする（`returnKeyType="search"`）
- iOS の `number-pad` には確定キーがないため、iOS でも確定キーが出るキーボード種別にする（下の設計）

### やらないこと
- 検索ロジック・文言・見た目の変更
- `RecordForm` の ISBN 欄（手入力フォームの一項目で、検索画面ではない）
- 他画面の入力欄

## 受け入れ条件

- [ ] 有効な ISBN を入力して確定（`submitEditing`）すると `lookupByIsbn` が正規化した ISBN-13 で呼ばれ、見つかれば `/record/new` へ遷移する
- [ ] 不正な ISBN で確定すると「ISBN を正しく入力してください…」のエラーが出て `lookupByIsbn` は呼ばれない
- [ ] 検索中（loading）に確定しても二重に検索されない
- [ ] 入力欄の `returnKeyType` が `search`
- [ ] 「探す」ボタンの動作は変わらない
- [ ] `TextField` の他の利用（既定の `variant`、`reading`）の `onSubmitEditing` / `returnKeyType` は呼び出し側の指定どおり

## 画面・振る舞い

- 確定キー押下 ＝ 「探す」押下。状態遷移（idle → loading → 遷移 / not_found / error / invalid）は同じ
- 「見つかりませんでした」カード表示中でも、入力欄で確定すれば再検索される（`search()` は status に依存しない）
- 入力欄は loading 中 `editable={false}` なので確定は基本発生しないが、`running` ref で二重実行を防いでいる

## 設計

変更ファイル:
- `app/src/screens/IsbnLookupScreen.tsx`: `TextField` に `returnKeyType="search"` と `onSubmitEditing={() => void search()}` を渡す
- `app/src/components/TextField.tsx`: `variant="isbn"` のキーボードを `Platform.select({ ios: 'numbers-and-punctuation', default: 'number-pad' })` にする。`TextInputProps` を `...inputProps` で通しているので、`onSubmitEditing` / `returnKeyType` は既にそのまま渡る（明示指定の `keyboardType` は従来どおり上書き可）
- テスト: `IsbnLookupScreen.test.tsx`、`TextField.test.tsx`

ライブラリ追加なし。

## テスト方針

| 受け入れ条件 | テスト |
|---|---|
| 確定で検索・遷移 | `IsbnLookupScreen.test.tsx`: 入力欄に `fireEvent(input, 'submitEditing')` → provider の呼び出しと `router.replace` を検証 |
| 不正 ISBN | 同上: エラー表示、provider 未呼び出し |
| 二重検索なし | 同上: provider を未解決の Promise にして 2 回 submit → 呼び出し 1 回 |
| returnKeyType | 同上: 入力欄の props |
| 「探す」不変 | 既存テスト |
| TextField | `TextField.test.tsx`: `onSubmitEditing` が呼ばれる。既存の keyboardType テストは Platform に合わせて更新（jest-expo の既定は iOS） |

## 判断ログ

- **確定キーの扱い**: 選んだ案＝`onSubmitEditing` で `search()` を呼ぶ（タイトル検索画面と同じ慣習）。却下＝blur 時に自動検索（意図しない通信が起きる）。
- **iOS の確定キー**: `number-pad` は iOS で return キーが出ない。選んだ案＝iOS だけ `numbers-and-punctuation`（ハイフン入力もでき、return キーが出る）。却下＝`inputAccessoryView` で「探す」バーを足す（部品が増え、デザインシステムにない）、`number-pad` のまま（iOS で直らない）。Android の `number-pad` は IME の確定キーが出るので変えない。
- **TextField 全体ではなく ISBN variant のみ変更**: 他の利用に影響させないため。
- **Issue 本文が取得できなかった**ため、タイトルのみから要件を判断した。実機の再現条件が違えば実装担当は追加で確認すること。
