import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { colors } from '../../design/tokens';
import type { SpineColor } from '../../types/record';
import { BookStackChart } from '../BookStackChart';

const books = (n: number, color: SpineColor = 'spine-2', prefix = 'b') =>
  Array.from({ length: n }, (_, i) => ({ id: `${prefix}${i}`, spineColor: color }));

describe('BookStackChart', () => {
  const months = [
    { month: '2026-09', books: [] },
    { month: '2026-10', books: [{ id: 'x', spineColor: 'spine-5' as const }, ...books(1, 'spine-1', 'y')] },
  ];

  it('段を背表紙の色で描き、月の数字・読み上げ・今月ラベルを出す', async () => {
    await render(<BookStackChart months={months} currentMonth="2026-10" />);
    expect(StyleSheet.flatten(screen.getByTestId('stack-segment-x').props.style).backgroundColor).toBe(colors.spine5);
    expect(StyleSheet.flatten(screen.getByTestId('stack-segment-y0').props.style).backgroundColor).toBe(colors.spine1);
    expect(screen.getByText('2')).toBeTruthy();
    expect(screen.queryByText('0')).toBeNull();
    expect(screen.getByLabelText('10月 2 冊')).toBeTruthy();
    expect(screen.getByLabelText('9月 0 冊')).toBeTruthy();
    const color = (t: string) => StyleSheet.flatten(screen.getByText(t).props.style).color;
    expect(color('10月')).toBe(colors.textPrimary);
    expect(color('9月')).toBe(colors.textSecondary);
  });

  it('下から古い順に積む（先頭の本が最下段）', async () => {
    await render(<BookStackChart months={months} currentMonth="2026-10" />);
    const ids = screen.getAllByTestId(/^stack-segment-/).map((n) => n.props.testID);
    expect(ids).toEqual(['stack-segment-y0', 'stack-segment-x']);
  });

  it('8 冊を超える月は 8 段まで描き、数字は実数', async () => {
    await render(<BookStackChart months={[{ month: '2026-10', books: books(10) }]} currentMonth="2026-10" />);
    expect(screen.getAllByTestId(/^stack-segment-/)).toHaveLength(8);
    expect(screen.getByText('10')).toBeTruthy();
  });
});
