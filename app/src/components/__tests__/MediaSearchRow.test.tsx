import { fireEvent, render, screen } from '@testing-library/react-native';

import type { MediaCandidate } from '../../types/mediaSearch';
import { MediaSearchRow } from '../MediaSearchRow';

const full: MediaCandidate = {
  mediaType: 'movie',
  tmdbId: '1',
  title: '映画A',
  creator: '監督A',
  year: '1999',
  posterUrl: 'https://image.tmdb.org/t/p/w185/p.jpg',
  isAnimation: false,
};

describe('MediaSearchRow', () => {
  it('タイトル・監督・「公開年 · 種別」を出し、押すと onPress', async () => {
    const onPress = jest.fn();
    await render(<MediaSearchRow candidate={full} kind="movie" onPress={onPress} />);
    expect(screen.getByText('監督A')).toBeTruthy();
    expect(screen.getByText('1999 · 映画')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: '映画A' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('公開年・監督がなければ種別だけ。ポスターなしは文字の表紙', async () => {
    const bare = {
      ...full,
      creator: null,
      year: null,
      posterUrl: null,
      mediaType: 'tv' as const,
    };
    await render(<MediaSearchRow candidate={bare} kind="drama" onPress={jest.fn()} />);
    expect(screen.getByText('ドラマ')).toBeTruthy();
    expect(screen.queryByText('監督A')).toBeNull();
  });

  it('無効のときは押せない', async () => {
    const onPress = jest.fn();
    await render(<MediaSearchRow candidate={full} kind="movie" onPress={onPress} disabled />);
    await fireEvent.press(screen.getByRole('button', { name: '映画A' }));
    expect(onPress).not.toHaveBeenCalled();
  });
});
