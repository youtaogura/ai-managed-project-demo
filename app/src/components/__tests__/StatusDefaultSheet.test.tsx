import { fireEvent, render, screen } from '@testing-library/react-native';

import { StatusDefaultSheet } from '../StatusDefaultSheet';

describe('StatusDefaultSheet', () => {
  it('4 つの選択肢を出し、選択中だけ selected になる', async () => {
    await render(
      <StatusDefaultSheet visible value="in_progress" onClose={jest.fn()} onChange={jest.fn()} />,
    );
    expect(screen.getByText('ステータスの初期値')).toBeTruthy();
    expect(screen.getAllByRole('radio')).toHaveLength(4);
    expect(
      screen.getByRole('radio', { name: '読んでる・見てる' }).props.accessibilityState,
    ).toMatchObject({ selected: true });
    expect(
      screen.getByRole('radio', { name: '途中でやめた' }).props.accessibilityState,
    ).toMatchObject({ selected: false });
  });

  it('選択肢をタップすると onChange が呼ばれる', async () => {
    const onChange = jest.fn();
    await render(
      <StatusDefaultSheet visible value="completed" onClose={jest.fn()} onChange={onChange} />,
    );
    await fireEvent.press(screen.getByRole('radio', { name: '途中でやめた' }));
    expect(onChange).toHaveBeenCalledWith('dropped');
  });
});
