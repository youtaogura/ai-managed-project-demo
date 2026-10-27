# Issue #162 本を棚から取り出す動きと、本棚・ステータスを切り替えるときの動きを付ける

## 背景・目的

本棚から本を開くと右から次の画面が入るだけ、本棚・ステータスを切り替えると中身が一瞬で入れ替わる。「本を手に取る」体験にするため、(1) 背表紙を棚から取り出して次の画面の背表紙の位置へ運ぶ動き、(2) 本棚（チップ）・ステータス（タブ）の切り替えの動きを付ける。
動きは `docs/design-system/README.md`「動きと触覚」に従う（150〜300ms、ばねのような減速、「動きを減らす」ならフェードだけ）。

## スコープ

やること
- 本棚タブの背表紙を押すと、背表紙が持ち上がり・拡大しながら、読んでる本 / 読み返す画面の上部の背表紙の位置へ移って画面が開く（取り出す動き）
- 戻る（「‹」・端スワイプ・戻るボタン）と、背表紙が棚の元の位置へ戻る
- 本棚（チップ）・ステータス（タブ）を切り替えたとき、消える本は抜け、増える本は差し込まれ、残る本は新しい位置へ動く
- ステータスのタブの下線（朱）が、選んだタブへすべる
- チップの選択の切り替え（塗り・文字色）を短く動かす
- 「動きを減らす」がオンのとき、移動・拡大をやめてフェードだけにする

やらないこと
- 新しいライブラリの追加（`react-native-reanimated` は入れない。判断ログ参照）
- #160 で整えた戻り先（`goBackOrHome` など）の変更
- 本棚以外の画面（振り返りのお気に入り棚、検索結果の背表紙）からの取り出す動き
- 新しい色・トークンの追加（動きの秒数・移動量は仕様書の定数とし、`docs/design-system/` は触らない）

## 受け入れ条件

- [ ] `lib/bookMotion.ts` の純粋関数が、背表紙の元の矩形と先の矩形から、取り出す動きのキーフレーム（持ち上げ量・拡大率・移動量）を返す。持ち上げ量は現行の 4px より大きい
- [ ] 本棚で背表紙を押すと、`onOpen` が呼ばれて画面遷移が始まると同時に、取り出しオーバーレイ（`testID="book-flight"`）が描画される。オーバーレイは操作を受け付けない（`pointerEvents="none"`）
- [ ] 動きを減らす設定がオンのとき、オーバーレイは移動・拡大の transform を持たず、不透明度だけが変わる（Jest で `AccessibilityInfo.isReduceMotionEnabled` をモックして出し分けを確認）
- [ ] 動きの総時間は 300ms 以内（定数 `FLIGHT_DURATION_MS <= 300`）。遷移は動きの完了を待たない（オーバーレイ表示中も次の画面は操作できる）
- [ ] 動きの終わりでオーバーレイが取り除かれる。連打・動きの途中の再押下・途中での戻る操作でも、オーバーレイが残らない・クラッシュしない
- [ ] 戻るとき、棚の背表紙の現在位置が測れれば、その位置へ戻る動きになる。測れない（棚に載っていない・絞り込みで消えた）ときは、オーバーレイを出さずに通常の戻る動きだけになる
- [ ] 棚に出ている間、動かしている本の棚側の背表紙は不透明度 0 にして二重に見えないようにし、動きの終わりで戻す
- [ ] 本棚・ステータスの切り替えで `Shelf` の並びが変わるとき、`LayoutAnimation.configureNext` が呼ばれる（通常は create/delete=不透明度・update=ばね、動きを減らすときは create/delete=不透明度のみ・update=なし）。初回表示では呼ばない
- [ ] `StatusTabs` の下線が、選んだタブの位置・幅へ `Animated` で動く。動きを減らすときは動かさず、位置は即時に切り替わる（フェードなし・即時でよい。下線自体は常に選択タブの下にある）
- [ ] `ShelfChips` の選択の塗りが `Animated` の色補間で切り替わる。動きを減らすときは即時
- [ ] 既存の `StatusTabs` / `ShelfChips` / `Shelf` / `RecordsScreen` / ルートのテスト（`role="tab"`・`accessibilityState.selected`・ラベル）が通る
- [ ] #160 の戻り先（`back` / `dismissTo`）のテストが通る
- [ ] `pnpm check` が通る

## 画面・振る舞い

### 1. 取り出す動き（本棚 → 読んでる本 / 読み返す）

