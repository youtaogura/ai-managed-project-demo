import { RECORD_SOURCE_PROVIDERS, RECORD_STATUSES } from '../record';
import * as shelfModule from '../shelf';
import { BACKUP_FORMAT, BACKUP_VERSION, OLDEST_BACKUP_VERSION, SPINE_COLORS } from '../../lib/constants';

describe('定数', () => {
  it('背表紙の色は spine-1〜spine-10 の 10 色', () => {
    expect(SPINE_COLORS).toHaveLength(10);
    expect(SPINE_COLORS.map((c, i) => c === `spine-${i + 1}`).every(Boolean)).toBe(true);
  });

  it('記録の状態と出どころの種類', () => {
    expect(RECORD_STATUSES).toEqual(['planned', 'in_progress', 'dropped', 'completed']);
    expect(RECORD_SOURCE_PROVIDERS).toEqual(['manual', 'openbd', 'ndl']);
  });

  it('バックアップの形式とバージョン', () => {
    expect(BACKUP_FORMAT).toBe('ai-managed-records-backup');
    expect(BACKUP_VERSION).toBe(3);
    expect(OLDEST_BACKUP_VERSION).toBe(2);
  });

  it('型だけのファイルも読み込める', () => {
    expect(shelfModule).toBeDefined();
  });
});
