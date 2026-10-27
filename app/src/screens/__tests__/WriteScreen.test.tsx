import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { BackHandler } from 'react-native';

import { defaultStarterSettings } from '../../lib/starterDefaults';
import { createStarterSettingsStore } from '../../lib/starterSettingsStore';
import { createRecordRepository, RECORDS_STORAGE_KEY, type RecordRepository } from '../../lib/recordRepository';
import { createWriteDraftStore, type WriteDraftStore } from '../../lib/writeDraftStore';
import { withRepository, withStarterSettings, withWriteDraftStore } from '../../testProviders';
import { createMemoryStorage, makeRecord } from '../../testUtils';
import type { MediaRecord } from '../../types/record';
import type { StarterSettings } from '../../types/starter';
import type { WriteCard, WriteDraft } from '../../lib/writeSession';
import { WriteScreen } from '../WriteScreen';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.setTimeout(15000);

const SAVE_ERROR = '保存できませんでした。もう一度お試しください';
const ALL = defaultStarterSettings().items.map((item) => item.text);

const base = makeRecord({
  id: 'x',
  title: '吾輩は猫である',
  creator: '夏目漱石',
  status: 'completed',
  starters: [{ id: 's0', starter: '古い書き出し', text: '古い', createdAt: '2020-01-01T00:00:00.000Z' }],
  quotes: [{ id: 'q0', text: '引用', page: null, comment: null, createdAt: '2020-01-01T00:00:00.000Z' }],
  memos: [{ id: 'm0', text: 'メモ', page: null, createdAt: '2020-01-01T00:00:00.000Z' }],
  freeTexts: [{ id: 'f0', text: '自由', createdAt: '2020-01-01T00:00:00.000Z' }],
  rating: 4,
  favorite: true,
});

type Handlers = { onSaved?: jest.Mock; onLater?: jest.Mock; onBack?: jest.Mock };
type Options = {
  records?: MediaRecord[];
  settings?: Partial<StarterSettings>;
  drafts?: ReturnType<typeof createMemoryStorage>;
  wrap?: (repository: RecordRepository) => RecordRepository;
  draftStore?: (store: WriteDraftStore) => WriteDraftStore;
};

async function show(handlers: Handlers = {}, options: Options = {}) {
  const { storage } = createMemoryStorage({ [RECORDS_STORAGE_KEY]: JSON.stringify(options.records ?? [base]) });
  const real = createRecordRepository(storage);
  const repository = options.wrap ? options.wrap(real) : real;
  const drafts = options.drafts ?? createMemoryStorage();
  const settingsStorage = createMemoryStorage();
  const settingsStore = createStarterSettingsStore(settingsStorage.storage);
  await settingsStore.save({ ...defaultStarterSettings(), ...options.settings });
  const draftStore = createWriteDraftStore(drafts.storage);
  const Screen = () =>
    withStarterSettings(
      settingsStore,
      withWriteDraftStore(
        options.draftStore ? options.draftStore(draftStore) : draftStore,
        withRepository(repository, <WriteScreen recordId="x" {...handlers} />),
      ),
    );
  const view = await renderRouter({ index: Screen });
  await waitFor(() => expect(screen.getByLabelText('ひとことで言うと、')).toBeTruthy());
  return { repository: real, drafts, draftStore, view };
}

const card = (
  key: string,
  starterId: string | null,
  starter: string,
  patch: Partial<WriteCard> = {},
): WriteCard => ({ key, kind: 'starter', starterId, starter, text: '', page: '', asQuote: false, ...patch });
const seed = (drafts: ReturnType<typeof createMemoryStorage>, draft: WriteDraft) =>
  createWriteDraftStore(drafts.storage).save('x', draft);

const stored = async (repository: RecordRepository) => (await repository.getAll()).find((r) => r.id === 'x');
const visibleStarters = () =>
  ALL.filter(
    (text) => screen.queryByRole('button', { name: text }) !== null || screen.queryByLabelText(`${text}の続き`) !== null,
  );
