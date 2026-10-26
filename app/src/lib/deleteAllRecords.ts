import type { PhotoService } from './photo/PhotoService';
import type { RecordRepository } from './recordRepository';

type DeleteAllParams = {
  repository: RecordRepository;
  photoService: PhotoService;
};

/** 全記録と写真を削除し、削除した件数を返す。記録の削除に失敗したら写真は消さず reject する。 */
export async function deleteAllRecords({ repository, photoService }: DeleteAllParams): Promise<number> {
  const deleted = await repository.deleteAll();
  const uris = deleted.flatMap((r) => (r.photoUri ? [r.photoUri] : []));
  // 写真の削除失敗は全体の失敗にしない（残りも続ける）
  await Promise.all(uris.map((uri) => photoService.remove(uri).catch(() => undefined)));
  return deleted.length;
}
