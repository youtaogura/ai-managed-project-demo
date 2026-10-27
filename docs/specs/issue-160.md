# Issue #160 戻るときも、進むときと同じ右から左への動きになる

## 背景・目的

本棚から本を開いて左上の「‹」で戻ると、`router.replace('/')` で本棚を積み直すため、戻っているのに右から左へ入ってくる（進む動き）。
戻る操作を戻る動き（前の画面が左から右へ戻ってくる）にし、あわせて履歴に同じ本の画面が残らないようにする。

## スコープ

やること
- 「本棚へ戻る」意味の操作を、`replace` ではなく `back` / `dismissTo` にする。対象:
  - `src/app/reading/[id].tsx` の `onBack`
  - `src/app/records/[id].tsx` の `onBack`
  - `src/app/finished/[id].tsx` の `onLater`
  - `src/app/write/[id].tsx` の `onLater`
  - `src/screens/RecordFormScreen.tsx` の `onDeleted`
- 編集の保存後（`RecordFormScreen` の更新時 `onSaved`）に、編集画面を履歴に残さず、保存前に開いていた本の画面へ戻る形にする（本棚 → 本 → 編集 → 保存 → 本 → 「‹」で本棚）。
- iOS の端スワイプ・Android の戻るボタンの行き先が「‹」と同じになることを、履歴の作り方で担保する（専用のハンドラは足さない）。

やらないこと
- 進む操作（`push`）や、フロー内で次の画面へ置き換える `replace`（読み始める、読み終えた→書く、書く→保存、追加フローの各画面）は変えない。
- 画面遷移アニメーションの独自設定（`animation` オプション）は足さない。
- 新規追加フロー（`record/new` 保存後の `replace(recordHref)`）は変えない。

## 受け入れ条件

- [ ] 本棚 → 本（`/records/:id`）→「‹」で、`router.back()` により本棚へ戻る（履歴に積み直さない）。読み中の本（`/reading/:id`）も同様。
- [ ] 履歴がない（直接開いた・ディープリンク）とき、「‹」は `router.dismissTo('/')` で本棚へ向かう。
- [ ] 本棚 → 本 → 編集 → 保存 → 本 → 「‹」で本棚へ戻る（編集の画面にも、保存前の同じ本の画面にも戻らない）。
- [ ] 本棚 → 本 → 編集 → 削除 のあと、本棚へ戻る動きで戻り、戻る操作で削除した本の画面や編集画面に戻らない。
- [ ] 本棚 → 読み中 → 読み終えた（`/finished/:id`）→「あとで」で本棚へ戻る動きになり、戻る操作で `/reading/:id`・`/finished/:id` に戻らない。
- [ ] 「読み終えた → 記録を書く → ここまでを残す」の途中の画面（`/finished/:id`、`/write/:id`）が履歴に残らない（保存後に戻る操作をしても途中の画面に戻らない）。
- [ ] 書く画面（`/write/:id`）の「あとで」: 再読（`from=reread`）で履歴があれば `back()`、それ以外は `dismissTo('/')`。
- [ ] 上記の呼び分け（`back` / `dismissTo` / `replace`）を Jest で確認する。
- [ ] `pnpm check` が通る。

## 画面・振る舞い

方針（`replace` と `dismissTo` の使い分け）
- **戻る意味の操作**（「‹」「あとで」「削除後」）: 戻る動きにする。
  - 履歴があり、直前の画面が行き先として正しいとき → `router.back()`
  - 履歴がない、または直前が不適切（途中の画面が残っている）とき → `router.dismissTo('/')`
- **次へ進む意味の操作で、元の画面を履歴に残したくないとき**: `router.replace(...)`（既存のまま）。
- **「同じ本の別状態の画面へ移るが、間にある画面は履歴に残したくない」とき**（編集保存）: `router.dismissTo(href)`。同じパスが履歴にあればそこまで戻り、なければ push 相当の動きになる。

