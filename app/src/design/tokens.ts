// このファイルは docs/design-system/tokens.json（デザインシステムの正本）から生成されます。手で編集しないでください。
// 生成し直す: node .github/scripts/gen-design-tokens.mjs

export const colors = {
  bg: '#0e0e10',
  surface1: '#141417',
  surface2: '#1d1d21',
  line: '#26262b',
  lineStrong: '#34343a',
  textPrimary: '#f2f2f2',
  textSecondary: '#a6a6ad',
  textTertiary: '#85858d',
  accent: '#f2f2f2',
  accentInk: '#0e0e10',
  starOff: '#34343a',
  scrim: 'rgba(14, 14, 16, 0.6)',
  danger: '#ff7a7a',
  coverBookBg: '#24324a',
  coverBookInk: '#e9eef7',
  coverMangaBg: '#4a2430',
  coverMangaInk: '#f7e9ee',
  coverMovieBg: '#3a3324',
  coverMovieInk: '#f4eedd',
  coverDramaBg: '#1f3d3a',
  coverDramaInk: '#e3f4f1',
  coverAnimeBg: '#2e2a4a',
  coverAnimeInk: '#ece9fb'
} as const;

export const fontFamilies = {
  sans: 'Noto Sans JP',
  serif: 'Shippori Mincho'
} as const;

export const typography = {
  displayNumber: {
    fontFamily: 'Noto Sans JP',
    fontSize: 34,
    lineHeight: 34,
    fontWeight: '900'
  },
  screenTitle: {
    fontFamily: 'Noto Sans JP',
    fontSize: 28,
    lineHeight: 34,
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
    fontSize: 14,
    lineHeight: 24,
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
    fontSize: 14,
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
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '400'
  },
  tab: {
    fontFamily: 'Noto Sans JP',
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700'
  },
  coverTitleHero: {
    fontFamily: 'Shippori Mincho',
    fontSize: 46,
    lineHeight: 52.9,
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
  thumb: 6,
  card: 10,
  button: 12,
  full: 999
} as const;

export const size = {
  touchMin: 44,
  buttonHeight: 48,
  tabbarHeight: 84,
  heroCardWidth: 150,
  detailHeroHeight: 500
} as const;

export const shadows = {
  cover: '0 8px 24px rgba(0, 0, 0, 0.5)'
} as const;