const freeInputs = () => screen.queryAllByLabelText('自由に書く').filter((n) => n.props.multiline);
const selectedStarter = () => ALL.find((text) => screen.queryByLabelText(`${text}の続き`) !== null);
const press = (name: string) => fireEvent.press(screen.getByRole('button', { name }));
const save = () => act(async () => press('ここまでを残す'));
const writeInto = async (starter: string, text: string) => {
  await fireEvent.press(screen.getByRole('button', { name: starter }));
  await fireEvent.changeText(screen.getByLabelText(`${starter}の続き`), text);
};

describe('WriteScreen の表示', () => {
  it('見出し・タイトル・作者・案内・書いた数を出し、設定の数だけカードを出す', async () => {
    await show();
    expect(screen.getByText('読み終えた')).toBeTruthy();
    expect(screen.getByText('吾輩は猫である')).toBeTruthy();
    expect(screen.getByText('夏目漱石')).toBeTruthy();
    expect(screen.getByText('書き出しを選んで、続きを書こう')).toBeTruthy();
    expect(screen.getByText('0 / 3')).toBeTruthy();
    expect(visibleStarters()).toHaveLength(3);
    expect(screen.getAllByText('書く')).toHaveLength(3);
    expect(selectedStarter()).toBeUndefined();
    expect(screen.queryByText(/評価|問い|お題/)).toBeNull();
  });

  it('作者がなければ出さない。ひとことは既存の値が初期値', async () => {
    await show({}, { records: [{ ...base, creator: null, oneLiner: 'いい本' }] });
    expect(screen.queryByText('夏目漱石')).toBeNull();
    expect(screen.getByLabelText('ひとことで言うと、').props.value).toBe('いい本');
  });

  it('count とオンの数に合わせる', async () => {
    const items = defaultStarterSettings().items.map((item, i) => ({ ...item, enabled: i < 2 }));
    await show({}, { settings: { items, count: 5 } });
    expect(visibleStarters()).toHaveLength(2);
  });

  it('オンが 0 件ならカードなし', async () => {
    const items = defaultStarterSettings().items.map((item) => ({ ...item, enabled: false }));
    await show({}, { settings: { items } });
    expect(visibleStarters()).toHaveLength(0);
    expect(screen.getByText('0 / 0')).toBeTruthy();
  });

  it('書き出しがオフなら、ひとことと自由に書く欄だけ', async () => {
    await show({}, { settings: { enabled: false } });
    expect(visibleStarters()).toHaveLength(0);
    expect(freeInputs()).toHaveLength(1);
    expect(screen.queryByRole('button', { name: 'ほかの書き出しを見る' })).toBeNull();
    expect(screen.queryByRole('button', { name: '自由に書く' })).toBeNull();
  });
});

describe('カードの操作', () => {
  it('選べるのは 1 枚。別のカードに移っても書いた内容は残る', async () => {
    await show();
    const [a, b] = visibleStarters() as [string, string];
    await writeInto(a, '一つ目');
    expect(selectedStarter()).toBe(a);
    await fireEvent.press(screen.getByRole('button', { name: b }));
    expect(selectedStarter()).toBe(b);
    expect(screen.getByText('一つ目').props.numberOfLines).toBe(1);
    expect(screen.getByText('1 / 3')).toBeTruthy();
  });

  it('ページは「引用として残す」がオンのときだけ出る', async () => {
    await show();
    await fireEvent.press(screen.getByRole('button', { name: visibleStarters()[0] as string }));
    expect(screen.queryByLabelText('ページ（任意）')).toBeNull();
    await fireEvent.press(screen.getByRole('switch', { name: '引用として残す' }));
    expect(screen.getByLabelText('ページ（任意）')).toBeTruthy();
  });

  it('「ほかの書き出しを見る」で書いていないカードだけ入れ替わる', async () => {
    await show();
    const before = visibleStarters();
    await writeInto(before[0] as string, '残す');
    await press('ほかの書き出しを見る');
    const after = visibleStarters();
    expect(after).toHaveLength(3);
    expect(after).toContain(before[0]);
    expect(after.filter((t) => before.includes(t))).toEqual([before[0]]);
    expect(screen.getByDisplayValue('残す')).toBeTruthy();
  });

  it('「自由に書く」で欄が何度でも足される', async () => {
    await show();
    expect(freeInputs()).toHaveLength(0);
    await press('自由に書く');
    await press('自由に書く');
    expect(freeInputs()).toHaveLength(2);
  });
});

