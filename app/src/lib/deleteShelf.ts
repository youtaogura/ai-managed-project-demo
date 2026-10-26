import type { RecordRepository } from './recordRepository';
import type { ShelfRepository } from './shelfRepository';

type DeleteShelfDeps = {
  shelfRepository: ShelfRepository;
  recordRepository: RecordRepository;
};

/** 本棚を削除し、記録の shelfIds からも外す（本は残る）。記録が先なので、途中で失敗しても再実行で整合する。 */
export async function deleteShelf(
  { shelfRepository, recordRepository }: DeleteShelfDeps,
  id: string,
): Promise<boolean> {
  await recordRepository.removeShelfId(id);
  return await shelfRepository.delete(id);
}
