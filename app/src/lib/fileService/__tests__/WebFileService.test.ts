import { webFileService } from '../WebFileService';

type FakeInput = {
  type: string;
  accept: string;
  files: { name: string; text: () => Promise<string> }[] | null;
  onchange: (() => void) | null;
  oncancel: (() => void) | null;
  click: jest.Mock;
};
type FakeLink = { href: string; download: string; click: jest.Mock; remove: jest.Mock };

const created: (FakeInput | FakeLink)[] = [];

beforeEach(() => {
  created.length = 0;
  const doc = {
    createElement: (tag: string) => {
      const el =
        tag === 'a'
          ? { href: '', download: '', click: jest.fn(), remove: jest.fn() }
          : { type: '', accept: '', files: null, onchange: null, oncancel: null, click: jest.fn() };
      created.push(el);
      return el;
    },
    body: { appendChild: jest.fn() },
  };
  Object.assign(globalThis, { document: doc });
  Object.assign(URL, { createObjectURL: jest.fn(() => 'blob:x'), revokeObjectURL: jest.fn() });
});

afterEach(() => {
  Reflect.deleteProperty(globalThis, 'document');
});

describe('WebFileService', () => {
  it('Blob をリンクでダウンロードする', async () => {
    expect(
      await webFileService.saveAndShare({ filename: 'a.csv', mimeType: 'text/csv', content: 'x' }),
    ).toBe('shared');
    const link = created[0] as FakeLink;
    expect(link).toMatchObject({ href: 'blob:x', download: 'a.csv' });
    expect(link.click).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:x');
  });

  it('選んだファイルを読む', async () => {
    const pending = webFileService.pickTextFile();
    const input = created[0] as FakeInput;
    input.files = [{ name: 'b.json', text: async () => '{"a":1}' }];
    input.onchange?.();
    expect(await pending).toEqual({ name: 'b.json', text: '{"a":1}' });
  });

  it('ファイルがない・キャンセルは null', async () => {
    const first = webFileService.pickTextFile();
    (created[0] as FakeInput).onchange?.();
    expect(await first).toBeNull();
    const second = webFileService.pickTextFile();
    (created[1] as FakeInput).oncancel?.();
    expect(await second).toBeNull();
  });

  it('読み込みに失敗したら reject する', async () => {
    const pending = webFileService.pickTextFile();
    const input = created[0] as FakeInput;
    input.files = [
      {
        name: 'b.json',
        text: async () => {
          throw new Error('fail');
        },
      },
    ];
    input.onchange?.();
    await expect(pending).rejects.toThrow('fail');
  });
});
