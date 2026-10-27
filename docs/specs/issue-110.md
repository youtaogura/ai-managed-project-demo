# Issue #110 本棚から本を選んだときに、前のデザインの詳細画面が出る

## 背景・目的

本棚で本を選ぶと、書斎のデザインではなく前の詳細画面が出るという報告。デザインでは、読んでる本は「読んでる本」（`reading.png`、`ReadingScreen`）、それ以外は「読み返す」（`reread.png`、`RereadScreen`）を開く。

### 調査結果（最新の main `f8178fc` で確認）
- 前のデザインの詳細画面のコード（`RecordDetailScreen`、`InfoCell`、`RecordInfoSection`、`infoCellLabels`、`recordInfo`、`heroColor`）は `app/src` に**残っていない**（#91 で削除済み。`grep` で確認）。ルート `app/records/[id].tsx` は `RereadScreen` を出す。
- 本棚（`(tabs)/index.tsx`）のタップ先は正しい（読んでる本 → `/reading/<id>`、それ以外 → `/records/<id>`）。**本棚からは再現しない**。報告は #91 のマージ（10/27 02:28）より前のビルドで見たものと考えられる。
- 一方、本を開く入口のうち、状態を見ずに遷移先を決めているものがある（読んでる本でも読み返す画面が開く）:
  - 振り返り `(tabs)/analytics.tsx` の `onOpenRecord`: 常に `/records/<id>`。
  - 本の登録後 `RecordFormScreen`（新規）の `onSaved`: 常に `/records/<id>`。「読んでる」で登録した直後も読み返す画面になる。
- 遷移先の決め方が入口ごとに別々に書かれていて、`(tabs)/index.tsx` のコメントも「今の詳細画面」と古いまま。

## スコープ

### やること
- 本を開く遷移先を決める関数 `recordHref(record)`（`lib/recordRoute.ts`）を作り、入口をすべてこれに揃える。`in_progress` → `/reading/<id>`、それ以外 → `/records/<id>`。
- 入口: 本棚（`(tabs)/index.tsx`）、振り返りのお気に入り（`(tabs)/analytics.tsx`）、本の登録後（`RecordFormScreen`）。
- 書き出しの続きを書いたあと（`write/[id].tsx`）は読み終えた本の画面なので `/records/<id>` のまま（`WriteScreen` は completed のときだけ使われる。変えない。理由は判断ログ）。
- `(tabs)/index.tsx` の古いコメントを直す。
- テスト用のルート対応表の変数名 `RecordDetailRoute`（`finished-write-route` / `tabs` / `reading-route` / `records-routes` / `headers` の各テスト）を `RereadRoute` に改名する（古い画面名が残らないように）。
- 古い詳細画面の残りがないことを確かめるテスト（下記）。

### やらないこと
- 新しい依存の追加（なし）。`tokens.ts` / `docs/design-system/` の変更。
- `ReadingScreen` / `RereadScreen` の中身の変更。
- 「編集」のあとの遷移（`router.back()`）、削除後（`/`）の変更。

## 受け入れ条件

- [ ] `recordHref` が `in_progress` で `/reading/<id>`、`completed`・`want_to_read`・`abandoned` など他の状態で `/records/<id>` を返す（Jest）。
- [ ] 本棚で読んでる本をタップすると「読んでる本」、読み終えた・読みたい・途中でやめた本をタップすると「読み返す」が開く（Jest。`tabs.test.tsx` に状態ごとのケースを追加）。
- [ ] 本棚を絞り込んだ状態でも同じ遷移になる（Jest）。
- [ ] 振り返りの「今年のお気に入り」の本をタップしたとき、読み終えた本は「読み返す」、読んでる本は「読んでる本」が開く（Jest）。
- [ ] 本を新規登録して保存したあと、状態が「読んでる」なら「読んでる本」、それ以外なら「読み返す」が開く（Jest）。
- [ ] 書き出しの続きを保存したあと「読み返す」が開く（既存テストが通る）。
- [ ] 前のデザインの詳細画面のコードが残っていない: `RecordDetailScreen` `InfoCell` `RecordInfoSection` `infoCellLabels` `recordInfo` `heroColor` が `app/src` のどこにも出てこない（Jest。ソースを読んで確かめるテスト、または `grep` での確認を PR 本文に書く）。
- [ ] `pnpm check` が通る。

## 画面・振る舞い

画面の見た目は変えない。遷移だけを揃える。記録が見つからないときは遷移先の画面側で「本が見つかりません」が出る（既存）。

## 設計

- 新規 `app/src/lib/recordRoute.ts`: `export function recordHref(record: Pick<MediaRecord, 'id' | 'status'>): string`。
  戻り値は既存の `router.push(\`/reading/${id}\`)` と同じ文字列形式（expo-router の型付きルートに合わせて必要なら `Href` を使う。実装時に `tsc` で確認）。
- 変更: `app/src/app/(tabs)/index.tsx`、`app/src/app/(tabs)/analytics.tsx`（`onOpenRecord` は id だけ渡されている。`RecordsScreen` / 振り返りの画面が record を渡せるか確認し、渡せなければ `onOpenRecord` を `(record) => void` に変えるか、id から状態を引く。実装担当が既存コードに合う方を選び、判断ログに書く）、`app/src/screens/RecordFormScreen.tsx`（`repository.add` の戻り値の `status` を保持して `recordHref` で遷移）。
- テストの変更: `__tests__/` の上記 5 ファイルの改名、`lib/__tests__/recordRoute.test.ts` 新規、`tabs.test.tsx`・振り返り・`RecordFormScreen` のテストにケース追加。

## テスト方針

| 受け入れ条件 | テスト |
|---|---|
| `recordHref` の出し分け | `lib/__tests__/recordRoute.test.ts` |
| 本棚・絞り込み | `__tests__/tabs.test.tsx` |
| 振り返りのお気に入り | `__tests__/tabs.test.tsx`（振り返りタブ）または analytics のルートテスト |
| 登録後の遷移 | `screens/__tests__/RecordFormScreen.test.tsx` または `records-routes.test.tsx` |
| 古いコードが残っていない | 実装時に `grep` を実行し、結果を PR 本文に書く（必要ならテストにする） |

## 判断ログ

- **再現するか**: 最新の main の本棚からは再現しない。#91 より前のビルドが原因と判断した（ルートも画面も差し替え済みで、古い画面のコードは存在しない）。実機で古い画面が出る場合は、古いビルドの可能性が高い。
- **やること**: 古いコードの削除は不要（すでにない）。代わりに、同じ誤りが起きうる入口（振り返り・登録後）を直し、遷移先の決め方を 1 か所にまとめる。
  - 却下: 何もせず「再現しない」で終える案。振り返りと登録後で読んでる本が読み返す画面に行く実害があるため。
  - 却下: `/records/[id]` 側で `in_progress` なら `/reading/<id>` にリダイレクトする案。ルートが二重に判断することになり、戻る操作の履歴も増える。入口で正しく選ぶほうが単純。
- **書き出しの続きのあと**: `WriteScreen` は completed の本だけに出る入口（`status === 'completed'` のとき）なので `/records/<id>` 固定のままにする。
- **テスト名の改名**: 挙動に影響せず、古い画面名を残さないための整理。テストの削除・弱体化はしない。
