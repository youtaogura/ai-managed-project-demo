import type { STARTER_COUNT_OPTIONS } from '../lib/constants';

export type StarterCount = (typeof STARTER_COUNT_OPTIONS)[number];

export type StarterItem = {
  id: string;
  text: string;
  enabled: boolean;
  custom: boolean;
};

export type StarterSettings = {
  enabled: boolean;
  count: StarterCount;
  items: StarterItem[];
};
