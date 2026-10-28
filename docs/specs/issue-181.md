# Issue #181 書き出しを読後メモに作り直す（データとなくす機能）

## 背景・目的

デザインシステム（#180）で「書き出し」を「読後メモ」と「ヒント」に作り直した。
この Issue では**データの形と、なくす機能**を扱う。書く画面・読み返す画面の作り直しは後続の Issue（#182 / #183）で行う。
それまでのあいだ、両画面は新しいデータで最低限表示・保存できるようにする。

## スコープ

やること
- 記録のデータ: `starters`（書き出しと続き）と `freeTexts`（自由記述）を、読後メモ `postReadMemos` の 1 つのリストに置き換える。引用の `starter`（#175）を外す。`oneLiner`（この本をひとことで）はそのまま
- 保存済みデータの移行（`records.schemaVersion` 4）と、前の版（2）のバックアップの読み込み
- 書き出しの設定をなくす（保存・読み込み、設定画面の行、`/starters` の画面とルート、管理の部品、撮影シーン `starters` / `write-selected`）
- 振り返りの「今年いちばん使った書き出し」をなくし、「感想」を読後メモのある本の数にする
- ヒントの一覧（固定・6 種類）と、3 つ選ぶ関数・「ほかのヒント」の関数を `src/lib/hints.ts` に用意する
- 書く画面: 書き出しの設定の代わりにヒントでカードを作る。「引用として残す」とページ欄をなくす。保存は読後メモに足す
- 読み返す画面: 読後メモを書いた順に罫線つきの文章として出す（朱の書き出しの部分はなくす）
- CSV に「読後メモ」の列を足す

やらないこと
- 書く画面・読み返す画面のデザインの作り直し（入力欄 1 つ＋ヒントのボタン、読後メモの段、直すシート）。#182 / #183
- `docs/design-system/` とトークンの変更

## 受け入れ条件

- [ ] 読後メモを追加・保存・読み込みでき、開き直しても保たれる（`WriteScreen.test.tsx`、`recordRepository.test.ts`）
- [ ] バックアップの書き出し・読み込みで読後メモが元に戻る。前の版（2）のファイルも読み込め、書き出しと自由記述は読後メモになり、書き出しの設定は無視する（`backup.test.ts`、`DataScreen.test.tsx`）
- [ ] 端末に保存済みの前の形の記録が、起動時の移行で読後メモの形になる（`recordMigration.test.ts`）
- [ ] 設定画面に「書き出し」の行がなく、`/starters` のルートがない
- [ ] 振り返りに「いちばん使った書き出し」が出ず、「感想」が読後メモのある本の数になる（`review.test.ts`、`ReviewScreen.test.tsx`）
- [ ] ヒントを選ぶ関数: 3 つが「感じたこと」「中身・自分ごと・つながり」「人に勧める」から 1 つずつ。評価が 2.9 以下なら真ん中が「合わなかったとき」。「ほかのヒント」は今のものと重ならない（`hints.test.ts`）
- [ ] 使われなくなったコード・テスト・保存キー（`starterSettings.v1`）が残っていない

## 設計

### データの形

```ts
type PostReadMemo = { id: string; text: string; createdAt: string };
type MediaRecord = {
  // …
  oneLiner: string | null;        // この本をひとことで（読後メモとは別）
  postReadMemos: PostReadMemo[];  // 読後メモ。表示は createdAt の順（同じなら保存の順）
  quotes: QuoteEntry[];           // starter はなくした
  memos: MemoEntry[];
};
```

- 読後メモの本文は、ヒントから入れた部分とユーザーが書いた部分を区別しない（Hint/README）。書く画面のヒントのカードは「ヒント + 続き」を 1 件の本文として保存する
- 型ガード: `isPostReadMemo`（`lib/recordEntries.ts`）。`isStarterEntry` / `isFreeTextEntry` と、`isQuoteEntry` の `starter` は外した

### 保存データの移行（`lib/recordMigration.ts`）

