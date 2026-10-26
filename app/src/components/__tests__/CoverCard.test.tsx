import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { colors, radius, size } from '../../design/tokens';
import { withSettings } from '../../testProviders';
import { makeRecord } from '../../testUtils';
import { MEDIA_KINDS, RECORD_STATUSES, type MediaKind } from '../../types/record';
import { CoverCard } from '../CoverCard';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

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

  describe.each(MEDIA_KINDS)('%s', (kind) => {
    it.each(RECORD_STATUSES)('status=%s の点', async (status) => {
      await render(
        <CoverCard
          record={makeRecord({ kind, status })}
          variant="thumb"
          width={80}
          onPress={jest.fn()}
        />,
      );
      if (status === 'in_progress') {
        const label = kind === 'book' || kind === 'manga' ? '読んでる' : '見てる';
        const dot = screen.getByLabelText(label);
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
      <CoverCard
        record={makeRecord({ endDate: '2024-05-01' })}
        variant="hero"
        onPress={jest.fn()}
      />,
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

describe('CoverCard（記録する項目のオフ）', () => {
  const KINDS: MediaKind[] = ['book', 'manga', 'movie', 'drama', 'anime'];
  const record = makeRecord({
    coverUrl: 'http://c',
    rating: 4.2,
    endDate: '2024-05-01',
    status: 'in_progress',
  });
  const renderWith = (
    fields: Parameters<typeof withSettings>[2],
    variant: 'hero' | 'thumb' = 'hero',
  ) =>
    render(
      withSettings(
        KINDS,
        variant === 'hero' ? (
          <CoverCard record={record} variant="hero" onPress={jest.fn()} />
        ) : (
          <CoverCard record={record} variant="thumb" width={80} onPress={jest.fn()} />
        ),
        fields,
      ),
    );

  it('すべてオンなら評価・終了日・点を出す', async () => {
    await renderWith({});
    expect(await screen.findByText('★ 4.2')).toBeTruthy();
    expect(screen.getByText('2024-05-01')).toBeTruthy();
    expect(screen.getByTestId('status-dot')).toBeTruthy();
  });

  it('レーティングがオフなら評価を出さない（終了日は残る）', async () => {
    await renderWith({ rating: false });
    expect(await screen.findByText('2024-05-01')).toBeTruthy();
    expect(screen.queryByText('★ 4.2')).toBeNull();
  });

  it('終えた日がオフなら終了日を出さない（評価は残る）', async () => {
    await renderWith({ endDate: false });
    expect(await screen.findByText('★ 4.2')).toBeTruthy();
    expect(screen.queryByText('2024-05-01')).toBeNull();
  });

  it('レーティングも終えた日もオフなら情報の行ごと出さない', async () => {
    await renderWith({ rating: false, endDate: false });
    await screen.findByTestId('cover-card-body');
    expect(screen.queryByText('★ 4.2')).toBeNull();
    expect(screen.queryByText('2024-05-01')).toBeNull();
  });

  it('ステータスがオフなら点を出さない', async () => {
    await renderWith({ status: false });
    await screen.findByTestId('cover-card-body');
    expect(screen.queryByTestId('status-dot')).toBeNull();
  });

  it('thumb は情報を出さず、点だけステータスの設定に従う', async () => {
    await renderWith({}, 'thumb');
    expect(await screen.findByTestId('status-dot')).toBeTruthy();
    expect(screen.queryByText('★ 4.2')).toBeNull();
  });
});
