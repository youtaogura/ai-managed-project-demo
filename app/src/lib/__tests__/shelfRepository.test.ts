import { createMemoryStorage } from '../../testUtils';
import { ValidationError } from '../recordRepository';
import { createShelfRepository, SHELVES_STORAGE_KEY } from '../shelfRepository';

function setup(initial: Record<string, string> = {}) {
  const memory = createMemoryStorage(initial);
  let n = 0;
  const repo = createShelfRepository(memory.storage, {
    generateId: () => `s${++n}`,
  });
  return { memory, repo };
}

async function three() {
  const { repo, memory } = setup();
  await repo.create('A');
  await repo.create('B');
  await repo.create('C');
  return { repo, memory };
}

describe('ShelfRepository', () => {
  it('create は末尾に追加し、名前の前後の空白を除く。別インスタンスでも読める', async () => {
    const { repo, memory } = setup();
    expect(await repo.create(' 積ん読 ')).toEqual({
      id: 's1',
      name: '積ん読',
      order: 0,
    });
    await repo.create('好き');
    const again = createShelfRepository(memory.storage);
    expect((await again.getAll()).map((s) => [s.name, s.order])).toEqual([
      ['積ん読', 0],
      ['好き', 1],
    ]);
  });

  it('空・空白だけの名前は ValidationError', async () => {
    const { repo } = setup();
    await expect(repo.create('')).rejects.toBeInstanceOf(ValidationError);
    await expect(repo.create('  　')).rejects.toBeInstanceOf(ValidationError);
    expect(await repo.getAll()).toEqual([]);
  });

  it('既定の ID 生成でも作れる', async () => {
    const repo = createShelfRepository(createMemoryStorage().storage);
    const a = await repo.create('a');
    const b = await repo.create('b');
    expect(a.id).not.toBe(b.id);
  });

  it('rename は名前を変え、存在しない ID は null、空は ValidationError', async () => {
    const { repo } = await three();
    expect(await repo.rename('s2', ' 新 ')).toEqual({
      id: 's2',
      name: '新',
      order: 1,
    });
    expect(await repo.rename('none', 'x')).toBeNull();
    await expect(repo.rename('s2', ' ')).rejects.toBeInstanceOf(ValidationError);
    expect((await repo.getAll())[1]?.name).toBe('新');
  });

  it('reorder は order を 0..n-1 に振り直す', async () => {
    const { repo } = await three();
    const result = await repo.reorder(['s3', 's1', 's2']);
    expect(result.map((s) => [s.id, s.order])).toEqual([
      ['s3', 0],
      ['s1', 1],
      ['s2', 2],
    ]);
    expect((await repo.getAll()).map((s) => s.id)).toEqual(['s3', 's1', 's2']);
  });

  it('reorder: 一覧に無い ID は無視し、渡されなかった本棚は末尾に元の順で残る', async () => {
    const { repo } = await three();
    const result = await repo.reorder(['s3', 'ghost']);
    expect(result.map((s) => [s.id, s.order])).toEqual([
      ['s3', 0],
      ['s1', 1],
      ['s2', 2],
    ]);
  });

  it('delete は本棚を消し、存在しなければ false。order は詰める', async () => {
    const { repo } = await three();
    expect(await repo.delete('s1')).toBe(true);
    expect(await repo.delete('s1')).toBe(false);
    expect((await repo.getAll()).map((s) => [s.id, s.order])).toEqual([
      ['s2', 0],
      ['s3', 1],
    ]);
  });

  it('「すべての本」は保存されない', async () => {
    const { repo } = await three();
    expect((await repo.getAll()).map((s) => s.name)).toEqual(['A', 'B', 'C']);
  });

  it('壊れた保存データ・不正な要素・重複 ID は読めた分だけ', async () => {
    expect(await setup({ [SHELVES_STORAGE_KEY]: '{' }).repo.getAll()).toEqual([]);
    expect(await setup({ [SHELVES_STORAGE_KEY]: '{}' }).repo.getAll()).toEqual([]);
    const raw = JSON.stringify([
      { id: 'a', name: 'A', order: 3 },
      { id: 'a', name: 'dup', order: 4 },
      { id: 'b', name: ' ', order: 0 },
      null,
    ]);
    expect(await setup({ [SHELVES_STORAGE_KEY]: raw }).repo.getAll()).toEqual([{ id: 'a', name: 'A', order: 0 }]);
  });

  it('保存に失敗したら reject し、キューは詰まらない', async () => {
    const memory = createMemoryStorage();
    const repo = createShelfRepository(memory.storage);
    const original = memory.storage.setItem;
    memory.storage.setItem = async () => {
      throw new Error('fail');
    };
    await expect(repo.create('x')).rejects.toThrow('fail');
    memory.storage.setItem = original;
    await repo.create('y');
    expect((await repo.getAll()).map((s) => s.name)).toEqual(['y']);
  });

  it('importShelves: replace は置き換え、merge は同じ ID をファイルの内容にする', async () => {
    const { repo } = await three();
    const merged = await repo.importShelves(
      [
        { id: 's2', name: 'B2', order: 0 },
        { id: 'x', name: 'X', order: 1 },
      ],
      'merge',
    );
    expect(merged.map((s) => [s.id, s.name, s.order])).toEqual([
      ['s1', 'A', 0],
      ['s2', 'B2', 1],
      ['s3', 'C', 2],
      ['x', 'X', 3],
    ]);
    const replaced = await repo.importShelves([{ id: 'only', name: 'O', order: 0 }], 'replace');
    expect(replaced).toEqual([{ id: 'only', name: 'O', order: 0 }]);
  });
});