1. 背表紙の `onPress` で、その背表紙を `measureInWindow` し、元の矩形 `from` を得る。
2. 同時に `router.push` する（遷移を待たせない）。画面は従来の右からのスライドではなく**フェード**（`animation: 'fade'`、`reading/[id]` と `records/[id]` のみ）で入れる。背表紙だけが動いて見えるようにするため。
3. ルート直下のオーバーレイが、`from` の背表紙を複製して `Animated` で動かす:
   - 0〜35%: 持ち上がる（`translateY -12`、`scale 1.08`）
   - 35〜100%: 先の矩形 `to` へ移りながら `to` の大きさ（`ReadingScreen` / `RereadScreen` の `SPINE_SIZE` 40×150）へ拡大する
   - 全体 `FLIGHT_DURATION_MS = 280`、`Easing.out(Easing.cubic)`（ばねのような減速。`Animated.spring` ではなく timing にして時間を確定させる）
4. `to` は、遷移先の画面のヒーロー背表紙（`ReadingScreen` の `hero` の `Spine`）の位置。画面が実測値を `onLayout` + `measureInWindow` で登録する（`BookFlightContext.registerTarget(id, rect)`）。登録が間に合わないときは、画面の定数（左余白 `space[5]`・上端 = `topInset + ヘッダーの高さ`）から計算した既定の矩形を使う。
5. 遷移先のヒーロー背表紙は、オーバーレイが着くまで不透明度 0。着いたら 1 にしてオーバーレイを外す（切れ目なく見える）。

戻るとき
- 「‹」・端スワイプ・戻るボタンのいずれでも、遷移先の画面が `beforeRemove`（`navigation.addListener`）で戻りを検知し、ヒーロー背表紙の矩形 `from'` から、棚の背表紙の現在位置 `to'`（`Shelf` が `registerSource(id, ref)` で登録した ref を `measureInWindow`）へ逆向きに動く。持ち上げは戻りでは行わない（着地で少し沈む `translateY +0` へ減速するだけ）。
- 棚の背表紙は動きの間は不透明度 0 → 着地で 1。
- `to'` が測れない（棚に載っていない）ときは何も出さない。

動きの途中で操作が来たとき
- 新しい押下・戻るは、進行中のアニメーションを `stop()` して即座に終端状態にし、新しい動きを始める。オーバーレイは常に 1 つだけ。
- アンマウント時もアニメーションを `stop()` する。

動きを減らす
- `AccessibilityInfo.isReduceMotionEnabled()`（と `reduceMotionChanged` の購読）を見る `hooks/useReduceMotion.ts` を新設する。`BottomSheet` の同じ処理も、挙動を変えずこのフックに置き換える。
- オーバーレイは `to` の位置にその場で不透明度 0→1 だけ（`FLIGHT_DURATION_MS` 内）。戻るときも `to'` の位置でフェードだけ。

### 2. 棚の入れ替わり（本棚・ステータスの切り替え）

- `RecordsScreen` で、`visible` の ID の並びが前回から変わったとき（初回表示は除く）、描画の直前に `LayoutAnimation.configureNext` を呼ぶ。
  - 通常: `duration 220`、`create/delete = { type: 'easeInEaseOut', property: 'opacity' }`、`update = { type: 'spring', springDamping: 0.8 }`（抜ける本は消え、差し込まれる本は現れ、残る本は新しい位置へ動く）
  - 動きを減らす: `create/delete` は opacity のみ、`update` は指定しない
- 空の段の追加・削除（#163）も同じ仕組みで動く。
- 新アーキテクチャでの `LayoutAnimation` はネイティブ側で使える（Android は `UIManager.setLayoutAnimationEnabledExperimental` を必要としない RN 0.88）。Web では何もしない（`LayoutAnimation` は no-op になるため、Web での確認は動きなしでよい）。

### 3. タブの下線・チップ

- `StatusTabs`: 各タブの `onLayout` で `x` と `width` を保持し、下線（高さ `UNDERLINE` = 2、色 `colors.ribbon`）を 1 本の `Animated.View` として行の下端に置く。選択が変わると `translateX` と `width` を 200ms の `Easing.out(Easing.cubic)` で動かす（`width` は `useNativeDriver: false`）。各タブ自身の `tabSelected` の下線（`borderBottom`）はやめる。レイアウトが測れる前は下線を出さず、測れたら動きなしで位置を決める。
- `ShelfChips`: 各チップに `Animated.Value`（0/1）を持ち、`backgroundColor` と枠線色を `interpolate`、150ms。文字色は選択に合わせて即時（`Animated.Text` の色補間はネイティブドライバ不可のため）。`useNativeDriver: false`。
- いずれも `accessibilityState.selected` は即時に切り替える（動きを待たない）。

