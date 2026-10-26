// https://docs.expo.dev/guides/using-eslint/
// このファイルは保護対象（人間だけが変更する）。
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'coverage/*'],
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
    },
  },
  {
    linterOptions: {
      // 不要になった eslint-disable コメントを残さない
      reportUnusedDisableDirectives: 'error',
    },
  },
]);
