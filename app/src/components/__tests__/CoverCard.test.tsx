import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { colors, radius, size } from '../../design/tokens';
import { makeRecord } from '../../testUtils';
import { RECORD_STATUSES } from '../../types/record';
import { CoverCard } from '../CoverCard';

const imageOf = () =>
  screen.getAllByLabelText('タイトル').filter((e) => e.props.accessibilityRole === 'image')[0];

describe('CoverCard', () => {
  it('ボタンとしてタイトルを読み上げ、タップで onPress が呼ばれる', async () => {
    const onPress = jest.fn();
    const record = makeRecord();
    await render(<CoverCard record={record} variant="thumb" width={80} onPress={onPress} />);
    const button = screen.getByRole('button', { name: /タイトル/ });
    await fireEvent.press(button);
    expect(onPress).toHaveBeenCalledWith(record);
  });

  describe('進行中の点', () => {
    it.each(RECORD_STATUSES)('status=%s の点', async (status) => {
      await render(
        <CoverCard
          record={makeRecord({ status })}
          variant="thumb"
          width={80}
          onPress={jest.fn()}
        />,
      );
      if (status === 'in_progress') {
        const dot = screen.getByLabelText('読んでる');
        const style = StyleSheet.flatten(dot.props.style);
        expect(style.backgroundColor).toBe(colors.accent);
        expect(style.position).toBe('absolute');
        expect(style.top).toBeDefined();
        expect(style.left).toBeDefined();
      } else {
        expect(screen.queryByTestId('status-dot')).toBeNull();
      }
    });
  });

  it('hero は幅・角丸が固定で、評価と終了日を出す', async () => {
    await render(
      <CoverCard
        record={makeRecord({ coverUrl: 'http://c', rating: 4.2, endDate: '2024-05-01' })}
        variant="hero"
        onPress={jest.fn()}
      />,
    );
    expect(screen.getByText('★ 4.2')).toBeTruthy();
    expect(screen.getByText('2024-05-01')).toBeTruthy();
    const style = StyleSheet.flatten(imageOf().props.style);
    expect(style.width).toBe(size.heroCardWidth);
    expect(style.borderRadius).toBe(radius.card);
  });

  it('hero は欠損した情報を出さない', async () => {
    const { rerender } = await render(
      <CoverCard record={makeRecord({ endDate: '2024-05-01' })} variant="hero" onPress={jest.fn()} />,
    );
    expect(screen.queryByText(/★/)).toBeNull();
    expect(screen.getByText('2024-05-01')).toBeTruthy();
    await rerender(
      <CoverCard record={makeRecord({ rating: 3 })} variant="hero" onPress={jest.fn()} />,
    );
    expect(screen.getByText('★ 3.0')).toBeTruthy();
    await rerender(<CoverCard record={makeRecord()} variant="hero" onPress={jest.fn()} />);
    expect(screen.queryByText(/★/)).toBeNull();
    expect(screen.queryByText('2024-05-01')).toBeNull();
  });

  it('thumb は評価・終了日を出さず、角丸は thumb', async () => {
    await render(
      <CoverCard
        record={makeRecord({ coverUrl: 'http://c', rating: 4.2, endDate: '2024-05-01' })}
        variant="thumb"
        width={90}
        onPress={jest.fn()}
      />,
    );
    expect(screen.queryByText(/★/)).toBeNull();
    expect(screen.queryByText('2024-05-01')).toBeNull();
    const style = StyleSheet.flatten(imageOf().props.style);
    expect(style.width).toBe(90);
    expect(style.borderRadius).toBe(radius.thumb);
  });

  it('画像表示時は画像の上にテキストが重ならない', async () => {
    await render(
      <CoverCard
        record={makeRecord({ coverUrl: 'http://c', rating: 4, status: 'in_progress' })}
        variant="hero"
        onPress={jest.fn()}
      />,
    );
    expect(screen.queryByTestId('text-cover')).toBeNull();
    const dot = screen.getByTestId('status-dot');
    expect(dot.children).toHaveLength(0);
    expect(screen.getByText('★ 4.0')).toBeTruthy();
  });

  it('押すと scale 0.97 へ 100ms、離すと 1 へ戻る', async () => {
    jest.useFakeTimers();
    try {
      await render(
        <CoverCard record={makeRecord()} variant="thumb" width={80} onPress={jest.fn()} />,
      );
      const transformOf = () =>
        StyleSheet.flatten(screen.getByTestId('cover-card-body').props.style).transform;
      expect(transformOf()).toEqual([{ scale: 1 }]);
      const button = screen.getByRole('button');
      await fireEvent(button, 'pressIn');
      await act(async () => {
        jest.advanceTimersByTime(150);
      });
      expect(transformOf()).toEqual([{ scale: 0.97 }]);
      await fireEvent(button, 'pressOut');
      await act(async () => {
        jest.advanceTimersByTime(150);
      });
      expect(transformOf()).toEqual([{ scale: 1 }]);
    } finally {
      jest.useRealTimers();
    }
  });
});
