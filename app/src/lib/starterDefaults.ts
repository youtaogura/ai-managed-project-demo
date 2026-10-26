import type { StarterItem, StarterSettings } from '../types/starter';

const DEFAULT_TEXTS = [
  'いちばん心に残ったのは、',
  '読み終えて、見方が変わったのは、',
  'この本を渡したいのは、',
  '似ていると思ったのは、',
  '作者がいちばん伝えたかったのは、たぶん',
  '自分のことのように感じたのは、',
  '少し引っかかったのは、',
];

export function defaultStarterItems(): StarterItem[] {
  return DEFAULT_TEXTS.map((text, i) => ({
    id: `starter-default-${i + 1}`,
    text,
    enabled: true,
    custom: false,
  }));
}

export function defaultStarterSettings(): StarterSettings {
  return { enabled: true, count: 3, items: defaultStarterItems() };
}
