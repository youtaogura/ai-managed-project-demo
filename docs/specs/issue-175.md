# Issue #175 「引用として残す」で残すと、書き出しの文が消える

## 背景・目的

書く画面（`WriteScreen` / `Starter`）で書き出しの続きを書き、「引用として残す」をオンにして保存すると、
`buildWriteInput`（`app/src/lib/writeSession.ts`）が `QuoteEntry`（`text` `page` `comment` `createdAt` のみ）として保存する。
`QuoteEntry` には書き出しの文を持つ場所がないので、「〇〇が好きなのは、」のような書き出しが捨てられ、続きだけが残って意味が通らなくなる。
引用にしても書き出しの文を失わないようにする。

## スコープ

やること
- `QuoteEntry` に任意項目 `starter`（書き出しの文。なければ `null`/未設定）を足し、書き出しカードから引用にしたとき保存する
- 引用の表示（`Quote`）で、`starter` があれば本文の上に書き出しの文を出す
- NoteSheet で引用を直す・メモ⇄引用の種類変更をしても `starter` が消えない
- データ検証（`isQuoteEntry`）が `starter` なしの既存データも、あるデータも受け入れる

やらないこと
- 既存の引用データの移行（もともと書き出しは残っていない。`starter` なしのまま表示は従来どおり）
- NoteSheet で書き出しの文を編集する欄の追加
- 書き出しを引用にしない場合（`StarterEntry`）の変更、`docs/design-system/` の変更
- CSV 出力の列追加（現状引用のコメントも出さない場合はそのまま。出しているなら実装時に確認して同じ扱いで足す）

## 受け入れ条件

- [ ] 書き出しカードで「引用として残す」をオンにして保存すると、保存された引用の `starter` が書き出しの文になり、`text` は続き（trim 済み）、`page` は従来どおり
- [ ] 自由記述カード、「引用として残す」オフのカードの保存結果は従来と変わらない（自由記述は `freeTexts`、オフは `starters`）
- [ ] 読み返す画面・読んでる本の画面で、`starter` のある引用は書き出しの文と続きの両方が表示される。`starter` のない引用は従来どおり
- [ ] `starter` のある引用を NoteSheet で直して保存しても `starter` が残る。メモに変えると `starter` は使われない（メモには持ち越さない）。引用に戻しても復活しない
- [ ] `isQuoteEntry` は `starter` が未設定・`null`・文字列を受け入れ、文字列以外（数値など）は拒否する。`starter` なしの保存済みデータ・バックアップが読み込める
- [ ] バックアップの書き出し→読み込みで `starter` が保たれる（`importBackup` が引用をそのまま通すか確認し、落としていたら直す）

## 画面・振る舞い

- 書く画面の操作は変えない。保存時の振り分けだけが変わる
- `Quote` の表示: 引用の線の右に、上から `starter`（`micro` 相当の控えめな文字、`colors.textSecondary`、明朝にしたければ既存の `starter` variant を使う）→ 引用本文（`quote`）→ ページ → コメント。`starter` が空・未設定なら行ごと出さない
- 「引用 <本文>」の `accessibilityLabel` は変えない（既存テストを壊さない）。書き出しがあるときだけ `引用 <書き出し> <本文>` にするかは実装で決めてよいが、既存の label を使うテストは維持する
- エラー時の振る舞いは現状どおり

## 設計

- `app/src/types/record.ts`: `QuoteEntry` に `starter?: string | null` を追加（任意にして既存データと互換）
- `app/src/lib/recordEntries.ts`: `isQuoteEntry` に `value.starter === undefined || isNullableString(value.starter)` を追加
- `app/src/lib/writeSession.ts`（`buildWriteInput`）: 書き出しカード＋`asQuote` のとき `starter: card.starter` を入れる
- `app/src/lib/notes.ts`: `buildEntry` の引用の組み立て・`updateNote` で、元の引用の `starter` を引き継ぐ（同種のまま直すとき）
- `app/src/components/Quote.tsx`: `starter` の表示を追加。色・文字は `tokens.ts` から
- 新しいライブラリは不要

## テスト方針

| 受け入れ条件 | テスト |
|---|---|
| 引用の `starter` 保存・オフ/自由記述は変わらない | `lib/__tests__/writeSession.test.ts`、`screens/__tests__/WriteScreen.test.tsx`（既存の保存テストに `starter` の期待を足す） |
| 表示 | `components/__tests__/Quote.test.tsx`（あり/なし）、`RereadScreen` のテストに 1 件 |
| NoteSheet で直しても残る・メモに変えると使われない | `lib/__tests__/notes.test.ts` |
| ガード | `lib/__tests__/recordEntries.test.ts`（未設定・null・文字列・数値） |
| バックアップ | `importBackup` / `backup` の既存テストに `starter` 付き引用の往復を 1 件 |

## 判断ログ

- **Issue 本文が空でタイトルのみ**: 「書き出しの文が消える」＝引用にしたとき書き出しが保存されない、と解釈した。質問するほどの曖昧さはないと判断
- **案A（採用）`QuoteEntry` に任意の `starter` を足す**: 既存データ・バックアップと互換で、移行不要、変更が小さい。
  却下: 案B `text` に書き出しと続きを連結して保存する（ページ順の表示・引用の線の見た目で書き出しと本文を区別できず、直すと混ざる）／案C 引用にしたカードを `StarterEntry` と `QuoteEntry` の両方に保存する（二重表示になる）／案D `starter` を必須にして移行する（既存データに書き出しがなく意味がない）
- **メモに種類変更したとき `starter` は捨てる**: メモは書き出しの概念を持たないため。引用に戻しても復活しないのは単純さを優先
- **既存の引用の移行はしない**: 失われた書き出しは復元できない
- **`Quote` の書き出し表示は既存の文字スタイルだけ使う**: 新しい色・文字スタイルは足さない（CLAUDE.md のデザインシステム規約）