describe('保存', () => {
  it('何も書いていないあいだは「ここまでを残す」が disabled。空白だけも空', async () => {
    await show();
    const button = () => screen.getByRole('button', { name: 'ここまでを残す' });
    expect(button().props.accessibilityState.disabled).toBe(true);
    await fireEvent.changeText(screen.getByLabelText('ひとことで言うと、'), '  ');
    expect(button().props.accessibilityState.disabled).toBe(true);
    await fireEvent.changeText(screen.getByLabelText('ひとことで言うと、'), 'ひとこと');
    expect(button().props.accessibilityState.disabled).toBe(false);
  });

  it('続きを書き出しの文と一緒に、引用・自由記述・ひとことも保存し、既存データは残す', async () => {
    const onSaved = jest.fn();
    const { repository, draftStore } = await show({ onSaved });
    const [a, b] = visibleStarters() as [string, string];
    await fireEvent.changeText(screen.getByLabelText('ひとことで言うと、'), '  最高の猫  ');
    await writeInto(a, '  嵐の夜  ');
    await writeInto(b, '引用文');
    await fireEvent.press(screen.getByRole('switch', { name: '引用として残す' }));
    await fireEvent.changeText(screen.getByLabelText('ページ（任意）'), '42');
    await press('自由に書く');
    const free = freeInputs()[0];
    await fireEvent.changeText(free as NonNullable<typeof free>, '自由な文');
    await save();
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith('x'));
    const saved = await stored(repository);
    expect(saved?.oneLiner).toBe('最高の猫');
    expect(saved?.starters.map((s) => [s.starter, s.text])).toEqual([
      ['古い書き出し', '古い'],
      [a, '嵐の夜'],
    ]);
    expect(saved?.quotes.map((q) => [q.text, q.page, q.comment])).toEqual([
      ['引用', null, null],
      ['引用文', '42', null],
    ]);
    expect(saved?.freeTexts.map((f) => f.text)).toEqual(['自由', '自由な文']);
    expect(saved?.memos).toHaveLength(1);
    expect(saved).toMatchObject({ rating: 4, favorite: true, status: 'completed' });
    expect(await draftStore.load('x')).toBeNull();
  });

  it('ひとこと欄を空にして残すと null', async () => {
    const { repository } = await show({}, { records: [{ ...base, oneLiner: '前' }] });
    await fireEvent.changeText(screen.getByLabelText('ひとことで言うと、'), '');
    await writeInto(visibleStarters()[0] as string, 'x');
    await save();
    await waitFor(async () => expect((await stored(repository))?.oneLiner).toBeNull());
  });

  it('失敗したら遷移せずエラーを出し、入力は残す', async () => {
    const onSaved = jest.fn();
    await show({ onSaved }, { wrap: (repo) => ({ ...repo, update: async () => Promise.reject(new Error('x')) }) });
    await writeInto(visibleStarters()[0] as string, '書いた');
    await save();
    expect(screen.getByText(SAVE_ERROR)).toBeTruthy();
    expect(onSaved).not.toHaveBeenCalled();
    expect(screen.getByDisplayValue('書いた')).toBeTruthy();
  });

  it('記録が消えていて update が null でも遷移せずエラー', async () => {
    const onSaved = jest.fn();
    await show({ onSaved }, { wrap: (repo) => ({ ...repo, update: async () => null }) });
    await fireEvent.changeText(screen.getByLabelText('ひとことで言うと、'), 'a');
    await save();
    expect(screen.getByText(SAVE_ERROR)).toBeTruthy();
    expect(onSaved).not.toHaveBeenCalled();
  });
});

