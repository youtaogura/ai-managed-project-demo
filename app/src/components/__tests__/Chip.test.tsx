import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { colors } from '../../design/tokens';
import { ChipGroup } from '../Chip';

const options = [
  { value: 'a', label: 'A' },
  { value: 'b', label: 'B' },
] as const;

describe('ChipGroup', () => {
  it('radiogroup と radio の選択状態を持つ', async () => {
    await render(<ChipGroup label="種別" options={options} value="a" onChange={jest.fn()} />);
    expect(screen.getByLabelText('種別').props.accessibilityRole).toBe('radiogroup');
    const a = screen.getByRole('radio', { name: 'A' });
    const b = screen.getByRole('radio', { name: 'B' });
    expect(a.props.accessibilityState).toMatchObject({ checked: true, selected: true });
    expect(b.props.accessibilityState).toMatchObject({ checked: false, selected: false });
    const sa = StyleSheet.flatten(a.props.style);
    expect(sa.backgroundColor).toBe(colors.accent);
    expect(sa.borderColor).toBe(colors.accent);
    expect(StyleSheet.flatten(screen.getByText('A').props.style).color).toBe(colors.accentInk);
    expect(StyleSheet.flatten(b.props.style).borderColor).toBe(colors.lineStrong);
    expect(StyleSheet.flatten(screen.getByText('B').props.style).color).toBe(colors.textSecondary);
  });

  it('押すと onChange(value)', async () => {
    const onChange = jest.fn();
    await render(<ChipGroup label="種別" options={options} value="a" onChange={onChange} columns={2} />);
    await fireEvent.press(screen.getByRole('radio', { name: 'B' }));
    expect(onChange).toHaveBeenCalledWith('b');
  });

  it('compact は 40px で hitSlop により 44px 以上', async () => {
    await render(<ChipGroup label="種別" options={options} value={null} onChange={jest.fn()} compact />);
    const a = screen.getByRole('radio', { name: 'A' });
    const s = StyleSheet.flatten(a.props.style);
    const slop = a.props.hitSlop;
    expect(s.height).toBe(40);
    expect(s.height + slop.top + slop.bottom).toBeGreaterThanOrEqual(44);
  });

  it('通常は高さ 44', async () => {
    await render(<ChipGroup label="種別" options={options} value={null} onChange={jest.fn()} />);
    expect(StyleSheet.flatten(screen.getByRole('radio', { name: 'A' }).props.style).height).toBe(44);
  });
});
