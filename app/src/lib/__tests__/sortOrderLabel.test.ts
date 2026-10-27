import { SORT_FIELDS } from '../../components/SortSheet';
import { SORT_ORDERS } from '../../types/sort';
import { SORT_ORDER_LABELS } from '../sortOrderLabel';

describe('SORT_ORDER_LABELS', () => {
  it('すべての並び順に名前がある', () => {
    for (const order of SORT_ORDERS) expect(SORT_ORDER_LABELS[order]).toBeTruthy();
  });

  it('SortSheet の項目名と向きに食い違わない', () => {
    for (const field of SORT_FIELDS) {
      for (const option of field.options) {
        const label = SORT_ORDER_LABELS[option.value];
        expect(label.startsWith(field.label)).toBe(true);
        expect(label.endsWith(option.label)).toBe(true);
      }
    }
  });
});