## 設計

追加・変更するファイル（すべて `app/src/` 以下）
- `lib/bookMotion.ts`（新規）: `FLIGHT_DURATION_MS`、`LIFT_PX`、`LIFT_SCALE`、`computeFlightFrames(from: Rect, to: Rect)`、`Rect` 型。純粋関数
- `hooks/useReduceMotion.ts`（新規）: `boolean` を返す
- `hooks/useBookFlight.tsx`（新規）: `BookFlightProvider` / `useBookFlight()`。`registerSource(id, ref)`、`registerTarget(id, rect)`、`open(record, from, onStart)`、`close(record)`。オーバーレイ（`BookFlightOverlay`）をプロバイダー内で描画。プロバイダーが無い（テスト・プレビュー）ときは何もしない既定値を返す
- `components/BookFlightOverlay.tsx`（新規）: `Spine` を絶対配置で描画し、`Animated.Value` で動かす。`testID="book-flight"`、`pointerEvents="none"`
- `components/Spine.tsx`: 変更は最小限。`Shelf` 側で `View` ラップして `ref` / 不透明度を扱い、`Spine` 本体は変えない（`PRESS_LIFT` の 4px の押下表現は残す）
- `components/Shelf.tsx`: 各背表紙を `collapsable={false}` の `View` で包み `registerSource`。押下で `onPressRecord(record, ref)` ではなく、`Shelf` が `useBookFlight().open` を呼んで `onPressRecord` を続けて呼ぶ（`onPressRecord` のシグネチャは変えない）
- `components/StatusTabs.tsx` / `components/ShelfChips.tsx`: 上記の下線・色補間
- `components/BottomSheet.tsx`: `useReduceMotion` に置き換え（挙動は同じ）
- `screens/RecordsScreen.tsx`: `visible` の並びが変わったときの `LayoutAnimation`（`useLayoutEffect` ではなく、`setFilter` / `setSelectedShelfId` を呼ぶ直前に `configureNext` する小さなラッパ。表示データの変化に追従するため、実装は `useRef` に前回の ID 並びを持ち、変化を検知する形でもよい。どちらでも受け入れ条件を満たす方を選ぶ）
- `screens/ReadingScreen.tsx` / `screens/RereadScreen.tsx`: ヒーロー背表紙を `registerTarget` し、着地までの不透明度を制御。戻りの検知は `app/reading/[id].tsx` / `app/records/[id].tsx` で `navigation.addListener('beforeRemove')`
- `app/_layout.tsx`: `BookFlightProvider` を `Stack` の外側（`ThemeProvider` の内側）に追加。`app/reading/[id].tsx`・`app/records/[id].tsx` の `Stack.Screen` に `animation: 'fade'`（`stackScreenOptions` 全体は変えない）

状態管理: すべて `useRef` / `Animated.Value` / context。ライブラリ追加なし。使う API は React Native 標準の `Animated`、`LayoutAnimation`、`AccessibilityInfo`（Expo SDK 58 / RN 0.88 でそのまま使える。実装前に `https://docs.expo.dev/versions/v58.0.0/` の expo-router の Stack `animation` オプションを確認すること）。

## テスト方針

| 受け入れ条件 | テスト |
|---|---|
| キーフレーム・時間の上限 | `lib/__tests__/bookMotion.test.ts` |
| 押下でオーバーレイが出る・操作を受けない・終わりで消える・連打 | `components/__tests__/BookFlightOverlay.test.tsx`、`hooks/__tests__/useBookFlight.test.tsx`（`measureInWindow` はモック、`Animated` は `jest.useFakeTimers` で進める） |
| 動きを減らす（transform なし・不透明度のみ） | 上記 2 つ + `hooks/__tests__/useReduceMotion.test.ts`（`AccessibilityInfo` をモック） |
| 戻る動き・測れないときは出さない | `useBookFlight.test.tsx`（`close` の分岐）、`__tests__/reading-route.test.tsx` に `beforeRemove` のケース |
| `LayoutAnimation` の呼び分け・初回は呼ばない | `screens/__tests__/RecordsScreen.test.tsx`（`jest.spyOn(LayoutAnimation, 'configureNext')`、タブ切り替え後に呼ばれること、動きを減らすとき update が無いこと） |
| タブの下線が選択タブへ動く・即時の `selected` | `components/__tests__/StatusTabs.test.tsx`（`onLayout` を発火して下線の `transform` / `width` を確認） |
| チップの選択切り替え | `components/__tests__/ShelfChips.test.tsx` |
| 既存テスト・#160 | 既存テストをそのまま通す |

