import { test } from 'node:test';
import assert from 'node:assert/strict';

import { camel, generate, resolveColors, typography } from './gen-design-tokens.mjs';

test('名前をキャメルケースにする', () => {
  assert.equal(camel('text-primary'), 'textPrimary');
  assert.equal(camel('cover-book-bg'), 'coverBookBg');
  assert.equal(camel('surface-1'), 'surface1');
  assert.equal(camel('bg'), 'bg');
});

test('色の別名を最初のテーマの値に解決する', () => {
  const color = {
    themes: [{ id: 'dark' }, { id: 'light' }],
    tokens: [
      { name: 'ink', value: { dark: '#ffffff', light: '#000000' } },
      { name: 'accent', value: '{ink}' },
      { name: 'accent-ink', value: '{accent}' },
    ],
  };
  assert.deepEqual(resolveColors(color), { ink: '#ffffff', accent: '#ffffff', accentInk: '#ffffff' });
  assert.throws(() => resolveColors({ themes: [{ id: 'd' }], tokens: [{ name: 'a', value: '{missing}' }] }), /存在しない/);
  assert.throws(() => resolveColors({ themes: [{ id: 'd' }], tokens: [{ name: 'a', value: '{a}' }] }), /循環/);
});

test('文字スタイルを React Native の値にする', () => {
  const type = {
    families: { sans: '"Noto Sans JP", system-ui, sans-serif' },
    groups: [{ name: 'UI', family: 'sans', styles: [
      { name: 'display-number', fontSize: '34px', lineHeight: 1, fontWeight: 900 },
      { name: 'body', fontSize: '14px', lineHeight: '24px', fontWeight: 400 },
      { name: 'title', fontSize: '46px', lineHeight: 1.15, fontWeight: 800 },
    ] }],
  };
  assert.deepEqual(typography(type), {
    displayNumber: { fontFamily: 'Noto Sans JP', fontSize: 34, lineHeight: 34, fontWeight: '900' },
    body: { fontFamily: 'Noto Sans JP', fontSize: 14, lineHeight: 24, fontWeight: '400' },
    title: { fontFamily: 'Noto Sans JP', fontSize: 46, lineHeight: 52.9, fontWeight: '800' },
  });
});

test('TypeScript の定数として出力する', () => {
  const out = generate({
    color: { themes: [{ id: 'dark' }], tokens: [{ name: 'bg', value: '#000000' }] },
    type: { families: { sans: 'A' }, groups: [] },
    spacing: { tokens: [{ name: 'space-1', value: '4px' }] },
    radius: { tokens: [{ name: 'radius-card', value: '10px' }] },
    size: { tokens: [{ name: 'touch-min', value: '44px' }] },
    shadow: { tokens: [{ name: 'shadow-cover', value: '0 8px 24px rgba(0, 0, 0, 0.5)' }] },
  });
  assert.match(out, /export const colors = \{\n {2}bg: '#000000'\n\} as const;/);
  assert.match(out, /export const space = \{\n {2}'?1'?: 4\n\} as const;/);
  assert.match(out, /radius = \{\n {2}card: 10/);
  assert.match(out, /size = \{\n {2}touchMin: 44/);
  assert.match(out, /shadows = \{\n {2}cover: '0 8px 24px rgba\(0, 0, 0, 0\.5\)'/);
});
