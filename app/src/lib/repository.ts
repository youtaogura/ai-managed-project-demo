import { createRecordRepository } from './recordRepository';
import { asyncKeyValueStorage } from './storage';

// 書き込みの直列化キューを共有するため、アプリ全体で 1 つだけ作る
export const recordRepository = createRecordRepository(asyncKeyValueStorage);
