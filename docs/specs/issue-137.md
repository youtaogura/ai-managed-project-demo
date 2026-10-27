# Issue #137 読みたい本を読み始める操作がない

## 背景・目的

「読みたい」の本を本棚で押すと「読み返す」画面（`RereadScreen`）が開くが、タイトル・作者・本棚しか出ず、読み始める入口がない。読み始めるには「編集」でステータスを変えるしかない。
読みたい本の画面に主ボタン「読み始める」を置き、押すとステータスを「読んでる」・読み始めた日を今日にして「読んでる本」画面（`ReadingScreen`）へ移す。

## スコープ

やること
- `RereadScreen` で、ステータスが `planned` の本に、案内文と主ボタン「読み始める」を出す
- ステータスが `dropped` の本に、同じ動きの「もう一度読む」を出す（判断ログ 1）
- ボタンを押すと保存し、`/reading/<id>` へ `replace` で移る
- 保存に失敗したらエラーを出し、画面に留まる

やらないこと
- `completed` の読み返す画面の変更（見た目・文言とも今のまま）
- `ReadingScreen` の変更、遷移ルール（`recordHref`）の変更
- 新しい色・部品・トークンの追加、新規ライブラリ

## 受け入れ条件

- [ ] `planned` の本を開くと「読み始める」ボタンと短い案内文が出る
- [ ] 「読み始める」を押すと、保存された記録が `status: 'in_progress'`、`startDate` が今日、`endDate` が `null` になり、`onStart(id)` が呼ばれる
- [ ] `dropped` の本を開くと「もう一度読む」が出る。押すと同じく `in_progress`・`startDate` が今日・`endDate` が `null` になり `onStart` が呼ばれる
- [ ] `completed` の本には「読み始める」「もう一度読む」が出ない。既存の表示・テストは変わらない
- [ ] `in_progress` の本は `RereadScreen` を経由しない（`recordHref`）ので影響なし
- [ ] 保存が失敗すると「保存できませんでした。もう一度お試しください」が出て `onStart` は呼ばれず、ボタンは再度押せる
- [ ] 保存中はボタンが無効で二重に押せない
- [ ] 保存時に、メモ・引用・書き出しなど他の項目が失われない
- [ ] ルート `app/records/[id].tsx` が `onStart` で `router.replace('/reading/<id>')` する

## 画面・振る舞い

`planned` / `dropped` のとき、上部（戻る・編集、タイトル、作者・日付、ひとこと、評価）は今のまま。本文が空のときの `completed` 用ガイドと同じ位置に、次のブロックを出す。

| ステータス | 案内文 | ボタン |
|---|---|---|
| 読みたい | 「読み始めると、読んでる本の画面に移って、読みながらメモや引用を残せます」 | 読み始める |
| 途中でやめた | 「もう一度読み始めると、読んでる本の画面に移ります」 | もう一度読む |

- ボタンは `Button`（主ボタン）。案内文は `AppText variant="body"`、`textSecondary`（既存のガイドと同じ）
- 書き出し・メモなどの本文がすでにある本でも、同じブロックを本文の下・本棚行の上に出す（本文の有無で出し分けない）
- 押下: 保存中は `disabled`。成功で `triggerImpactHaptic()`（`ReadingScreen` の「読み終えた」と同じ）→ `onStart(id)`
- 失敗: ボタンの上に `colors.danger` でエラー文を出し、`disabled` を戻す
- 日付ルールは #135 に合わせる（`in_progress` は終えた日を空にする）

## 設計

変更ファイル
- `app/src/screens/RereadScreen.tsx` … `onStart?: (id: string) => void` を追加。`start()` を実装（`repository.update(recordId, { ...recordToInput(record, record.memos, record.quotes), status: 'in_progress', startDate: todayString(), endDate: null })`）。`starting` / `error` を state で持つ。`planned` / `dropped` のとき上記ブロックを描画
- `app/src/app/records/[id].tsx` … `onStart={(id) => router.replace(`/reading/${id}`)}`
- `app/src/lib/statusLabel.ts`（任意）… 案内文・ボタン文言は定数として画面内に置いてよい。分けるなら `getStartAction(status)` のような小関数にする
- テスト: `screens/__tests__/RereadScreen.test.tsx`（既存の配置・ヘルパーに合わせる）

`todayString` は `lib/recordForm`、`recordToInput` は `lib/notes`、`triggerImpactHaptic` は `lib/haptics`（いずれも既存）。`recordToInput` が他の項目を引き継ぐことを確認すること。データ構造の変更はなし。UI の文言は日本語、`docs/design-system/README.md` の「書き方」に従う（「評価」「問い」などを使わない。`forbidden-words.test.tsx` を通す）。

## テスト方針

- 受け入れ条件 1〜4・6〜8 → `RereadScreen` の Testing Library テスト（インメモリのリポジトリで、ボタンの有無、押下後の保存内容、`onStart` 呼び出し、他項目の保持、失敗時の表示を確認。失敗は `update` を reject させる）
- 二重押し防止 → 保存を保留にしてボタンが `disabled` になることを確認
- 5 は `recordRoute` の既存テストで確認済みなので追加不要
- 9 → 既存のルートテストの流儀があればそれに合わせる。なければ画面側のコールバックの呼び出しで代える

## 判断ログ

1. **途中でやめた本に「もう一度読む」を出すか**
   - 選んだ案: 出す。動きは「読み始める」と同じ（`in_progress`・開始日は今日・終えた日は空）。
   - 却下案: 出さない（「編集」に頼る状態が `dropped` に残る）。
   - 理由: 読んでいない状態から読み始める点は同じで、実装も共通。ボタン文言だけ、読み直しとわかる形にする。
2. **読み始めた日の扱い**: `dropped` から再開するときも、以前の日付は残さず今日にする。再び読み始めた日が、いまの「読んでる」の意味に合うため。#135 の「読んでる → 終えた日は空」とも整合する。
3. **画面の置き場所**: 新しい画面は作らず `RereadScreen` に足す（Issue の「読み返す画面の上部を使い、空の本文の代わりに案内と主ボタン」に従う）。`planned` の本は書き出しなどの本文を持つことがあるため、本文の有無によらず同じブロックを出す。
4. **遷移**: `router.replace('/reading/<id>')`。戻るで読み返す画面に戻れないようにして、`ReadingScreen` の `onFinished` と同じ流儀にする。
5. **ハプティクス**: 状態が変わる操作なので `ReadingScreen` の「読み終えた」と同じく成功時に鳴らす。
6. **デザイン**: 読みたい本の画面の画像はない。既存の `Button`・`AppText` とトークンだけで組み、足りない部品はなかった。提案なし。
