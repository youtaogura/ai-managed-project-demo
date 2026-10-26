import { STARTER_FIXED } from '../constants';
import { defaultStarterItems, defaultStarterSettings } from '../starterDefaults';
import { pickStarters } from '../starterPicker';
import {
  addStarterItem,
  createStarterId,
  removeStarterItem,
  renameStarterItem,
  setStarterItemEnabled,
  starterSummary,
  validateStarterText,
} from '../starterItems';

const base = defaultStarterItems();
const withCustom = addStarterItem(base, 'もう一度読むなら、', 'c1');

describe('validateStarterText', () => {
  it('前後の空白を除く', () => {
    expect(validateStarterText('  あ、 ', base)).toEqual({ ok: true, text: 'あ、' });
  });
  it('空・空白だけは不可', () => {
    expect(validateStarterText('  ', base)).toEqual({ ok: false, error: '書き出しを入力してください' });
  });
  it('重複と固定の文は不可。編集中の自分自身は可', () => {
    const dup = { ok: false, error: '同じ書き出しがあります' };
    expect(validateStarterText('もう一度読むなら、', withCustom)).toEqual(dup);
    expect(validateStarterText(STARTER_FIXED, withCustom)).toEqual(dup);
    expect(validateStarterText('もう一度読むなら、', withCustom, 'c1').ok).toBe(true);
  });
});

describe('項目の編集', () => {
  it('追加は末尾に custom・enabled で入る', () => {
    expect(withCustom).toHaveLength(8);
    expect(withCustom[7]).toEqual({ id: 'c1', text: 'もう一度読むなら、', enabled: true, custom: true });
  });
  it('名前変更は custom だけで、id と enabled を保つ', () => {
    const off = setStarterItemEnabled(withCustom, 'c1', false);
    expect(renameStarterItem(off, 'c1', '新しい、')[7]).toEqual({
      id: 'c1',
      text: '新しい、',
      enabled: false,
      custom: true,
    });
    expect(renameStarterItem(base, 'starter-default-1', 'x')).toEqual(base);
  });
  it('削除は custom だけ', () => {
    expect(removeStarterItem(withCustom, 'c1')).toEqual(base);
    expect(removeStarterItem(base, 'starter-default-1')).toEqual(base);
  });
  it('オン・オフは pickStarters に反映される', () => {
    const settings = { ...defaultStarterSettings(), items: withCustom };
    const off = base.reduce((items, i) => setStarterItemEnabled(items, i.id, false), withCustom);
    expect(pickStarters({ ...settings, items: off }).map((i) => i.id)).toEqual(['c1']);
    expect(pickStarters({ ...settings, enabled: false })).toEqual([]);
    expect(pickStarters({ ...settings, count: 5 })).toHaveLength(5);
  });
  it('createStarterId は毎回違う', () => {
    expect(createStarterId()).not.toBe(createStarterId());
    expect(createStarterId()).toMatch(/^starter-custom-/);
  });
});

describe('starterSummary', () => {
  it('オンは件数つき、オフは「オフ」', () => {
    expect(starterSummary(defaultStarterSettings())).toBe('オン · 一度に 3 つ · 7 個から');
    expect(starterSummary({ ...defaultStarterSettings(), enabled: false })).toBe('オフ');
  });
});
