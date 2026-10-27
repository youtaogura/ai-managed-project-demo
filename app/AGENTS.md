This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md

## 実際の画面の撮影（UI を変えたとき）

UI を作る・変えたら、実際の画面を撮って `docs/design-system/screens/` の画像と見比べる。

```bash
pnpm shots                 # 全画面（バーコードを除く14画面）を app/.screenshots/ に書き出す
pnpm shots -- shelf reading   # 画面名で絞る（名前は画像のファイル名と同じ。未知の名前はエラー）
```

- `expo export --platform web` → `node:http` で配信 → Playwright（Chromium）で幅 390px・2倍で撮影する。ブラウザは `CHROMIUM_PATH`（Docker イメージでは `/usr/bin/chromium`）を使う。`playwright install` はしない。
- 出力 `app/.screenshots/<名前>.png` は git で無視される。コミットしない。Read ツールで開いて、同名の `docs/design-system/screens/<名前>.png` と見比べる。
- 画面ごとのデータ・URL・撮影前の操作は `scripts/screenshots/scenes.cjs`（`SCENES`）に宣言する。新しい画面を足したら、シーンも足す（`__tests__/scenes.test.ts` が画像との対応を検査する）。データは `localStorage` に入れるので、アプリのコードに撮影用の分岐を入れない。
- 画像と部品の README が食い違うときは README を優先する。色・余白・角丸・文字は `design/tokens.ts` のトークンで直し、ないものは作らず判断ログに提案する。
- PR 本文に「どの画面を撮って、何を直したか」「残した違いとその理由」を書く。
