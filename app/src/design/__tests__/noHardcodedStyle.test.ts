/// <reference types="node" />
import { readFileSync } from 'fs';
import { join } from 'path';

const SRC = join(__dirname, '..', '..');
const FILES = [
  'screens/SettingsScreen.tsx',
  'screens/DataScreen.tsx',
  'screens/AboutScreen.tsx',
  'components/SettingsCard.tsx',
  'components/SettingsRow.tsx',
  'components/ExportSheet.tsx',
  'components/ImportSheet.tsx',
  'components/DeleteAllSheet.tsx',
];

describe('設定・データ系の画面は色を直書きしない', () => {
  it.each(FILES)('%s', (file) => {
    const source = readFileSync(join(SRC, file), 'utf8');
    expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(/);
    expect(source).not.toMatch(/(?:color|Color):\s*'(?!transparent)[a-z]+'/);
  });
});