画面ごとの扱い
- 本（`records/[id]`）・読み中（`reading/[id]`）の `onBack`: `router.canGoBack() ? router.back() : router.dismissTo('/')`。タブ（振り返りなど）から開いた場合も開いた元に戻れる。
- 読み終えた（`finished/[id]`）の `onLater`: 読み中画面は `replace` で置き換わっているので、履歴は [本棚, finished]。`router.canGoBack() ? router.back() : router.dismissTo('/')`。
- 書く（`write/[id]`）の `onLater`: 再読から開いたときは `canGoBack` なら `back()`、それ以外は `dismissTo('/')`。読み終えた直後（`finished` から `replace` で来た）の履歴は [本棚, write] なので `dismissTo('/')`（`back()` でも同じだが、行き先を明示する）。
- 書く画面の保存後 `replace('/records/:id')` は変えない。再読から来た場合、履歴は [本棚, records/:id, records/:id(新)] になり、戻ると同じ本に戻る。→ 再読から来た保存は `dismissTo('/records/:id')` にして、既存の同じ本の画面まで戻る（`fromReread` のときだけ）。
- 編集（`RecordFormScreen` 更新時）の `onSaved`: `router.dismissTo(recordHref(updated))`。履歴 [本棚, 本, 編集] → [本棚, 本]。保存で状態が変わり行き先のパスが変わった場合（読み中 ⇄ 本）は履歴に同じパスがないため push 相当になる（[本棚, 旧, 新]）。この場合に旧画面へ戻ってしまわないよう、実装時に実際の挙動を `renderRouter` で確認し、必要なら `dismissTo('/')` したうえで新画面を開く、または `replace` にするなど、同じ本の画面が重ならない方を選び判断ログに残す。
- 削除後 `onDeleted`: 履歴 [本棚, 本, 編集] から本棚へ戻る動き → `router.dismissTo('/')`。
- 新規追加（`record/new`）は対象外。

エラー時: 遷移 API は例外を投げない前提で、特別な処理はしない。

## 設計

- 変更ファイル: 上記スコープのルートファイル 4 つ（`reading/[id].tsx` `records/[id].tsx` `finished/[id].tsx` `write/[id].tsx`）と `src/screens/RecordFormScreen.tsx`。
- 共通化: 同じ式が 3 か所以上に出るので `src/lib/navigation.ts` に `goBackOrHome(router)` を置く（`router.canGoBack() ? router.back() : router.dismissTo('/')`）。引数は `Pick<Router, 'canGoBack' | 'back' | 'dismissTo'>` 相当の型。`RecordFormScreen` はモジュールの `router` を直接 import しているので、同じ形で渡す。
- 新しい依存・状態・データ構造はなし。`dismissTo` は expo-router 58 に存在する（`router.dismissTo(href)`）。

## テスト方針

- `src/lib/__tests__/navigation.test.ts`: `goBackOrHome` が `canGoBack` の真偽で `back` / `dismissTo('/')` を呼び分ける。
- 既存の route テスト（`src/__tests__/records-routes.test.tsx` `reading-route.test.tsx` `finished-write-route.test.tsx`）と `RecordFormScreen.test.tsx` の `router.replace` 前提のアサーションを新しい呼び出しに更新する（`router.dismissTo` をモックに足す）。
- 実ルーターの `renderRouter` で履歴を検証する（アニメーションは見られないが、履歴は検証できる）:
  - 本棚 → 本 →「‹」→ 本棚、`router.canGoBack()` が偽になる / 戻る操作で本に戻らない（受け入れ条件 1・3）
  - 本棚 → 本 → 編集 → 保存 → 本 →「‹」→ 本棚（条件 3）
  - 本棚 → 本 → 編集 → 削除 → 本棚（条件 4）
  - 本棚 → 読み中 → 読み終えた →「あとで」→ 本棚、読み終えた → 書く → 保存 のあと途中の画面に戻らない（条件 5・6）
  - 直接 `/records/:id` を開いて「‹」→ 本棚（条件 2）
- 実機での動き（戻る動きになるか、端スワイプ・Android 戻るボタン）は確認できた範囲を PR に書く。

## 判断ログ

- **「‹」を常に `dismissTo('/')` にする案**: 却下。振り返りタブなど本棚以外から開いた画面でも本棚タブへ飛んでしまう。`canGoBack` なら `back()`、なければ `dismissTo('/')` を採用（Issue の提案どおり）。
- **`router.back()` のみにする案**: 却下。直接開いたとき `canGoBack` が偽で何も起きない。
- **編集保存を `back()` にする案**: 却下。保存失敗時の扱いや、`/record/new` の流れ（追加後は `replace`）と混ざるため、行き先を明示できる `dismissTo(href)` を採用。状態が変わりパスが変わる場合は実装時に実挙動を見て決める（上記）。
- **途中の画面（`finished` `write`）**: 履歴に残さないため、フロー内の進む操作は既存の `replace` のままにして、戻る側だけを変える。
- **共通ヘルパー**: 3 か所以上で同じ式になるため `goBackOrHome` を新設。却下案: 各ルートに直書き（重複・テスト分散）。
