# Issue #42 【画面】本・漫画を探す（カメラの許可・バーコード・ISBN・タイトル検索）を新デザインにする

## 背景・目的

本・漫画は、バーコード・ISBN・タイトルで書誌情報を探して記録する。この「探す」流れの 4 画面（カメラの許可 / バーコード読み取り / ISBN 入力（＋見つかりませんでした）/ タイトル検索）を、`docs/design-system/screens/README.md` の「本・漫画を探す」（`scan-permission.png` `scan.png` `isbn.png` `isbn-not-found.png` `title-search.png`）に合わせる。見つからなかったときも、迷わず手入力へ進めるようにする。
#35〜#37 で基盤と基本部品（`Button` `TextField` `AppText` `TextCover` `Cover` `EmptyState` 等）が入っている。

### 現状（コード上の事実）
- 画面は `screens/BarcodeScanScreen.tsx` / `IsbnLookupScreen.tsx` / `TitleSearchScreen.tsx`。いずれも旧 `theme.ts`（`colors` `formColors` `spacing`）と素の `Pressable` / `TextInput` / `Text` で組まれている。
- ルートは `app/record/scan.tsx` `isbn.tsx` `search.tsx`。**Stack のネイティブヘッダー**（`Stack.Screen options={{ title }}`）でタイトルと戻るを出している。デザインは画面内に「閉じる（丸ボタン）」とタイトルを持つ作りなので、ネイティブヘッダーは使わない（判断ログ 1）。
- 書誌取得の仕組み（`useBookLookup` / `useBookSearch` Provider、`lib/isbn.ts` `lib/barcode.ts` `lib/isbnLookupParams.ts` `lib/candidateParams.ts`）は変えない。
- 「見つかりませんでした」は現状、スキャン画面と ISBN 画面がそれぞれ自前で表示している。デザインは ISBN 画面の状態として 1 つだけ描いている（判断ログ 2）。
- `useBottomInset()` はあるが、上端のセーフエリアを返すフックはまだない。アイコンライブラリは未導入（`Button variant="icon"` に文字の子要素を渡す方式が既存。`EmptyState` の「＋」と同じ）。
- Expo SDK 58（`expo-camera ~58.0.12`）。実装前に `app/AGENTS.md` の指示どおり、`https://docs.expo.dev/versions/v58.0.0/sdk/camera/` で `CameraView` の `enableTorch` / `onCameraReady` / 権限 API を確認すること。
- 撮影ツール `orchestrator/tools/ui-preview` はこの工程の作業ツリーに存在しない（`orchestrator/tools` ディレクトリなし）。実装担当は再確認し、無ければ PR 本文にその旨を書く。

## スコープ

### やること
1. カメラの許可画面を新デザインにする（未判定 / 許可を求める / 拒否済み / Web の 4 表示）。
2. バーコード読み取り画面を新デザインにする（全画面カメラ・枠の外を暗く・白い枠と読み取り線・説明・上部バー・ライト・下に「ISBN を手入力する」）。
3. ISBN 入力画面を新デザインにする（大きな入力欄・ヒント・「探す」・「バーコードで読み取る」・骨組みカード・「再試行」）。
4. 「見つかりませんでした」を ISBN 画面の状態として新デザインで出す。スキャンで見つからなかったときも同じ表示へ移る。
5. タイトル検索画面を新デザインにする（検索欄＋「検索」、件数、結果の行、固定フッター）。
6. 3 画面共通の「上部バー」部品（閉じる丸ボタン＋タイトル）と、上端のセーフエリアを返す `useTopInset()` を追加する。
7. 既存テストを新しい文言・構成に合わせて更新し（テスト数は減らさない）、新しい部品・状態のテストを足す。

### やらないこと
- 書誌情報の取得元の変更・追加、Provider の変更。映画・ドラマ・アニメの検索。
- 入口（追加シートなど, #39）の変更。**各画面への今のルート（`/record/scan` `/record/isbn` `/record/search`）と、記録を追加へ渡すパラメータ（`bookInfoToParams` など）は変えない。**
- 新しいライブラリの追加（**追加なし**）。`docs/design-system/` とトークンの変更。
- 他画面（記録フォーム等）のヘッダーの見た目。

