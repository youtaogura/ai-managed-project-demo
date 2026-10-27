import type { SortOrder } from '../types/sort';

// 設定の「並び順」行に出す名前。SortSheet の「項目 + 向き」と同じ言葉にする
export const SORT_ORDER_LABELS: Record<SortOrder, string> = {
  endDate_desc: '終了日の新しい順',
  endDate_asc: '終了日の古い順',
  startDate_desc: '開始日の新しい順',
  startDate_asc: '開始日の古い順',
  rating_desc: 'どうだった？の高い順',
  rating_asc: 'どうだった？の低い順',
  title_asc: 'タイトル あ→ん',
  createdAt_desc: '登録日時の新しい順',
};