- `CURRENT_SCHEMA_VERSION` を 4 にし、`{ to: 4, run: toPostReadMemos }` を足す
- `toPostReadMemos`（1 件ごと）:
  - 書き出し: 続きが空白だけでなければ、本文 `starter + text.trim()` の読後メモにする（id・createdAt は引き継ぐ）
  - 自由記述: 空白だけでなければ、本文 `text.trim()` の読後メモにする
  - もとからある `postReadMemos`、書き出し、自由記述の順に並べてから createdAt で安定ソートする
  - `starters` / `freeTexts` を消し、引用の `starter` を外す
  - 形が壊れているもの（配列でない・要素が不正）は変えずに返す。これまでどおり読み込みの検査で弾かれる
  - 直すものがなければ同じ値を返す（書き込みが起きない）
- 版 4 への移行で、使わなくなった `starterSettings.v1` を消す（失敗しても移行は続ける）

### バックアップ（`lib/backup.ts`）

- `BackupFile` から `starterSettings` を外し、`BACKUP_VERSION` を 3 にする
- 読み込みは版 2 と 3 を受け付ける（`OLDEST_BACKUP_VERSION = 2`）。記録は検査の前に `toPostReadMemos` を通すので、版 2 のファイルも読後メモの形で読める。`starterSettings` があっても無視する
- 版 4 以上は従来どおり `too_new`、版 1 は `invalid`

### ヒント（`lib/hints.ts`）

- `HINTS`（種類ごとの固定の一覧。`components/Hint/README.md` の表どおり）、`HINT_CATEGORY_LABELS`、`LOW_RATING_MAX = 2.9`
- `pickHints(rating, random)`: 枠は順に「感じたこと」「中身 ∪ 自分ごと ∪ つながり」「人に勧める」。`rating !== null && rating <= 2.9` なら真ん中の枠を「合わなかったとき」にする。各枠から 1 つずつ選ぶ
- `pickOtherHints(current, rating, random)`: 同じ枠で、`current` に含まれないものから選ぶ。枠の中に残りがなければ、その枠は全体から選ぶ（今の一覧では起きないが、一覧が変わっても止まらないように）
- 乱数は引数で差し替えられる（テスト用）

### 書く画面（最低限）

- `WriteCard` を `{ key, kind: 'starter' | 'free', starter, text }` にする（`starterId` `page` `asQuote` をなくす）
- 開いたとき: `createCards(record.rating)` でヒントを 3 つ。「↻ ほかのヒント」で書いていないカードだけ `pickOtherHints` で入れ替える。「自由に書く」はいつも出す
- 下書き（`writeDraft.v1.<id>`）は前の版の形も読む（余分な項目は捨てる）。ヒントのカードがない下書きには、ヒントを選んで前に足す
- 保存: 書いたカードを `postReadMemos` の後ろに足す。「ひとことで言うと、」は従来どおり `oneLiner`

### 読み返す画面（最低限）

- `listPostReadMemos`（`lib/reread.ts`）で空白だけのものを除き、書いた順に `RuledText` + `reading` で出す
- 「書き出しの続きを書く」は「読後メモを書く」にする
- `hasRereadContent` は ひとこと・読後メモ・引用・メモ を見る

### 振り返り・CSV・文言

- `summarizeReview`: `topStarter` をなくし、`impressions` = 期間内に読んだ本のうち、空白でない読後メモが 1 件以上ある本の数
- CSV: 「ひとこと」の次に「読後メモ」の列を足す（書いた順に空行で区切る）
- 画面の「書き出し」（この機能の意味）を「読後メモ」「ヒント」に変える。データの「書き出す」（エクスポート）はそのまま。`forbidden-words.test.tsx` で、エクスポートの意味以外の「書き出し」が画面に出ないことを確かめる

## 判断ログ

