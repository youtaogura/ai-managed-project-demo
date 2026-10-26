import type { MediaCandidate } from '../../types/mediaSearch';
import {
  mediaCandidateToParams,
  mediaKindLabel,
  mediaTitleOnlyParams,
} from '../mediaCandidateParams';

const base: MediaCandidate = {
  mediaType: 'tv',
  tmdbId: '42',
  title: '作品',
  creator: '制作者',
  year: '2020',
  posterUrl: 'https://image.tmdb.org/t/p/w185/p.jpg',
  isAnimation: true,
};

describe('mediaCandidateToParams', () => {
  it('kind・タイトル・制作者・ポスター・取得元を入れる', () => {
    expect(mediaCandidateToParams(base, 'anime')).toEqual({
      kind: 'anime',
      title: '作品',
      creator: '制作者',
      coverUrl: 'https://image.tmdb.org/t/p/w185/p.jpg',
      sourceProvider: 'tmdb',
      sourceType: 'tv',
      sourceId: '42',
    });
  });

  it('制作者・ポスターがなければ付けない', () => {
    const params = mediaCandidateToParams({ ...base, creator: null, posterUrl: null }, 'drama');
    expect(params).not.toHaveProperty('creator');
    expect(params).not.toHaveProperty('coverUrl');
  });
});

describe('mediaTitleOnlyParams', () => {
  it('title は trim、空なら付けない', () => {
    expect(mediaTitleOnlyParams(' x ', 'movie')).toEqual({
      kind: 'movie',
      title: 'x',
    });
    expect(mediaTitleOnlyParams('  ', 'drama')).toEqual({ kind: 'drama' });
  });
});

describe('mediaKindLabel', () => {
  it('アニメ検索のアニメーションだけ「アニメ」', () => {
    expect(mediaKindLabel(base, 'anime')).toBe('アニメ');
    expect(mediaKindLabel({ ...base, isAnimation: false }, 'anime')).toBe('ドラマ');
    expect(mediaKindLabel({ ...base, isAnimation: false, mediaType: 'movie' }, 'anime')).toBe(
      '映画',
    );
  });

  it('映画・ドラマ検索は TMDb の種類で決める', () => {
    expect(mediaKindLabel({ ...base, mediaType: 'movie' }, 'movie')).toBe('映画');
    expect(mediaKindLabel(base, 'drama')).toBe('ドラマ');
  });
});
