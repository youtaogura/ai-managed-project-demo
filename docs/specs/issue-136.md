# Issue #136 本を編集して保存すると、ステータスに関係なく読み返す画面に移る

## 背景・目的
編集画面（`/record/<id>`、`RecordFormScreen` の編集モード）は保存後に `router.back()` で戻る。
そのため、開いた経路によっては古い画面（たとえば読み返す画面）が残り、保存でステータスを変えても
ステータスに合わない画面に移る。保存後のステータスに合う画面へ `replace` で移るようにする。

## スコープ
やること
- 編集して保存したあと、保存後のステータスに合う画面へ `router.replace` で移る（`recordHref` を使う。本棚で背表紙を押したときと同じ）
  - 読んでる（`in_progress`）→ `/reading/<id>`
  - それ以外 → `/records/<id>`
- 新規登録後の遷移は今のまま（すでに `recordHref` + `replace`）

やらないこと
- 削除後の遷移（`/` へ replace）、`recordHref` の規則、ほかの画面の変更
- 日付まわり（#135 で対応済み）

## 受け入れ条件
- [ ] 読み終わった本を「読んでる」にして保存すると `router.replace('/reading/<id>')` が呼ばれる
- [ ] 読んでる本を何も変えずに保存すると `router.replace('/reading/<id>')` が呼ばれる
- [ ] 読んでる以外（読み終わった・読みたい等）の本を保存すると `router.replace('/records/<id>')` が呼ばれる
- [ ] 編集の保存で `router.back()` は呼ばれない
- [ ] 新規登録の保存後は従来どおり、登録した本のステータスに合う画面へ `replace` される
- [ ] 保存に失敗したとき（更新対象が見つからない等）は遷移しない（既存の `RecordForm` のエラー表示のまま）

## 画面・振る舞い
編集フォームで「保存する」→ `repository.update` 成功 → 更新後のレコードのステータスで遷移先を決めて `replace`。
失敗時は今までどおりフォームにエラーを出して留まる。

## 設計
- 変更: `app/src/screens/RecordFormScreen.tsx`
  - 新規登録側と同様に、`onSubmit` で `repository.update` の戻り値（更新後のレコード）を `useRef` に保持
  - `onSaved` で `router.replace(recordHref(updated))`。ref が null のときは何もしない
- 変更: `app/src/screens/__tests__/RecordFormScreen.test.tsx`（既存の `router.back` を期待するテストを置き換える）
- 新規依存なし

## テスト方針
`RecordFormScreen.test.tsx`（Jest + Testing Library、既存のモック方式を踏襲）
- 受け入れ条件 1〜4: 編集モードで、ステータスを変えて/変えずに保存し、`router.replace` の引数と `router.back` 未呼び出しを検証
- 受け入れ条件 5: 既存の新規登録テストが通ること（なければ追加）
- 受け入れ条件 6: `update` が失敗（null）のとき `replace` が呼ばれないこと

## 判断ログ
- 遷移先の決定: 保存後のレコード（`update` の戻り値）のステータスを使う。却下案: フォームの入力値を使う → 保存結果と食い違う可能性があるため。
- `router.back()` を `replace` に変える: Issue の期待（古い画面を残さない）に従う。却下案: `back()` のまま遷移先だけ補正 → 履歴が残る。
- ルーティング規則は既存の `recordHref` を再利用し、新しい関数は作らない。