## 受け入れ条件

### 共通
- [ ] 3 つのルート（scan / isbn / search）はネイティブヘッダーを出さない（`headerShown: false`）。各画面が自前の上部バーを持つ
- [ ] 閉じるボタンは `accessibilityLabel="閉じる"`、タップ領域 44 以上（`size.touchMin`）。押すと `router.back()`
- [ ] 上部バー（閉じる・タイトル・ライト）の上に `useTopInset()` の余白が入る（`SafeAreaInsetsContext` の top を与えると、バーの `paddingTop` に反映される）。ステータスバー／Dynamic Island と重ならない
- [ ] 下に固定するボタン領域（スキャンの「ISBN を手入力する」、タイトル検索のフッター、許可画面のボタン群）の下端に `useBottomInset()` の余白が入る
- [ ] 色・文字・余白・角丸はトークン（`design/tokens.ts`）と `AppText`。新しい色は足さない。`theme.ts` の旧トークンはこの 3 画面から使わなくなる

### カメラの許可（`BarcodeScanScreen`）
- [ ] 権限がまだ取得できていない間は、進行表示（`ActivityIndicator`）のみ
- [ ] 許可されていない（`canAskAgain: true`）: 「バーコードを読み取るためにカメラを使います」と補足説明、主ボタン「カメラを許可する」（押すと `requestPermission` が呼ばれる）、枠ボタン「ISBN を手入力する」（押すと `router.replace('/record/isbn')`）、閉じる
- [ ] 拒否済み（`canAskAgain: false`）: 「カメラを許可する」の代わりに「設定を開く」（押すと `Linking.openSettings`）と「端末の設定でカメラを許可してください」。「ISBN を手入力する」・閉じるは出る
- [ ] Web（`Platform.OS === 'web'`）: 「この機能はスマートフォンでのみ使えます」と「ISBN を手入力する」（`router.replace('/record/isbn')`）。カメラも許可ボタンも出ない。**変更点**: 旧実装の「手入力で追加」（`/record/new` へ）は、デザインに合わせて「ISBN を手入力する」に変える（判断ログ 3）

### バーコード読み取り（`BarcodeScanScreen`）
- [ ] 許可済みのとき `CameraView`（背面・`ean13` のみ）を全画面で出し、白い枠（角丸）・読み取り線・枠の外の暗い面を重ねる。上部バーのタイトルは「バーコードを読み取る」。説明「978 で始まるバーコードを枠に合わせてください」「読み取れたら自動で書誌情報を探します」。下に「ISBN を手入力する」
- [ ] ライト: 上部バー右に `accessibilityLabel="ライト"` のトグル（`accessibilityState.selected` でオン/オフ）。オンのとき `CameraView` に `enableTorch` を渡す。端末が対応していないときは出さない（判断ログ 4）
- [ ] 読み取りは 1 回だけ処理する（二重検出で Provider を 2 回呼ばない）。ISBN（978/979）でないバーコードは無視する（現状どおり）
- [ ] 読み取り後は「書誌情報を検索中…」を表示し（読み取りは止める）、`found` なら `router.replace({ pathname: '/record/new', params: bookInfoToParams(book) })`
- [ ] `not_found` なら `router.replace({ pathname: '/record/isbn', params: { isbn, notFound: '1' } })`。ISBN 画面が「見つかりませんでした」の状態で ISBN を入れて開く（下記）
- [ ] `error`（通信失敗）はスキャン画面に留まり、「書誌情報を取得できませんでした。通信状況を確認してください」と「再試行」（同じ ISBN で再検索）、「ISBN を手入力する」（`/record/isbn` へ、`isbn` パラメータ付き）、「もう一度読み取る」を出す
- [ ] 画面を離れたあとに検索結果が返っても遷移・setState しない（現状の `active` 管理を維持）

