// このファイルは docs/design-system/tokens.json（デザインシステムの正本）から生成されます。手で編集しないでください。
// 生成し直す: node .github/scripts/gen-design-tokens.mjs

export const colors = {
  bg: '#f3eee3',
  surface1: '#fbf8f1',
  surface2: '#eae3d4',
  line: '#ddd4c2',
  lineStrong: '#c9bea8',
  textPrimary: '#2b2620',
  textSecondary: '#5f574c',
  textTertiary: '#73695c',
  accent: '#2b2620',
  accentInk: '#f3eee3',
  ribbon: '#8c3b2e',
  ribbonInk: '#fbf8f1',
  starOff: '#c9bea8',
  scrim: 'rgba(43, 38, 32, 0.45)',
  danger: '#a8321f',
  shelfBoard: '#b9a483',
  spineInk: '#f3eee3',
  spine1: '#2f4a3a',
  spine2: '#7a2e2a',
  spine3: '#1f3550',
  spine4: '#80621f',
  spine5: '#4a4038',
  spine6: '#4f5e42',
  spine7: '#7e4e33',
  spine8: '#33333f',
  spine9: '#5e4560',
  spine10: '#345460',
  coverBookBg: '#1f3550',
  coverBookInk: '#f3eee3',
  coverMangaBg: '#7a2e2a',
  coverMangaInk: '#f3eee3',
  coverMovieBg: '#4a4038',
  coverMovieInk: '#f3eee3',
  coverDramaBg: '#2f4a3a',
  coverDramaInk: '#f3eee3',
  coverAnimeBg: '#5e4560',
  coverAnimeInk: '#f3eee3'
} as const;

export const fontFamilies = {
  sans: 'Noto Sans JP',
  serif: 'Shippori Mincho'
} as const;

export const typography = {
  displayNumber: {
    fontFamily: 'Noto Sans JP',
    fontSize: 30,
    lineHeight: 30,
    fontWeight: '900'
  },
  sectionTitle: {
    fontFamily: 'Noto Sans JP',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700'
  },
  body: {
    fontFamily: 'Noto Sans JP',
    fontSize: 15,
    lineHeight: 26,
    fontWeight: '400'
  },
  value: {
    fontFamily: 'Noto Sans JP',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700'
  },
  button: {
    fontFamily: 'Noto Sans JP',
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700'
  },
  label: {
    fontFamily: 'Noto Sans JP',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400'
  },
  micro: {
    fontFamily: 'Noto Sans JP',
    fontSize: 10.5,
    lineHeight: 14,
    fontWeight: '400'
  },
  tab: {
    fontFamily: 'Noto Sans JP',
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '700'
  },
  screenTitle: {
    fontFamily: 'Shippori Mincho',
    fontSize: 30,
    lineHeight: 38,
    fontWeight: '800'
  },
  bookTitle: {
    fontFamily: 'Shippori Mincho',
    fontSize: 26,
    lineHeight: 34,
    fontWeight: '800'
  },
  oneLine: {
    fontFamily: 'Shippori Mincho',
    fontSize: 22,
    lineHeight: 34,
    fontWeight: '800'
  },
  starter: {
    fontFamily: 'Shippori Mincho',
    fontSize: 16,
    lineHeight: 32,
    fontWeight: '800'
  },
  reading: {
    fontFamily: 'Shippori Mincho',
    fontSize: 16,
    lineHeight: 32,
    fontWeight: '600'
  },
  quote: {
    fontFamily: 'Shippori Mincho',
    fontSize: 17,
    lineHeight: 30,
    fontWeight: '600'
  },
  spineTitle: {
    fontFamily: 'Shippori Mincho',
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '800'
  },
  coverTitleHero: {
    fontFamily: 'Shippori Mincho',
    fontSize: 26,
    lineHeight: 33.8,
    fontWeight: '800'
  },
  coverTitleCard: {
    fontFamily: 'Shippori Mincho',
    fontSize: 18,
    lineHeight: 23.4,
    fontWeight: '800'
  },
  coverTitleThumb: {
    fontFamily: 'Shippori Mincho',
    fontSize: 9,
    lineHeight: 11.7,
    fontWeight: '800'
  }
} as const;

export const space = {
  '1': 4,
  '2': 8,
  '3': 12,
  '4': 16,
  '5': 20,
  '6': 24
} as const;

export const radius = {
  thumb: 2,
  card: 12,
  button: 12,
  sheet: 20,
  full: 999
} as const;

export const size = {
  touchMin: 44,
  buttonHeight: 48,
  tabbarHeight: 84,
  spineWidthMin: 28,
  spineWidthMax: 44,
  spineHeightMin: 150,
  spineHeightMax: 184,
  shelfBoardHeight: 10,
  heroCardWidth: 150,
  detailHeroHeight: 500
} as const;

export const shadows = {
  cover: '0 6px 10px rgba(60, 40, 20, 0.25)'
} as const;
