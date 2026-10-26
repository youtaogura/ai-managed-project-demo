import { fireEvent, render, screen } from '@testing-library/react-native';

import { Toggle } from '../Toggle';

describe('Toggle', () => {
  it('switch の role で、ラベルとオン・オフの状態を持つ', async () => {
    await render(<Toggle label="感想" value onChange={jest.fn()} />);
    const toggle = screen.getByRole('switch', { name: '感想' });
    expect(toggle.props.accessibilityState).toMatchObject({ checked: true });
  });

  it('オフの状態', async () => {
    await render(<Toggle label="感想" value={false} onChange={jest.fn()} />);
    expect(screen.getByRole('switch', { name: '感想' }).props.accessibilityState).toMatchObject({
      checked: false,
    });
  });

  it('行をタップすると反転した値で onChange が呼ばれる', async () => {
    const onChange = jest.fn();
    await render(<Toggle label="感想" value={false} onChange={onChange} />);
    await fireEvent.press(screen.getByRole('switch', { name: '感想' }));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('補足を出す', async () => {
    await render(<Toggle label="写真" description="補足の文" value onChange={jest.fn()} />);
    expect(screen.getByText('補足の文')).toBeTruthy();
  });
});