### ISBN を入力する（`IsbnLookupScreen`）
- [ ] 上部バーのタイトルは「ISBN を入力する」。見出し「ISBN（10 桁または 13 桁）」の大きな入力欄（`TextField variant="isbn"`、数字キーボード）、ヒント「ハイフンはあってもなくても大丈夫です。裏表紙やカバー袖に書かれています。」、主ボタン「探す」、テキストボタン「バーコードで読み取る」（押すと `router.replace('/record/scan')`）
- [ ] 入力が ISBN-10/13 として不正（桁数・チェックディジット）なら「探す」で `ERROR_ISBN_INVALID`（今の文言）を入力欄の下（`TextField` の `error`）に出し、Provider は呼ばない。入力を直すとエラーは消える
- [ ] ハイフン・空白を含む入力でも `toIsbn13` で正規化して検索する（ISBN-10 は 13 に変換して `lookupByIsbn` を 1 回呼ぶ。現状どおり）
- [ ] 探している間: 入力欄は編集不可、「探す」は無効（`accessibilityState.disabled`）で二重に押せない。下に骨組みのカード（書影の枠＋2 本の線）と「書誌情報を検索中…」を出す
- [ ] `found` なら値が入った追加画面へ `router.replace`（`bookInfoToParams`）
- [ ] `error` なら、骨組みカードの位置のカードに `MESSAGE_LOOKUP_ERROR` と「再試行」を出す。「再試行」で同じ ISBN を再検索する
- [ ] `not_found` なら、入力欄の下に「見つかりませんでした」カード（破線の「？」枠・見出し「見つかりませんでした」・説明「古い本や同人誌は登録されていないことがあります。ISBN はそのまま、残りを手で入力できます。」）を出し、「手で入力する」（主）・「もう一度探す」（枠）・「タイトルで探す」（テキストリンク）を並べる。この間「探す」ボタンと「バーコードで読み取る」は隠す
  - 「手で入力する」: `router.replace({ pathname: '/record/new', params: isbnOnlyParams(toIsbn13(text)) })`（ISBN が入った追加画面。ISBN が不正なら ISBN なし）
  - 「もう一度探す」: 同じ ISBN で再検索（入力欄はそのまま）。入力欄を編集すると「見つかりませんでした」カードは消え、通常の状態に戻る
  - 「タイトルで探す」: `router.replace('/record/search')`
- [ ] 画面パラメータ `isbn`（文字列）があれば入力欄の初期値にし、`notFound === '1'` なら最初から「見つかりませんでした」状態で開く（スキャンからの遷移用）。パラメータなしなら空の通常状態

### タイトルで探す（`TitleSearchScreen`）
- [ ] 上部バー: 閉じる・検索欄（左に検索アイコン相当の記号、`accessibilityLabel="タイトルのキーワード"`）・主ボタン「検索」（`accessibilityLabel="検索"`）が 1 行。`returnKeyType="search"`、送信（キーボードの検索）でも検索する
- [ ] キーワードが空（空白のみ含む）なら `ERROR_KEYWORD_EMPTY` を表示し、Provider を呼ばない
- [ ] 検索中: 「検索」は無効＋進行表示。検索欄は編集不可
- [ ] 結果あり: 「「<キーワード>」の検索結果 N 件」を出し、行を並べる。行 = 小さな書影（`Cover`、書影がなければ `TextCover` の文字の表紙。幅は 44 前後）・タイトル・作者・「出版社 · 出版年」（無い項目は詰める。作者も出版社も年もなければその行は出さない）・右端の `›`。行は `accessibilityRole="button"` で、`accessibilityLabel` はタイトル
- [ ] 行をタップすると、ISBN があれば `lookupByIsbn` で書誌を引いて `bookInfoToParams`、`found` 以外・ISBN なしなら `candidateToParams` で `router.replace('/record/new', …)`（現状どおり）。解決中は行をすべて無効にし、進行表示（`accessibilityLabel="読み込み中"`）を出す
- [ ] 結果が 0 件: 「見つかりませんでした」（`MESSAGE_EMPTY`）を `EmptyState` 風の中央表示で出す。通信失敗: `MESSAGE_SEARCH_ERROR` と「再試行」を出す
- [ ] 画面下に固定（スクロールの外）: 主ではなく枠ボタン「見つからないので手で入力する」（押すと `titleOnlyParams(keyword)` 付きで `/record/new` へ `replace`。0 件のときは主ボタンに強調）と、クレジット `searchProvider.attribution`（デザイン文言は「国立国会図書館サーチ API を利用しています」。Provider の値をそのまま出す）。上に `line` の区切り線
- [ ] キーワードを編集すると、検索中・解決中以外は `idle` に戻り、エラー・0 件表示は消える（現状どおり）。件数見出しも消えるが、結果の行は編集中は残してよい（現状は idle で消える。**消えるままにする**）

