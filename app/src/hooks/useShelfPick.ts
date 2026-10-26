import { useCallback, useEffect, useMemo, useState } from 'react';

import { countShelfRecords } from '../lib/shelfSelectors';
import type { MediaRecord } from '../types/record';
import type { Shelf } from '../types/shelf';
import { useRecordRepository } from './useRecordRepository';
import { useShelfRepository } from './useShelfRepository';

/**
 * ShelfPickSheet に渡す本棚・冊数・新規作成をまとめる。開いている間は画面が切り替わらないので、
 * フォーカスではなくマウント時に読む。読み込みに失敗したら 0 件として扱う。
 */
export function useShelfPick() {
  const shelfRepository = useShelfRepository();
  const recordRepository = useRecordRepository();
  const [shelves, setShelves] = useState<Shelf[]>([]);
  const [records, setRecords] = useState<MediaRecord[]>([]);

  const load = useCallback(
    () =>
      Promise.all([
        shelfRepository.getAll().catch(() => [] as Shelf[]),
        recordRepository.getAll().catch(() => [] as MediaRecord[]),
      ]),
    [shelfRepository, recordRepository],
  );

  const apply = ([nextShelves, nextRecords]: [Shelf[], MediaRecord[]]) => {
    setShelves(nextShelves);
    setRecords(nextRecords);
  };

  useEffect(() => {
    let active = true;
    void load().then((result) => {
      if (active) apply(result);
    });
    return () => {
      active = false;
    };
  }, [load]);

  const counts = useMemo(() => countShelfRecords(records, shelves), [records, shelves]);

  const create = async (name: string): Promise<Shelf> => {
    const shelf = await shelfRepository.create(name);
    apply(await load());
    return shelf;
  };

  return { shelves, counts, create };
}
