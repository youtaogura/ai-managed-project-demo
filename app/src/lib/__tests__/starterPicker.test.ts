import { STARTER_FIXED, type StarterSettings } from '../../types/starter';
import { defaultStarterSettings } from '../starterDefaults';
import { pickStarters, swapStarters } from '../starterPicker';

function seq(...values: number[]) {
  let i = 0;
  return () => values[i++ % values.length] ?? 0;
}

function withOn(onIds: string[], count: 2 | 3 | 5 = 3): StarterSettings {
  const base = defaultStarterSettings();
  return {
    ...base,
    count,
    items: base.items.map((item) => ({
      ...item,
      enabled: onIds.includes(item.id),
    })),
  };
}

const ids = (items: { id: string }[]) => items.map((i) => i.id);

describe('defaultStarterSettings', () => {
  it('固定を除く 7 つ・3 個・オン', () => {
    const s = defaultStarterSettings();
    expect(s).toMatchObject({ enabled: true, count: 3 });
    expect(s.items).toHaveLength(7);
    expect(s.items[0]?.id).toBe('starter-default-1');
    expect(s.items.some((i) => i.text === STARTER_FIXED)).toBe(false);
  });
});

describe('pickStarters', () => {
  it('count 個を重複なく返し、固定は含まない', () => {
    const picked = pickStarters(defaultStarterSettings(), seq(0.1, 0.9, 0.5));
    expect(picked).toHaveLength(3);
    expect(new Set(ids(picked)).size).toBe(3);
    expect(picked.some((p) => p.text === STARTER_FIXED)).toBe(false);
  });

  it('同じ値列なら同じ結果、値が違えば変わりうる', () => {
    const a = ids(pickStarters(defaultStarterSettings(), seq(0.1, 0.9, 0.5)));
    const b = ids(pickStarters(defaultStarterSettings(), seq(0.1, 0.9, 0.5)));
    expect(a).toEqual(b);
    expect(ids(pickStarters(defaultStarterSettings(), seq(0, 0, 0)))).toEqual([
      'starter-default-1',
      'starter-default-2',
      'starter-default-3',
    ]);
  });

  it('random が 1 以上でも範囲内に収まる', () => {
    expect(pickStarters(defaultStarterSettings(), () => 1)).toHaveLength(3);
  });

  it('オフの項目は選ばない。オンが count 未満ならあるだけ', () => {
    const picked = pickStarters(withOn(['starter-default-2', 'starter-default-5']), seq(0.3));
    expect(ids(picked).sort()).toEqual(['starter-default-2', 'starter-default-5']);
  });

  it('オン 0 件・機能オフは空', () => {
    expect(pickStarters(withOn([]))).toEqual([]);
    expect(pickStarters({ ...defaultStarterSettings(), enabled: false })).toEqual([]);
  });

  it('既定の random（Math.random）でも動く', () => {
    expect(pickStarters(defaultStarterSettings())).toHaveLength(3);
  });
});

describe('swapStarters', () => {
  const settings = defaultStarterSettings();
  const current = ['starter-default-1', 'starter-default-2', 'starter-default-3'];

  it('現在以外のオンの項目から count 個選ぶ', () => {
    const swapped = swapStarters(settings, current, seq(0.2, 0.7));
    expect(swapped).toHaveLength(3);
    expect(ids(swapped).some((id) => current.includes(id))).toBe(false);
  });

  it('新しいものが足りなければ現在のものから補う（重複なし）', () => {
    const s = withOn(['starter-default-1', 'starter-default-2', 'starter-default-3', 'starter-default-4']);
    const swapped = swapStarters(s, current, seq(0));
    expect(swapped).toHaveLength(3);
    expect(new Set(ids(swapped)).size).toBe(3);
    expect(ids(swapped)).toContain('starter-default-4');
  });

  it('オンの総数が count 以下なら現在と同じ集合', () => {
    const s = withOn(current);
    expect(ids(swapStarters(s, current)).sort()).toEqual(current);
  });

  it('機能オフ・オン 0 件は空', () => {
    expect(swapStarters({ ...settings, enabled: false }, current)).toEqual([]);
    expect(swapStarters(withOn([]), current)).toEqual([]);
  });

  it('既定の random でも動く', () => {
    expect(swapStarters(settings, current)).toHaveLength(3);
  });
});