## 画面・振る舞い

### 状態遷移
- スキャン画面: `permission なし` → `許可を求める` / `拒否済み`（許可で → カメラ）。カメラ内: `scanning` → `searching` →（`found` → 追加へ ／ `not_found` → ISBN 画面の「見つかりませんでした」へ ／ `error` → 同画面のエラー面）。「もう一度読み取る」で `scanning` に戻る。
- ISBN 画面: `idle` → `loading` →（`found` → 追加へ ／ `not_found` ／ `error`）。`invalid` は検索を始めずに入力欄エラー。入力を変えると `idle`（`loading` 中を除く）。
- タイトル画面: 現状の `Status`（`idle` / `searching` / `invalid` / `results` / `empty` / `error` / `resolving`）を維持。

### レイアウト
- スキャン / 許可画面の背景は `colors.bg`（カメラ中は全面カメラ）。枠の外の暗い面は枠の上下左右に 4 枚の `View`（`colors.scrim` 系、足りなければ `colors.bg` に不透明度を重ねる。新しい色は作らない）で表現し、枠は `colors.textPrimary` の 2px・角丸 `radius` のカード相当。読み取り線は枠内の細い横線で、上下に往復する `Animated` ループ（アンマウントで停止。`AccessibilityInfo` の「動きを減らす」が有効なら中央に静止）。
- 許可画面は、中央に丸角の面（`surface2`）にバーコード枠の記号、見出し、補足。ボタン群は下に固定。
- 左右の余白は画像に合わせてトークンから近いものを選び、PR に書く。

### 上部バー（共通）
`ScreenHeaderBar`（新規部品）: `paddingTop = useTopInset() + space[2]` 程度。左に閉じる（`Button variant="icon"`、子は「✕」。スキャン画面のカメラ上では `onImage`）。中央にタイトル（`sectionTitle` 相当、中央寄せ）。右に任意の要素（ライト）。タイトル検索では、中央にタイトルの代わりに検索欄＋「検索」を渡せるよう `children` を取る。下端に `line` の区切り線（スキャン画面は無し）。

### エラー時
- 通信失敗・見つからない・不正入力は、それぞれ上記の文言で画面内に出す（`Alert` は使わない）。いずれの場合も「手で入力」へ進む導線が残る。

## 設計

### 追加・変更するファイル
- `app/src/hooks/useTopInset.ts`（新規）: `useBottomInset` と同じ作りで `SafeAreaInsetsContext` の `top` を返す（なければ 0）。
- `app/src/components/ScreenHeaderBar.tsx`（新規）: props `{ title?: string; onClose: () => void; right?: ReactNode; onImage?: boolean; divider?: boolean; children?: ReactNode }`。`children` があればタイトルの代わりに中央領域に出す。
- `app/src/components/BookSearchRow.tsx`（新規）: タイトル検索の結果の行（`BookCandidate` と `onPress` / `disabled`）。`Cover`（`kind: 'book'`、`creator: author`、`coverUrl` は候補に無いので `null`）で文字の表紙を出す。**候補は書影 URL を持たない**ため、行の書影はすべて文字の表紙になる（判断ログ 5）。
- `app/src/components/LookupSkeletonCard.tsx`（新規）: 骨組みカード。props `{ state: 'loading' | 'error'; onRetry?: () => void; message?: string }`。loading は書影枠＋線 2 本＋「書誌情報を検索中…」、error はメッセージ＋「再試行」ボタン。
- `app/src/components/NotFoundCard.tsx`（新規）: 「見つかりませんでした」カード。props `{ onManual; onRetry; onTitleSearch }`。
- `app/src/screens/BarcodeScanScreen.tsx` / `IsbnLookupScreen.tsx` / `TitleSearchScreen.tsx`（作り直し。export 名と、`ERROR_ISBN_INVALID` `MESSAGE_NOT_FOUND` `MESSAGE_LOOKUP_ERROR` `ERROR_KEYWORD_EMPTY` `MESSAGE_EMPTY` `MESSAGE_SEARCH_ERROR` の定数 export は維持）。`IsbnLookupScreen` は `{ initialIsbn?: string; initialNotFound?: boolean }` を props に取る。
- `app/src/app/record/scan.tsx` `isbn.tsx` `search.tsx`: `Stack.Screen options={{ headerShown: false }}`。`isbn.tsx` は `useLocalSearchParams<{ isbn?: string; notFound?: string }>()` を読み、**配列・未定義を型ガードで絞り込んで** 画面に渡す（`as` で握りつぶさない）。
- `app/src/lib/isbnLookupParams.ts`: `notFoundParams(isbn: string): { isbn: string; notFound: '1' }` を追加（スキャン画面から使う）。
- テスト: 下記。

