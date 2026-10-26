# アプリ（Expo / React Native）

## 環境変数

アプリが読む環境変数（`EXPO_PUBLIC_*`）の見本は `.env.example` にあります。

```bash
cp .env.example .env
# .env を開いて値を入れる
```

- `.env` は git に入らない（`.gitignore` 済み）。実際のキーはコミットしないこと
- `EXPO_PUBLIC_*` の値はアプリに埋め込まれるため、秘密にしたい値は入れない
- 本番ビルド（EAS）の環境変数は、人間が EAS に設定する
- 環境変数を足したら、同じ変更で `.env.example` にも書く（用途・未設定のときの動き・取得方法・必須/任意・EAS に設定するか）。コードと見本のずれは Jest（`src/lib/__tests__/envExample.test.ts`）が検出する

## コマンド

```bash
pnpm check   # lint + typecheck + test
```