実機・Web での確認: `pnpm shots` は静止画なので、動きは動画か連続撮影が取れた範囲だけ PR に書く。取れなければ「Jest で確認、実機での見え方は未確認」と正直に書く。

## 判断ログ

- **実装方法: React Native 標準の `Animated` + 独自オーバーレイ（採用）**。却下案: ①`react-native-reanimated` の共有要素トランジション — Reanimated 4 では共有要素トランジションが実験的・Fabric での対応が限られ、依存追加と babel 設定（保護対象の変更を伴う可能性）が必要。②expo-router の `Link.AppleZoom` — iOS 18 以降専用で Android・Web で動かず、背表紙の拡大という見え方にも合わない。③`@react-navigation/native-stack` の独自トランジション — 画面間で要素を運べない。標準 `Animated` なら `BottomSheet` が既に使っており、依存追加なしで受け入れ条件（300ms 以内・動きを待たせない）を満たせる。
- **timing を使い spring を使わない**: 動きの総時間を 300ms 以内に確定させたいため。「ばね」の印象は `Easing.out(Easing.cubic)` の減速で出す。棚の位置の移動（`LayoutAnimation`）は `spring` を使う。
- **遷移先の画面は fade にする（`reading` / `records` のみ）**: 右からのスライドと背表紙の動きが同時に起きると目が散るため。#160 は「戻り先」の話で、アニメーションの独自設定を足さない方針は「戻る動きの向き」のものだったが、今回の Issue が動きそのものを足す Issue のため、この 2 画面に限り `animation` を設定する。iOS の端スワイプで戻るジェスチャーは残る（`fade` でもジェスチャーは有効。実装時に確認し、無効になるなら `slide_from_right` のまま背表紙だけを動かす案に切り替え、判断ログに追記する）。
- **棚の入れ替わりは `LayoutAnimation`**: 消える本を残して抜けさせる自前の仕組み（退場中の要素を保持する）は複雑で、連打で壊れやすい。`LayoutAnimation` なら create / delete / update を宣言だけで書け、動きの途中の操作にも追従する。Issue の「または短いフェードと位置の移動」に該当する。
- **タブの下線は 1 本の `Animated.View`**: 各タブの `borderBottom` では「すべる」動きが作れないため。`width` を動かすためネイティブドライバは使わない（JS ドライバで 200ms、負荷は軽い）。
- **0 冊・絞り込みで本が 0 冊のとき**: 取り出しの対象がないので動きなし。棚の入れ替わりは通常どおり（案内文との入れ替えは `LayoutAnimation` の対象）。
- **今回の動きの定数（持ち上げ 12px、拡大 1.08、280ms など）はトークンにしない**: デザインシステムに動きのトークンが無く、トークンの追加は人間が行うため。仕様書の定数として `lib/bookMotion.ts` に置き、動きのトークン化が必要なら別途提案する: 「`motion.duration.short=200` `motion.duration.flight=280` `motion.lift=12`」。
- **`BottomSheet` の `reduceMotion` 処理をフックへ抜き出す**: 同じ処理が 3 か所（BottomSheet・オーバーレイ・タブ/チップ）に増えるため。挙動は変えず、既存の `BottomSheet` のテストで担保する。
- **動きの確認**: ヘッドレス環境では実機・Web の動画が撮れないため、Jest での確認を主とし、確認できた範囲を PR に正直に書く。
- **「読み返す」画面（`/records/[id]`）の取り出す動きと `animation: 'fade'` は今回のスコープから外す（実装に合わせて仕様を更新）**: `docs/design-system/screens/reread.png` に画面上部のヒーロー背表紙がなく、着地先の矩形が定義できないため。取り出す動き・戻る動き・fade は `reading/[id]`（読んでる本）のみ。読み返す画面は従来のスライド遷移のまま。ヒーロー背表紙を持つデザインが追加されたら別 Issue で対応する。上の「受け入れ条件」「画面・振る舞い 1」の「読み返す」は、この判断により対象外とする。
