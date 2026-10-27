import type { RecordRepository } from './recordRepository';

type DeleteAllParams = {
  repository: RecordRepository;
};

/** 全記録を削除し、削除した件数を返す。 */
export async function deleteAllRecords({ repository }: DeleteAllParams): Promise<number> {
  const deleted = await repository.deleteAll();
  return deleted.length;
}
