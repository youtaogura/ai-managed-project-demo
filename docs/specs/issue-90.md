# Issue #90 書き出しの管理（設定）

## 背景・目的

読み終えたときに出す「書き出し」を、自分に合うように選べるようにする。設定から「書き出し」画面を開き、機能のオン・オフ、一度に出す数、書き出しごとのオン・オフ、自分の書き出しの追加・名前変更・削除ができるようにする。#84 で `StarterSettings`・`starterSettingsStore`・`useStarterSettings`・`pickStarters` までは用意済み。この Issue は**設定画面と、設定を編集するロジック**を作る。デザインは `docs/design-system/screens/README.md` の「書き出しの管理」（`starters.png`）、部品は `Toggle` / `Chip` / `Starter`。まだリリースしていないので、保存データの後方互換・移行は考えない。

## スコープ

### やること
- 設定画面（`SettingsScreen`）に「書き出し」の行を追加し、新しいルート `/starters`（`StartersScreen`）を開く。
- `StartersScreen`:
  - 「読み終えたら書き出しを出す」のトグル（`enabled`）。説明文「オフにすると、自由に書く欄だけになります。続きを書くと、ひと続きの文章として残ります」。
  - 「一度に出す数」2・3・5（`Chip` の単一選択）。
  - 「出す書き出し（オンのものからランダムに）」の一覧（明朝・`starter` スタイル）と、それぞれのトグル。先頭は固定の「ひとことで言うと、」＋「固定」の印。オンの見た目でトグルは操作できない。
  - 自分で足したもの（`custom: true`）には「自分で追加」の印。タップで名前の変更・削除のシートを開く。
  - 「＋ 自分の書き出しを追加」（破線の枠のボタン）。シートで文を入力して追加する。入力欄の例文は「例: もう一度読むなら、」。読点で終わる形を勧めるヒントを出す（強制しない）。
  - オフの項目は文字を薄くする（`text-tertiary`）。
- 設定を編集する純粋関数 `lib/starterItems.ts`（追加・名前変更・削除・オン／オフ）。
- 新しい部品 `components/Toggle.tsx`（デザインシステムの `Toggle`）。

### やらないこと
- 読み終えたときに書き出しを出す画面（#86 以降）。ここでは設定が `pickStarters` に反映されることをロジックのテストで確認する。
- 書き出しの並べ替え（ドラッグ）。既定の書き出しの文の変更・削除（既定の 7 つはオン・オフだけ）。
- 保存データの移行、`tokens.ts` / `docs/design-system/` の変更、新しい依存の追加（なし）。

## 受け入れ条件

- [ ] 設定画面に「書き出し」の行があり（値は「オン · 一度に 3 つ」、機能オフなら「オフ」）、押すと `/starters` を開く。
- [ ] 「読み終えたら書き出しを出す」のトグルで `enabled` が切り替わり、`starterSettings.v1` に保存される。オフのとき `pickStarters` は空配列を返す。
- [ ] 一度に出す数 2・3・5 を選ぶと `count` が変わって保存され、選択中の数が `selected` になる。`pickStarters` の返す件数がそれに従う。
- [ ] 一覧に固定の「ひとことで言うと、」（「固定」の印つき）と、既定の 7 つが順に出る。各項目にトグルがあり、切り替えると `enabled` が変わって保存される。オフにした項目は `pickStarters` に出ない。
- [ ] 固定の書き出しのトグルは `disabled` で、押しても何も変わらない。名前変更・削除の導線もない。保存データの `items` に固定の書き出しは入らない。
- [ ] 既定の 7 つ（`custom: false`）にもトグルはあるが、名前の変更・削除はできない（「自分で追加」の印もない）。
- [ ] 「＋ 自分の書き出しを追加」→ 文を入力して「追加する」で、一覧の末尾に `custom: true`・`enabled: true` で追加され、「自分で追加」の印が付く。保存され、`pickStarters` の候補に入る。前後の空白は除く。空・空白だけの文は追加できず、エラー文言「書き出しを入力してください」を出して閉じない。同じ文がすでにあるときは「同じ書き出しがあります」。
- [ ] 自分で足したものをタップすると、名前の変更・削除のシートが開く。名前を変えて保存すると文が変わる（`id`・`enabled` は保たれる）。検証は追加と同じ。
- [ ] 削除は確認のシート（「この書き出しを削除しますか？」「過去に書いた記録の文章は変わりません」）で「削除する」を押したときだけ消える。キャンセルでは消えない。削除した項目は保存され、`pickStarters` に出ない。
- [ ] 書き出しの文を変更・削除・オフにしても、保存済みの記録の `starters[].starter` は変わらない（記録は設定と独立して保存されている。`recordRepository` で確認）。
- [ ] 保存失敗は画面を落とさない（既存の `useStarterSettings` の挙動どおり、握りつぶす）。壊れた保存データでは既定値で表示する。
- [ ] 機能オフのとき、数と一覧は薄くして操作できなくする（`disabled`）のではなく、そのまま編集できる。（判断ログ参照）
- [ ] `Toggle` は `accessibilityRole="switch"`、`accessibilityLabel`、`accessibilityState={{ checked, disabled }}` を持ち、行全体（高さ 52 以上）がタップ領域。
- [ ] `pnpm check` が通り、全体・差分カバレッジの閾値を満たす。