### 状態管理
各画面の `useState` / `useRef`（`running` による二重実行防止、`active` によるアンマウント後の更新防止）を現状どおり維持する。ライトは `torch: boolean` の `useState`。ライブラリ・context は追加しない。

### ライトの出し分け
`expo-camera` の SDK 58 のドキュメントで、端末のライト対応を判定できる API があればそれを使う。無ければ、`Platform.OS !== 'web'` かつカメラの準備完了（`onCameraReady`）後に出し、非対応端末ではオンにしても何も起きない（`enableTorch` は無視される）ことをドキュメントで確認して判断ログに書く。

### 新しい依存
なし（アイコンも記号文字：「✕」「›」「⚡」等で表現する。画像・アイコンライブラリは追加しない）。

## テスト方針

| 受け入れ条件 | テスト |
|---|---|
| 許可なし・拒否済み・Web の表示とボタン、`requestPermission` / `openSettings` / `replace('/record/isbn')` | `BarcodeScanScreen.test.tsx`（`expo-camera` と `Platform.OS` を既存どおりモック） |
| 読み取り → found で追加へ、not_found で `/record/isbn`（`notFound=1`）へ、error で再試行・手入力・もう一度、二重検出で 1 回だけ | `BarcodeScanScreen.test.tsx` |
| ライトのトグルと `enableTorch` の受け渡し | `BarcodeScanScreen.test.tsx` |
| ISBN 入力のエラー表示・正規化・ISBN-10 変換 | `IsbnLookupScreen.test.tsx`（既存の文言を更新） |
| 探している間の骨組みカードと無効化、error の再試行 | `IsbnLookupScreen.test.tsx`（未解決の Promise で loading を保持） |
| 見つかりませんでした（手で入力する・もう一度探す・タイトルで探す、編集で解除、パラメータ初期状態） | `IsbnLookupScreen.test.tsx` |
| タイトル検索：空キーワード、件数見出し、結果の行の内容、行タップの遷移、0 件、通信失敗、固定フッターと attribution | `TitleSearchScreen.test.tsx`（既存を更新） |
| `BookSearchRow`（副題の詰め方、書影なしで文字の表紙） | `components/__tests__/BookSearchRow.test.tsx` |
| `ScreenHeaderBar`（閉じる→`back`、ラベル、上端余白、右要素、children） | `components/__tests__/ScreenHeaderBar.test.tsx` |
| `LookupSkeletonCard` / `NotFoundCard` | 各 `__tests__` |
| `useTopInset`・下端余白 | `hooks/__tests__/useTopInset.test.tsx`、画面テストで `SafeAreaInsetsContext` を与えて検証（既存 `bottom-inset.test.tsx` に倣う） |
| `notFoundParams` | `lib/__tests__/isbnLookupParams.test.ts` |
| ヘッダーを出さないルート、`isbn` パラメータの受け渡し | `__tests__/headers.test.tsx` を更新（scan / isbn のネイティブタイトルの確認を、画面内タイトル「バーコードを読み取る」「ISBN を入力する」の確認に置き換える。`/record/search` も追加）、`records-routes` 等の既存ルートテストが通ること |

