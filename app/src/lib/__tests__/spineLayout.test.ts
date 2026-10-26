import { size } from '../../design/tokens';
import { getSpineSize, layoutShelfRows, SPINE_GAP } from '../spineLayout';

const ids = Array.from({ length: 200 }, (_, i) => `id-${i}-${i * 7919}`);

describe('getSpineSize', () => {
  it('幅・高さは範囲内', () => {
    for (const id of ids) {
      const { width, height } = getSpineSize(id);
      expect(width).toBeGreaterThanOrEqual(size.spineWidthMin);
      expect(width).toBeLessThanOrEqual(size.spineWidthMax);
      expect(height).toBeGreaterThanOrEqual(size.spineHeightMin);
      expect(height).toBeLessThanOrEqual(size.spineHeightMax);
    }
  });

  it('同じ ID は同じ大きさ', () => {
    expect(getSpineSize('abc')).toEqual(getSpineSize('abc'));
  });

  it('複数の ID でばらつく', () => {
    const sizes = ids.map(getSpineSize);
    expect(new Set(sizes.map((s) => s.width)).size).toBeGreaterThan(5);
    expect(new Set(sizes.map((s) => s.height)).size).toBeGreaterThan(5);
  });

  it('空の ID でも落ちない', () => {
    expect(getSpineSize('').width).toBeGreaterThan(0);
  });
});

const rowWidth = (row: { id: string }[]) =>
  row.reduce((sum, item) => sum + getSpineSize(item.id).width, 0) + SPINE_GAP * (row.length - 1);

describe('layoutShelfRows', () => {
  const items = ids.map((id) => ({ id }));

  it('どの段も幅の合計＋間隔が availableWidth を超えない', () => {
    for (const available of [120, 250, 343, 600]) {
      for (const row of layoutShelfRows(items, available)) {
        expect(rowWidth(row)).toBeLessThanOrEqual(available);
      }
    }
  });

  it('順序が保たれ、すべての本が出る', () => {
    expect(layoutShelfRows(items, 343).flat()).toEqual(items);
  });

  it('1 冊だけで幅を超える場合も 1 段 1 冊で落ちない', () => {
    const rows = layoutShelfRows(items.slice(0, 3), 10);
    expect(rows).toHaveLength(3);
    expect(rows.every((r) => r.length === 1)).toBe(true);
  });

  it('0 冊は空配列', () => {
    expect(layoutShelfRows([], 343)).toEqual([]);
  });
});
