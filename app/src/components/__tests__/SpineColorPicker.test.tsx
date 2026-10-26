import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { size } from '../../design/tokens';
import { SpineColorPicker } from '../SpineColorPicker';

describe('SpineColorPicker', () => {
  it('10 色の丸が radio で並び、選択中だけ selected', async () => {
    await render(<SpineColorPicker value="spine-3" onChange={jest.fn()} />);
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(10);
    expect(screen.getByRole('radio', { name: '背表紙の色 1' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: '背表紙の色 10' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: '背表紙の色 3' })).toBeSelected();
    expect(screen.getByRole('radio', { name: '背表紙の色 4' })).not.toBeSelected();
  });

  it('タップ領域は touchMin 以上', async () => {
    await render(<SpineColorPicker value="spine-1" onChange={jest.fn()} />);
    const style = StyleSheet.flatten(screen.getAllByRole('radio')[0]?.props.style as never) as Record<string, number>;
    expect(style.width).toBeGreaterThanOrEqual(size.touchMin);
    expect(style.height).toBeGreaterThanOrEqual(size.touchMin);
  });

  it('押した色が onChange に渡る', async () => {
    const onChange = jest.fn();
    await render(<SpineColorPicker value="spine-1" onChange={onChange} />);
    await fireEvent.press(screen.getByRole('radio', { name: '背表紙の色 7' }));
    expect(onChange).toHaveBeenCalledWith('spine-7');
  });
});
