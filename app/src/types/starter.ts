/** いつも出す固定の書き出し。オフにできず、答えは oneLiner に保存する。 */
export const STARTER_FIXED = 'ひとことで言うと、';
export const STARTER_COUNT_OPTIONS = [2, 3, 5] as const;
export type StarterCount = (typeof STARTER_COUNT_OPTIONS)[number];

export type StarterItem = {
  id: string;
  text: string;
  enabled: boolean;
  custom: boolean;
};

export type StarterSettings = {
  /** 書き出し機能そのもののオン・オフ */
  enabled: boolean;
  count: StarterCount;
  items: StarterItem[];
};
