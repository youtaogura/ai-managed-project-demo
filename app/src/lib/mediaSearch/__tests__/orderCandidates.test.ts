import type { MediaCandidate } from '../../../types/mediaSearch';
import { orderAnimeCandidates } from '../orderCandidates';

const c = (id: string, mediaType: 'movie' | 'tv', isAnimation: boolean): MediaCandidate => ({
  mediaType,
  tmdbId: id,
  title: id,
  creator: null,
  year: null,
  posterUrl: null,
  isAnimation,
});

describe('orderAnimeCandidates', () => {
  it('アニメーションを先に、各グループは movie/tv を交互に保つ', () => {
    const movies = [c('m1', 'movie', false), c('m2', 'movie', true), c('m3', 'movie', true)];
    const tvs = [c('t1', 'tv', true), c('t2', 'tv', false)];
    const ids = orderAnimeCandidates(movies, tvs, 10).map((x) => x.tmdbId);
    expect(ids).toEqual(['t1', 'm2', 'm3', 'm1', 't2']);
  });

  it('上限で切る', () => {
    const movies = [c('m1', 'movie', true), c('m2', 'movie', true)];
    const tvs = [c('t1', 'tv', true)];
    expect(orderAnimeCandidates(movies, tvs, 2).map((x) => x.tmdbId)).toEqual(['m1', 't1']);
  });

  it('空でも落ちない', () => {
    expect(orderAnimeCandidates([], [], 10)).toEqual([]);
  });
});