| 判断 | 選んだ案 | 却下した案 | 理由 |
|---|---|---|---|
| 読後メモの名前 | `postReadMemos`（`PostReadMemo`） | `afterwords`、`notes` | Issue の例どおり。`memos`（読みながらのメモ）と区別でき、意味がそのまま読める |
| 保存データの移行 | する（版 4、`toPostReadMemos`） | しない（Issue の「移行は考えなくてよい」） | 開発者の端末に実データがあり、移行しないと前の記録がすべて読み込みの検査で捨てられる。移行は小さく、テストで確かめられる |
| 書き出しの読後メモの本文 | `starter + text.trim()`（区切りなし） | 改行で区切る、書き出しを捨てる | 前の読み返す画面が「書き出しと続きを一続きの文章」として出していたのと同じ見え方になる。ヒントから入れた文も区別しない（Hint/README） |
| 空白だけの書き出し・自由記述 | 移行で捨てる | 空の読後メモとして残す | 前の画面でも出していなかった。空の読後メモは読み返す画面で空の罫線になるだけ |
| 引用の `starter` | 移行で外す | 引用の本文の前に足す | 引用の本文は本の文で、書き出しは自分の言葉。混ぜると引用が本の文でなくなる。Issue も外すとしている |
| バックアップの版 | 3 に上げ、2 も読む | 2 のまま | 記録の形が変わったので、前のアプリで新しいファイルを読むと「壊れている」になる。版を上げると「新しいバージョン」と正しく案内できる |
| 書き出しの設定の保存キー | 移行で `starterSettings.v1` を消す | 残す | 受け入れ条件「使われなくなった保存キーが残っていない」 |
| ヒントの数 | `Hint/README.md` の表どおり 21 個 | Issue 本文の「22 個」 | 表を数えると 5+4+4+2+3+3=21。デザインシステムが正本なので表に合わせる。数が違うなら表を直すのは人間の作業 |
| 「ほかのヒント」で枠が尽きたとき | その枠だけ全体から選ぶ | 空にする・例外 | 画面のカードが減らない。今の一覧では起きない |
| 書く画面のカード | `Starter` 部品を残し、引用・ページ欄だけ外す | 今ここで入力欄 1 つ＋ヒントボタンにする | 画面の作り直しは #182。データ側で使わなくなった部分だけ外す |
| `StarterText` 部品 | 消す | 残す | 読み返す画面から使わなくなり、ほかに使う場所がない |
| 消したテスト | 書き出しの設定（`starterSettingsStore` `starterItems` `starterPicker` `useStarterSettings` `StartersScreen` `starters-route`）、`StarterText`、引用の `starter`（`Quote` `notes` `recordGuard`）、「いちばん使った書き出し」（`review` `ReviewScreen`）、設定画面の「書き出し」の行、書く画面の「引用として残す」・書き出しの設定によるカードの数・オフのとき | — | 対象の機能・コードを外したため。書く画面のカード・下書き・保存のテストはヒントと読後メモの形に書き直して残した |
| CSV | 「読後メモ」の列を足す | 足さない | CSV に書き出し・自由記述の列はなかったが、Issue の「書き出し（CSV）を新しいデータの形に合わせる」に従い、感想の本文を表でも見られるようにする |

## テスト方針

| 受け入れ条件 | テスト |
|---|---|
| 読後メモの保存・開き直し | `screens/__tests__/WriteScreen.test.tsx`（保存し、別の repository で読み直す）、`lib/__tests__/writeSession.test.ts`、`lib/__tests__/recordRepository.test.ts` |
| 保存データの移行 | `lib/__tests__/recordMigration.test.ts`（版 3 の記録 → 読後メモ・順序・空の除外・引用の starter・壊れた形・保存キーの削除） |
| バックアップ | `lib/__tests__/backup.test.ts`（往復、版 2 の読み込み、starterSettings の無視）、`screens/__tests__/DataScreen.test.tsx`（画面からの往復と版 2 の読み込み） |
| 設定・ルート | `screens/__tests__/SettingsScreen.test.tsx`（行の一覧）、`/starters` は `src/app/starters.tsx` ごと削除 |
| 振り返り | `lib/__tests__/review.test.ts`、`screens/__tests__/ReviewScreen.test.tsx` |
| ヒント | `lib/__tests__/hints.test.ts`（一覧、枠、低評価、乱数の端、「ほかのヒント」の重なりなし・尽きたとき） |
| 読み返す画面 | `screens/__tests__/RereadScreen.test.tsx`、`lib/__tests__/reread.test.ts` |
| 文言 | `src/__tests__/forbidden-words.test.tsx`（書く画面・読み返す画面・空の本棚を足し、エクスポート以外の「書き出し」を禁止） |
| CSV | `lib/__tests__/csv.test.ts` |

撮影（`pnpm shots`）: 書く画面・読み返す画面は後続の Issue で作り直すため、この Issue では画像との見比べはしない。シードとシーンは新しいデータの形に直し、`scenes.test.ts` でアプリの読み込みを通ることを確かめる。