describe('「あとで」と下書き', () => {
  it('書きかけがあれば下書きを保存して onLater', async () => {
    const onLater = jest.fn();
    const { draftStore, repository } = await show({ onLater });
    const shown = visibleStarters();
    await fireEvent.changeText(screen.getByLabelText('ひとことで言うと、'), '下書き');
    await writeInto(shown[1] as string, '途中');
    await fireEvent.press(screen.getByRole('switch', { name: '引用として残す' }));
    await fireEvent.changeText(screen.getByLabelText('ページ（任意）'), '7');
    await press('自由に書く');
    await fireEvent.changeText(freeInputs()[0] as NonNullable<ReturnType<typeof freeInputs>[number]>, '自由の下書き');
    await press('あとで');
    expect(onLater).toHaveBeenCalled();
    await waitFor(async () => expect(await draftStore.load('x')).not.toBeNull());
    const draft = await draftStore.load('x');
    expect(draft?.oneLiner).toBe('下書き');
    expect(draft?.cards.filter((c) => c.kind === 'starter').map((c) => c.starter).sort()).toEqual([...shown].sort());
    expect(draft?.cards.find((c) => c.text === '途中')).toMatchObject({ page: '7', asQuote: true });
    expect(draft?.cards.find((c) => c.text === '自由の下書き')?.kind).toBe('free');
    expect(draft?.selectedKey).toBe(draft?.cards.find((c) => c.text === '途中')?.key);
    expect((await stored(repository))?.oneLiner).toBeNull();
  });

  it('下書きがあれば、抽選せずに顔ぶれ・内容・選択を復元する', async () => {
    const drafts = createMemoryStorage();
    await seed(drafts, {
      oneLiner: '下書き',
      cards: [
        card('a', 'starter-default-6', ALL[5] as string, { text: '途中', page: '7', asQuote: true }),
        card('b', 'starter-default-2', ALL[1] as string),
        card('c', 'starter-default-4', ALL[3] as string),
        { ...card('f', null, ''), kind: 'free', text: '自由の下書き' },
      ],
      selectedKey: 'a',
    });
    await show({}, { drafts });
    expect(visibleStarters()).toEqual([ALL[1], ALL[3], ALL[5]]);
    expect(screen.getByLabelText('ひとことで言うと、').props.value).toBe('下書き');
    expect(selectedStarter()).toBe(ALL[5]);
    expect(screen.getByDisplayValue('途中')).toBeTruthy();
    expect(screen.getByDisplayValue('7')).toBeTruthy();
    expect(screen.getByDisplayValue('自由の下書き')).toBeTruthy();
    expect(screen.getByRole('switch', { name: '引用として残す' }).props.accessibilityState.checked).toBe(true);
  });

  it('何も書いていなければ下書きを保存せず、保存済みなら消す', async () => {
    const onLater = jest.fn();
    const drafts = createMemoryStorage();
    const { draftStore } = await show({ onLater }, { drafts });
    await draftStore.save('x', {
      oneLiner: '',
      cards: [],
      selectedKey: null,
    });
    await press('あとで');
    expect(onLater).toHaveBeenCalled();
    await waitFor(async () => expect(await draftStore.load('x')).toBeNull());
  });

  it('Android の戻る操作も「あとで」と同じ', async () => {
    const onLater = jest.fn();
    const handlers: Parameters<typeof BackHandler.addEventListener>[1][] = [];
    const spy = jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_name, handler) => {
      handlers.push(handler);
      return { remove: () => undefined };
    });
    const { draftStore } = await show({ onLater });
    await fireEvent.changeText(screen.getByLabelText('ひとことで言うと、'), '戻る前');
    const handler = handlers[handlers.length - 1] as Parameters<typeof BackHandler.addEventListener>[1];
    let handled: boolean | null | undefined = false;
    await act(async () => {
      handled = handler({} as never);
    });
    expect(handled).toBe(true);
    expect(onLater).toHaveBeenCalled();
    await waitFor(async () => expect((await draftStore.load('x'))?.oneLiner).toBe('戻る前'));
    spy.mockRestore();
  });

  it('設定から消えた書き出しは捨て、足りない分を補う', async () => {
    const drafts = createMemoryStorage();
    await seed(drafts, {
      oneLiner: '',
      cards: [
        card('a', 'starter-default-1', ALL[0] as string, { text: 'のこらない' }),
        card('b', 'starter-default-2', ALL[1] as string),
        card('c', 'starter-default-3', ALL[2] as string),
      ],
      selectedKey: null,
    });
    const items = defaultStarterSettings().items.map((item) =>
      item.text === ALL[0] ? { ...item, enabled: false } : item,
    );
    await show({}, { drafts, settings: { items } });
    const after = visibleStarters();
    expect(after).toHaveLength(3);
    expect(after).not.toContain(ALL[0]);
    expect(after).toEqual(expect.arrayContaining([ALL[1], ALL[2]]));
  });

  it('書き出しがオフに変わっていたら、ひとことと自由記述だけ復元する', async () => {
    const drafts = createMemoryStorage();
    await seed(drafts, {
      oneLiner: 'ひとこと残る',
      cards: [card('a', 'starter-default-1', ALL[0] as string, { text: 'x' }), { ...card('f', null, ''), kind: 'free', text: '自由残る' }],
      selectedKey: null,
    });
    await show({}, { drafts, settings: { enabled: false } });
    expect(visibleStarters()).toHaveLength(0);
    expect(screen.getByDisplayValue('自由残る')).toBeTruthy();
    expect(screen.getByLabelText('ひとことで言うと、').props.value).toBe('ひとこと残る');
  });

  it('壊れた下書きや読み込み失敗でも空の状態で開く', async () => {
    const drafts = createMemoryStorage({ 'writeDraft.v1.x': '{broken' });
    await show({}, { drafts });
    expect(visibleStarters()).toHaveLength(3);
    expect(screen.getByLabelText('ひとことで言うと、').props.value).toBe('');
  });

  it('下書きの保存に失敗しても onLater する', async () => {
    const onLater = jest.fn();
    await show(
      { onLater },
      { draftStore: (store) => ({ ...store, save: async () => Promise.reject(new Error('x')) }) },
    );
    await fireEvent.changeText(screen.getByLabelText('ひとことで言うと、'), 'a');
    await press('あとで');
    expect(onLater).toHaveBeenCalled();
  });
});

describe('見つからないとき', () => {
  it('「本が見つかりません」と戻る手段を出す', async () => {
    const onLater = jest.fn();
    const { storage } = createMemoryStorage({ [RECORDS_STORAGE_KEY]: '[]' });
    await renderRouter({
      index: () => withRepository(createRecordRepository(storage), <WriteScreen recordId="x" onLater={onLater} />),
    });
    await waitFor(() => expect(screen.getByText('本が見つかりません')).toBeTruthy());
    await press('本棚へ戻る');
    expect(onLater).toHaveBeenCalled();
  });

  it('読み込みに失敗しても落ちない', async () => {
    const { storage } = createMemoryStorage();
    const repository = { ...createRecordRepository(storage), getAll: async () => Promise.reject(new Error('x')) };
    await renderRouter({ index: () => withRepository(repository, <WriteScreen recordId="x" />) });
    await waitFor(() => expect(screen.getByText('本が見つかりません')).toBeTruthy());
  });
});
