#!/usr/bin/env node
// docs/design-system/tokens.json（デザインシステムの正本）から app/src/design/tokens.ts を生成する。
//   node .github/scripts/gen-design-tokens.mjs           生成して書き込む
//   node .github/scripts/gen-design-tokens.mjs --check   生成結果と既存ファイルが一致するか検査する（CI 用）
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const SOURCE = 'docs/design-system/tokens.json';
export const TARGET = 'app/src/design/tokens.ts';

export const camel = (name) => name.replace(/[-.]+([a-z0-9])/gi, (_, c) => c.toUpperCase());

const px = (v) => {
  if (typeof v === 'number') return v;
  const m = String(v).trim().match(/^(-?\d+(?:\.\d+)?)(px)?$/);
  if (!m) throw new Error(`px に変換できない値です: ${v}`);
  return Number(m[1]);
};

// 色トークンを最初のテーマの値に解決する（"{other}" の別名も辿る）
export function resolveColors(color) {
  const theme = color.themes?.[0]?.id;
  const raw = new Map(color.tokens.map((t) => [t.name, typeof t.value === 'string' ? t.value : t.value[theme]]));
  const resolve = (name, depth = 0) => {
    if (depth > 16) throw new Error(`色の別名が深すぎるか循環しています: ${name}`);
    const v = raw.get(name);
    if (v === undefined) throw new Error(`存在しない色トークンです: ${name}`);
    const alias = String(v).match(/^\{(.+)\}$/);
    return alias ? resolve(alias[1], depth + 1) : v;
  };
  return Object.fromEntries(color.tokens.map((t) => [camel(t.name), resolve(t.name)]));
}

// "\"Noto Sans JP\", system-ui" → "Noto Sans JP"（React Native は1つのファミリー名だけを受け取る）
const firstFamily = (stack) => stack.split(',')[0].trim().replace(/^["']|["']$/g, '');

export function typography(type) {
  const out = {};
  for (const group of type.groups) {
    for (const s of group.styles) {
      const fontSize = px(s.fontSize);
      const lh = s.lineHeight;
      const lineHeight = typeof lh === 'number' && lh < 10 ? Math.round(fontSize * lh * 100) / 100 : px(lh);
      out[camel(s.name)] = {
        fontFamily: firstFamily(type.families[s.family ?? group.family]),
        fontSize,
        lineHeight,
        fontWeight: String(s.fontWeight),
      };
    }
  }
  return out;
}

const strip = (prefix) => (name) => camel(name.startsWith(prefix) ? name.slice(prefix.length) : name);

export function generate(tokens) {
  const colors = resolveColors(tokens.color);
  const families = Object.fromEntries(Object.entries(tokens.type.families).map(([k, v]) => [k, firstFamily(v)]));
  const space = Object.fromEntries(tokens.spacing.tokens.map((t) => [t.name.replace(/^space-/, ''), px(t.value)]));
  const radius = Object.fromEntries(tokens.radius.tokens.map((t) => [strip('radius-')(t.name), px(t.value)]));
  const size = Object.fromEntries((tokens.size?.tokens ?? []).map((t) => [camel(t.name), px(t.value)]));
  const shadows = Object.fromEntries((tokens.shadow?.tokens ?? []).map((t) => [strip('shadow-')(t.name), t.value]));
  const block = (name, value) => `export const ${name} = ${JSON.stringify(value, null, 2).replace(/"([A-Za-z_$][\w$]*)":/g, '$1:').replace(/"/g, "'")} as const;\n`;
  return [
    `// このファイルは ${SOURCE}（デザインシステムの正本）から生成されます。手で編集しないでください。`,
    '// 生成し直す: node .github/scripts/gen-design-tokens.mjs',
    '',
    block('colors', colors),
    block('fontFamilies', families),
    block('typography', typography(tokens.type)),
    block('space', space),
    block('radius', radius),
    block('size', size),
    block('shadows', shadows),
  ].join('\n');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const tokens = JSON.parse(readFileSync(path.join(ROOT, SOURCE), 'utf8'));
  const out = generate(tokens);
  const target = path.join(ROOT, TARGET);
  if (process.argv.includes('--check')) {
    const current = existsSync(target) ? readFileSync(target, 'utf8') : '';
    if (current !== out) {
      console.error(`${TARGET} が ${SOURCE} と一致しません。node .github/scripts/gen-design-tokens.mjs で生成し直してください。`);
      process.exit(1);
    }
    console.log(`${TARGET} は ${SOURCE} と一致しています。`);
  } else {
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, out);
    console.log(`生成しました: ${TARGET}`);
  }
}
