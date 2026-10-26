import type { CoverProvider } from '../CoverProvider';
import { createDefaultCoverResolver } from '../index';
import { createCoverResolver } from '../resolveCoverUrl';

const ISBN = '9784065199817';
const fake = (find: CoverProvider['findCoverUrl']): CoverProvider & { find: jest.Mock } => {
  const mock = jest.fn(find);
  return { name: 'fake', findCoverUrl: mock, find: mock };
};

describe('createCoverResolver', () => {
  it('最初に見つかった URL を返し、後ろの取得元は呼ばない', async () => {
    const a = fake(async () => null);
    const b = fake(async () => 'https://b');
    const c = fake(async () => 'https://c');
    expect(await createCoverResolver([a, b, c])(ISBN)).toBe('https://b');
    expect(c.find).not.toHaveBeenCalled();
  });

  it('ISBN-10 は ISBN-13 に変換して渡す', async () => {
    const a = fake(async () => 'https://a');
    await createCoverResolver([a])('4-06-519981-6');
    expect(a.find).toHaveBeenCalledWith(ISBN, expect.any(AbortSignal));
  });

  it('すべて null なら null', async () => {
    expect(await createCoverResolver([fake(async () => null)])(ISBN)).toBeNull();
    expect(await createCoverResolver([])(ISBN)).toBeNull();
  });

  it('例外を投げる取得元があっても次を試す', async () => {
    const a = fake(async () => {
      throw new Error('boom');
    });
    const b = fake(async () => 'https://b');
    expect(await createCoverResolver([a, b])(ISBN)).toBe('https://b');
  });

  it('不正な ISBN は通信せず null', async () => {
    const a = fake(async () => 'https://a');
    expect(await createCoverResolver([a])('123')).toBeNull();
    expect(a.find).not.toHaveBeenCalled();
  });

  describe('締め切り', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('全体の締め切りを過ぎたら null を返し、後ろの取得元は呼ばない', async () => {
      const slow = fake(() => new Promise(() => undefined));
      const next = fake(async () => 'https://next');
      const promise = createCoverResolver([slow, next], { timeoutMs: 1000 })(ISBN);
      await jest.advanceTimersByTimeAsync(1000);
      expect(await promise).toBeNull();
      expect(next.find).not.toHaveBeenCalled();
      expect(slow.find.mock.calls[0][1].aborted).toBe(true);
    });

    it('締め切り後に前の取得元が完了しても次の取得元は呼ばない', async () => {
      let finish: (v: string | null) => void = () => undefined;
      const slow = fake(() => new Promise((r) => (finish = r)));
      const next = fake(async () => 'https://next');
      const promise = createCoverResolver([slow, next], { timeoutMs: 10 })(ISBN);
      await jest.advanceTimersByTimeAsync(10);
      expect(await promise).toBeNull();
      finish(null);
      await jest.advanceTimersByTimeAsync(0);
      expect(next.find).not.toHaveBeenCalled();
    });

    it('既定は 8 秒', async () => {
      const slow = fake(() => new Promise(() => undefined));
      const promise = createCoverResolver([slow])(ISBN);
      await jest.advanceTimersByTimeAsync(7999);
      expect(slow.find.mock.calls[0][1].aborted).toBe(false);
      await jest.advanceTimersByTimeAsync(1);
      expect(await promise).toBeNull();
    });
  });
});

describe('createDefaultCoverResolver', () => {
  it('NDL → Google Books の順で試す', async () => {
    const spy = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({ status: 404 } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [{ volumeInfo: { imageLinks: { thumbnail: 'http://g/x' } } }] }),
      } as Response);
    expect(await createDefaultCoverResolver()(ISBN)).toBe('https://g/x');
    expect(spy.mock.calls[0][0]).toContain('ndlsearch');
    expect(spy.mock.calls[1][0]).toContain('googleapis');
    spy.mockRestore();
  });
});