既存テストを削除して数を減らさない（文言・操作を新デザインに更新する）。CI の差分カバレッジ（変更行 80% 以上）のため、読み取り線の `Animated` ループ・「動きを減らす」分岐もテストで通す（`jest.useFakeTimers` か `Animated` のモック）。
見た目は、`ui-preview` が使えれば `iphone` / `android` で 5 画面（許可・スキャン・ISBN・見つかりませんでした・タイトル検索）を撮影して画像と見比べ、PR 本文に一覧と違いを書く。使えなければその旨を書き、「デザインどおり」とは書かない。

## 判断ログ

1. **ネイティブヘッダーをやめ、画面内の上部バーにする**: デザイン（`isbn.png` `title-search.png` 等）は閉じる丸ボタンとタイトル／検索欄が画面内にある。タイトル検索は検索欄が上部バーに入るため、ネイティブヘッダーでは作れない。3 画面で揃えるため共通部品 `ScreenHeaderBar` ＋ `useTopInset()` にして、上端のセーフエリアは自前で足す（受け入れ条件「Dynamic Island と重ならない」）。却下: `Stack.Screen` の `headerLeft`/`headerTitle` カスタム（検索欄の入力状態をヘッダーに持ち上げる必要があり複雑。スキャン画面の全画面カメラとも相性が悪い）。
2. **スキャンの「見つかりませんでした」は ISBN 画面へ移す**: デザインは ISBN 画面の状態として 1 つだけ描かれており、スキャン側に同じ表示を二重に持つと保守が増える。Issue も「見つからなければ『見つかりませんでした』へ移る」と書いている。`/record/isbn` に `isbn` と `notFound=1` のパラメータを渡す（ルート自体は変えない）。却下: スキャン画面内で自前表示（二重実装）、`router.push`（戻るでスキャンに戻れるが、他の遷移が `replace` で揃っているため `replace`）。
3. **Web の「手入力で追加」→「ISBN を手入力する」**: デザイン（`scan-permission.png` の補足）が Web でも「ISBN を手入力する」と言っている。Issue の受け入れ条件も同じ。ISBN 画面からは「手で入力する」で追加へ進めるため導線は残る。
4. **ライトの対応判定**: Issue は「対応端末のみ」。`expo-camera` に端末のトーチ対応を同期で返す API があるかは未確認（実装担当が SDK 58 のドキュメントで確認）。無ければ「ネイティブ & カメラ準備完了で出す」とし、その旨と根拠を実装側で判断ログに追記する。却下: ライト機能の省略（Issue に明記されている）。
5. **タイトル検索の行の書影は文字の表紙**: `BookCandidate` に書影 URL が無く、書影のために ISBN ごとに追加取得（通信が増える）はしない。デザイン画像の小さな書影は「書影なし → 文字の表紙」に相当する。提案: 将来 NDL の書影 URL（`https://ndlsearch.ndl.go.jp/thumbnail/<isbn>.jpg`）を使う場合は、取得元の追加にあたるため別 Issue で扱う（本 Issue のスコープ外）。
6. **アイコンは記号文字**: アイコンライブラリを追加しない（依存追加は仕様書への記載が必要で、提案なしに増やさない）。「✕」「›」「⚡」「？」で代替し、ボタンには必ず `accessibilityLabel` を付ける。デザインのアイコン形状との差は PR の「デザインとの違い」に書く。提案: アイコンが必要な画面が増えたら、人間側でアイコン方針（`@expo/vector-icons` など）を決める。
7. **読み取り線の動き**: 往復する `Animated` ループ。「動きを減らす」設定のときは静止。却下: 静止のみ（デザインの「読み取り線」は動いて見えることを意図している可能性が高い）。
8. **「見つからないので手で入力する」の強調**: 現状どおり、0 件のときだけ主（白）ボタンにして、それ以外は枠ボタン（デザイン画像は枠）。
9. **ISBN 画面の通常時／検索時／失敗時の骨組みカードの位置**: 画像（`isbn.png`）は「探しているとき」の参考表示を下に描いている。実装は検索中にだけ出し、アイドル時は出さない（見出し「探しているとき」はデザインの注釈なので画面には出さない）。