## 画面・振る舞い

`StartersScreen`（ヘッダー「書き出し」、`ScreenHeaderBar` の戻る。`about` / `data` と同じ作り）。上から:

1. 機能のカード（面 `surface-1`、枠 `line`、角丸 `radius-card`）: 左に見出し（`body` 太字）と説明（`micro`）、右に `Toggle`。
2. 「一度に出す数」の行: 左ラベル、右に `ChipGroup`（2・3・5、`compact`）。
3. 小見出し「出す書き出し（オンのものからランダムに）」（`label`、`text-secondary`）。
4. 一覧: 行は `starter` スタイルの文＋右にトグル（行の下に `line` の区切り）。固定は文のあとに「固定」の印（面 `surface-2` の小さなラベル）、自分で追加は「自分で追加」の印。オフの行は文字を `text-tertiary`。自分で追加の行は、文の部分をタップ可能にして `accessibilityLabel`「<文>を編集」にする（トグルは別に操作できる）。
5. 「＋ 自分の書き出しを追加」: 破線の枠、高さ 44 以上、`accessibilityRole="button"`。

シート（`BottomSheet`）:
- 追加／編集（`StarterEditSheet`）: `TextField`（ラベル「書き出し」、プレースホルダ「例: もう一度読むなら、」、ヒント「「、」で終わる形がおすすめです」）、ボタン「追加する」／「保存する」、編集時は「削除する」（`outline` `danger`）。エラーは `TextField` の `error`。
- 削除確認（`StarterDeleteSheet`）: 文を引用して表示。「キャンセル」「削除する」。

状態遷移: 画面は `useStarterSettings()` の `starterSettings` を表示し、`update()` で変更する（楽観的に即反映・保存は直列化済み）。シートの開閉と入力中の文・エラーは画面内の `useState`。ほかの画面に戻ると設定は context に残る。

エラー: 検証エラーはシート内に出して閉じない。保存失敗は握りつぶす（設定は UI の好み）。

文言は日本語でやわらかく（「評価」「問い」は使わない）。

## 設計

### 追加・変更するファイル
- `lib/starterItems.ts`（新規）: 設定の編集用の純粋関数。
  - `validateStarterText(text, items, exceptId?): { ok: true; text: string } | { ok: false; error: string }`（trim、空は「書き出しを入力してください」、`exceptId` 以外との重複は「同じ書き出しがあります」。固定の文 `STARTER_FIXED` との重複も不可）。
  - `addStarterItem(items, text, id): StarterItem[]`（末尾に `custom: true, enabled: true`）。`renameStarterItem(items, id, text)`（`custom` のみ。それ以外は何もしない）、`removeStarterItem(items, id)`（`custom` のみ）、`setStarterItemEnabled(items, id, enabled)`。
  - `starterSummary(settings): string`（設定画面の行の値。「オン · 一度に 3 つ」／「オフ」）。
  - ID は画面側で `starter-custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`（`shelfRepository` と同じ流儀）。関数に注入できるようにして、テストでは固定値を渡す。
- `components/Toggle.tsx`（新規）: `Toggle({ value, onValueChange, label, disabled? })`。51×31（一覧では 44×27）の通り道＋つまみを `View` で描く。オン `ribbon`/`ribbonInk`、オフ `lineStrong`/`surface1`（トークンから）。行全体を `Pressable`（`minHeight: 52`）にしたいときは `ToggleRow`（ラベル＋説明＋スイッチ）を同じファイルに置く。アニメーションは付けない。
- `components/StarterEditSheet.tsx`、`components/StarterDeleteSheet.tsx`（新規）: 上記のシート。
- `screens/StartersScreen.tsx`（新規）、`app/starters.tsx`（新規ルート。`about.tsx` と同じ形）。
- `screens/SettingsScreen.tsx`: 「記録するとき」のカードに「書き出し」行（`SettingsRow`）を追加。`onOpenStarters` を props に足す。`app/(tabs)/settings.tsx` で `router.push('/starters')`。
- `app/_layout.tsx`: 変更なし（`StarterSettingsContextProvider` は #84 で入っている）。`Stack` に追加の指定は不要（`about` と同様に画面側で `headerShown: false`）。

### 状態管理
React の state / context のみ（`useStarterSettings`）。新しいライブラリなし（依存の追加なし）。

### データ構造
変更なし（`StarterSettings` / `StarterItem` は #84 のまま）。固定の書き出しは `items` に含めず、画面が `STARTER_FIXED` を先頭に描く。

## テスト方針

| 受け入れ条件 | テスト |
|---|---|
| 設定の行・遷移・要約 | `screens/__tests__/SettingsScreen.test.tsx`（行の値、`onOpenStarters` 呼び出し）、`lib/__tests__/starterItems.test.ts`（`starterSummary`） |
| トグル・数・追加・変更・削除が保存される | `screens/__tests__/StartersScreen.test.tsx`（メモリ store を `StarterSettingsContextProvider` に渡し、操作後に `store.load()` で確認） |
| `pickStarters` への反映 | `StartersScreen.test.tsx`（操作後の保存値に `pickStarters` を掛ける）、`starterItems.test.ts` |
| 固定はオフ・削除不可 | `StartersScreen.test.tsx`（トグルが `disabled`、編集導線なし）、保存された `items` に固定が無いこと |
| 既定の項目は名前変更・削除不可 | `starterItems.test.ts`（`custom: false` は変わらない）、`StartersScreen.test.tsx` |
| 追加・編集の検証（空・重複・trim） | `starterItems.test.ts`、`StartersScreen.test.tsx`（エラー文言、シートが閉じない） |
| 削除の確認 | `StartersScreen.test.tsx`（キャンセルで残る、削除で消える） |
| 過去の記録の文が変わらない | `lib/__tests__/recordRepository.test.ts` に、記録を保存 → `starterSettingsStore` で項目を変更・削除・オフ → 記録の `starters[].starter` が同じ、を追加（#84 で同等のテストがあれば `StartersScreen` 経由の版に拡張） |
| `Toggle` | `components/__tests__/Toggle.test.tsx`（role・state・`disabled`・押下で `onValueChange`） |
| ルート | `__tests__/starters-route.test.tsx`（`data-routes.test.tsx` と同じ形） |

見た目の確認: 撮影ツールは使えない前提で、表示される要素・文言・状態ごとの出し分け（固定の印、自分で追加の印、オフの薄い文字、機能オフ）を Jest で確認する。使えた場合は `starters.png` と見比べて PR に書く。

## 判断ログ

- **固定の書き出しを `items` に入れない**（採用）／入れて `fixed` フラグを持たせる（却下）: #84 のデータ構造どおり。型や保存データを変えずに、オフにできないことを画面だけで表せる。
- **機能オフのとき数・一覧は操作できるままにする**（採用）／無効化する（却下）: オフの間に先に整えておけるほうが自然で、`disabled` の状態を増やさずに済む。見た目は変えない（薄くするのはオフの項目だけ）。
- **既定の 7 つは名前変更・削除不可、オン・オフのみ**（採用）／すべて編集可（却下）: Issue が「自分で足したものは名前の変更と削除ができる」と限定している。既定の復元手段（リセット）を作らずに済む。
- **名前変更・削除は、自分で追加した行をタップして開くシート**（採用）／行内のボタンを増やす（却下）: 一覧の見た目を `starters.png` に合わせ、タップ領域を確保しやすい。
- **削除は確認のシートを挟む**（採用）: 既存の `DeleteConfirmSheet` と同じ流儀。確認文に「過去に書いた記録の文章は変わりません」を入れ、受け入れ条件を利用者にも伝える。既存の `DeleteConfirmSheet` は記録専用の文言なので、`StarterDeleteSheet` を別に作る。
- **重複する文は追加不可**: 同じ文が並ぶとランダムに選んだときに紛らわしいため。Issue に無いが、エラー文言で理由を伝えられるので採用。強制するのは空と重複だけで、読点で終わるかどうかは強制しない（Issue どおり、例文とヒントで勧めるのみ）。
- **`Toggle` は `Switch`（RN 標準）ではなく自前の部品**: デザインシステムの `Toggle` が色・大きさを指定している（ribbon / line-strong、51×31）。標準の `Switch` は OS ごとの見た目で、`ribbon` の色の指定が iOS / Android で揃わない。トークンの色のみ使い、新しい色は足さない。
- **ID は画面側で生成して純粋関数に渡す**: テストで固定値を使えるようにするため。
- **提案（人間向け）**: 既定の書き出しを復元する「初期の書き出しに戻す」は、必要になれば別 Issue。ここでは作らない。
