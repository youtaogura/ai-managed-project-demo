import { act, fireEvent, renderRouter, screen, waitFor, within } from 'expo-router/testing-library';
import { BackHandler, Keyboard, TextInput } from 'react-native';

import { HINTS } from '../../lib/hints';
import { createRecordRepository, RECORDS_STORAGE_KEY, type RecordRepository } from '../../lib/recordRepository';
import { createWriteDraftStore, type WriteDraftStore } from '../../lib/writeDraftStore';
import type { WriteDraft } from '../../lib/writeSession';
import { withRepository, withWriteDraftStore } from '../../testProviders';
import { createMemoryStorage, makeRecord } from '../../testUtils';
import type { MediaRecord } from '../../types/record';
import { WriteScreen } from '../WriteScreen';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.setTimeout(15000);

const SAVE_ERROR = '保存できませんでした。もう一度お試しください';
const ALL = Object.values(HINTS).flat();
const MIDDLE = [...HINTS.content, ...HINTS.self, ...HINTS.connection];
const ONE_LINER = 'この本をひとことで';
const MEMO = '読後メモ';

const base = makeRecord({
  id: 'x',
  title: '吾輩は猫である',
  creator: '夏目漱石',
  status: 'completed',
  endDate: '2025-10-20',
  oneLiner: null,
  postReadMemos: [{ id: 'p0', text: '前の読後メモ', createdAt: '2020-01-01T00:00:00.000Z' }],
  quotes: [{ id: 'q0', text: '引用', page: null, comment: null, createdAt: '2020-01-01T00:00:00.000Z' }],
  memos: [{ id: 'm0', text: 'メモ', page: null, createdAt: '2020-01-01T00:00:00.000Z' }],
  rating: 4,
  favorite: true,
});

type Handlers = { onSaved?: jest.Mock; onLater?: jest.Mock; onBack?: jest.Mock };
type Options = {
  records?: MediaRecord[];
  drafts?: ReturnType<typeof createMemoryStorage>;
  wrap?: (repository: RecordRepository) => RecordRepository;
  draftStore?: (store: WriteDraftStore) => WriteDraftStore;
};

async function show(handlers: Handlers = {}, options: Options = {}) {
  const { storage } = createMemoryStorage({ [RECORDS_STORAGE_KEY]: JSON.stringify(options.records ?? [base]) });
  const real = createRecordRepository(storage);
  const repository = options.wrap ? options.wrap(real) : real;
  const drafts = options.drafts ?? createMemoryStorage();
  const draftStore = createWriteDraftStore(drafts.storage);
  const Screen = () =>
    withWriteDraftStore(
      options.draftStore ? options.draftStore(draftStore) : draftStore,
      withRepository(repository, <WriteScreen recordId="x" {...handlers} />),
    );
  await renderRouter({ index: Screen });
  await waitFor(() => expect(screen.getByLabelText(ONE_LINER)).toBeTruthy());
  return { repository: real, storage, drafts, draftStore };
}

const seed = (drafts: ReturnType<typeof createMemoryStorage>, draft: WriteDraft | Record<string, unknown>) =>
  drafts.storage.setItem('writeDraft.v2.x', JSON.stringify(draft));
const stored = async (repository: RecordRepository) => (await repository.getAll()).find((r) => r.id === 'x');
const shownHints = () => ALL.filter((text) => screen.queryByRole('button', { name: text }) !== null);
const press = (name: string) => fireEvent.press(screen.getByRole('button', { name }));
const save = () => act(async () => press('残す'));
const memoValue = () => screen.getByLabelText(MEMO).props.value as string;
const typeMemo = (text: string) => fireEvent.changeText(screen.getByLabelText(MEMO), text);
const firstHint = () => shownHints()[0] as string;

describe('WriteScreen の表示', () => {
  it('「あとで」「読了 M/D」、見出し・タイトル・作者、ひとこと・読後メモの欄、ヒント 3 つ、「残す」を出す', async () => {
    await show();
    expect(screen.getByRole('button', { name: 'あとで' })).toBeTruthy();
    expect(screen.getByText('読了 10/20')).toBeTruthy();
    expect(screen.getByText('読後メモを書く')).toBeTruthy();
    expect(screen.getByText('吾輩は猫である')).toBeTruthy();
    expect(screen.getByText('夏目漱石')).toBeTruthy();
    expect(screen.getByText('ヒント（押すと、最後に改行して入ります）')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'ほかのヒント' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '残す' }).props.accessibilityState.disabled).toBeFalsy();
    expect(memoValue()).toBe('');
    const shown = shownHints();
    expect(shown).toHaveLength(3);
    expect(shown.filter((t) => HINTS.feeling.includes(t))).toHaveLength(1);
    expect(shown.filter((t) => MIDDLE.includes(t))).toHaveLength(1);
    expect(shown.filter((t) => HINTS.recommend.includes(t))).toHaveLength(1);
    expect(screen.getAllByText('＋')).toHaveLength(3);
    expect(screen.queryByText('引用として残す')).toBeNull();
    expect(screen.queryByText(/ここまでを残す|自由に書く|ヒントを選んで|評価|問い|お題|書き出し/)).toBeNull();
  });

  it('「どうだった？」が 2.9 以下の本では、合わなかったときのヒントが 1 つ入る', async () => {
    await show({}, { records: [{ ...base, rating: 2.9 }] });
    const shown = shownHints();
    expect(shown.filter((t) => HINTS.mismatch.includes(t))).toHaveLength(1);
    expect(shown.filter((t) => MIDDLE.includes(t))).toHaveLength(0);
  });

  it('読み終えた日・作者がなければ出さない。ひとことは既存の値が入っている', async () => {
    await show({}, { records: [{ ...base, creator: null, endDate: null, oneLiner: 'いい本' }] });
    expect(screen.queryByText('夏目漱石')).toBeNull();
    expect(screen.queryByText(/^読了/)).toBeNull();
    expect(screen.getByLabelText(ONE_LINER).props.value).toBe('いい本');
  });
});

describe('ヒント', () => {
  it('入力欄が空なら、改行せずにヒントだけが入る', async () => {
    await show();
    const hint = firstHint();
    await press(hint);
    expect(memoValue()).toBe(hint);
  });

  it('文章があれば、最後に一段改行してから入る', async () => {
    await show();
    const hint = firstHint();
    await typeMemo('猫がいた。');
    await press(hint);
    expect(memoValue()).toBe(`猫がいた。\n${hint}`);
  });

  it('改行で終わっているときは、改行を重ねない', async () => {
    await show();
    const hint = firstHint();
    await typeMemo('猫がいた。\n');
    await press(hint);
    expect(memoValue()).toBe(`猫がいた。\n${hint}`);
  });

  it('入れたヒントには ✓ が付き、もう一度押しても入る', async () => {
    await show();
    const [a, b] = shownHints() as [string, string];
    await press(a);
    expect(within(screen.getByRole('button', { name: a })).getByText('✓')).toBeTruthy();
    expect(within(screen.getByRole('button', { name: b })).getByText('＋')).toBeTruthy();
    await press(a);
    expect(memoValue()).toBe(`${a}\n${a}`);
  });

  it('入れたあと、入力欄にフォーカスしてカーソルを最後に置く', async () => {
    const proto = (TextInput as unknown as { prototype: Record<string, unknown> }).prototype;
    const setSelection = jest.fn();
    const focus = jest.fn();
    const original = { setSelection: proto.setSelection, focus: proto.focus };
    proto.setSelection = setSelection;
    proto.focus = focus;
    try {
      await show();
      const hint = firstHint();
      await typeMemo('猫');
      await press(hint);
      const length = `猫\n${hint}`.length;
      expect(focus).toHaveBeenCalled();
      expect(setSelection).toHaveBeenLastCalledWith(length, length);
    } finally {
      proto.setSelection = original.setSelection;
      proto.focus = original.focus;
    }
  });

  it('「↻ ほかのヒント」で、今出ているものと別のヒントに入れ替わる', async () => {
    await show();
    const before = shownHints();
    await press('ほかのヒント');
    const after = shownHints();
    expect(after).toHaveLength(3);
    expect(after.filter((t) => before.includes(t))).toEqual([]);
  });

  it('キーボードを開いて読後メモを書いているあいだは、ヒントの行をキーボードの上（「残す」の代わり）に出す', async () => {
    const listeners: { name: string; listener: () => void }[] = [];
    const emit = (name: string) => listeners.filter((l) => l.name === name).forEach((l) => l.listener());
    const spy = jest.spyOn(Keyboard, 'addListener').mockImplementation((name, listener) => {
      listeners.push({ name, listener: listener as () => void });
      return { remove: () => undefined } as ReturnType<typeof Keyboard.addListener>;
    });
    try {
      await show();
      expect(screen.getByTestId('write-hints')).toBeTruthy();
      await fireEvent(screen.getByLabelText(MEMO), 'focus');
      await act(async () => emit('keyboardWillShow'));
      expect(screen.getByTestId('write-hints-docked')).toBeTruthy();
      expect(screen.queryByTestId('write-hints')).toBeNull();
      expect(screen.queryByRole('button', { name: '残す' })).toBeNull();
      const hint = firstHint();
      await press(hint);
      expect(memoValue()).toBe(hint);
      await act(async () => emit('keyboardWillHide'));
      expect(screen.getByTestId('write-hints')).toBeTruthy();
      expect(screen.getByRole('button', { name: '残す' })).toBeTruthy();
      // ひとことの欄を書いているときは、ヒントの行を動かさない
      await fireEvent(screen.getByLabelText(MEMO), 'blur');
      await act(async () => emit('keyboardWillShow'));
      expect(screen.queryByTestId('write-hints-docked')).toBeNull();
    } finally {
      spy.mockRestore();
    }
  });
});

describe('保存', () => {
  it('「残す」で読後メモを 1 件だけ既存の後ろに足し、ひとことも保存する。下書きは消える', async () => {
    const onSaved = jest.fn();
    const { repository, draftStore } = await show({ onSaved });
    const hint = firstHint();
    await fireEvent.changeText(screen.getByLabelText(ONE_LINER), '  最高の猫  ');
    await typeMemo('嵐の夜だった。');
    await press(hint);
    await save();
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith('x'));
    const saved = await stored(repository);
    expect(saved?.oneLiner).toBe('最高の猫');
    expect(saved?.postReadMemos.map((m) => m.text)).toEqual(['前の読後メモ', `嵐の夜だった。\n${hint}`]);
    expect(saved?.quotes).toEqual(base.quotes);
    expect(saved?.memos).toEqual(base.memos);
    expect(saved).toMatchObject({ rating: 4, favorite: true, status: 'completed' });
    expect(await draftStore.load('x')).toBeNull();
  });

  it('読後メモの欄が空白だけなら読後メモは増えず、ひとことだけ保存する', async () => {
    const onSaved = jest.fn();
    const { repository } = await show({ onSaved });
    await fireEvent.changeText(screen.getByLabelText(ONE_LINER), 'ひとこと');
    await typeMemo('  \n ');
    await save();
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    const saved = await stored(repository);
    expect(saved?.oneLiner).toBe('ひとこと');
    expect(saved?.postReadMemos.map((m) => m.text)).toEqual(['前の読後メモ']);
  });

  it('何も変えずに「残す」を押すと、保存せずにそのまま閉じる', async () => {
    const onSaved = jest.fn();
    const update = jest.fn();
    await show({ onSaved }, { wrap: (repo) => ({ ...repo, update }) });
    await save();
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith('x'));
    expect(update).not.toHaveBeenCalled();
  });

  it('ひとこと欄を空にして残すと null', async () => {
    const { repository } = await show({}, { records: [{ ...base, oneLiner: '前' }] });
    await fireEvent.changeText(screen.getByLabelText(ONE_LINER), '');
    await save();
    await waitFor(async () => expect((await stored(repository))?.oneLiner).toBeNull());
  });

  it('失敗したら遷移せずエラーを出し、入力は残す', async () => {
    const onSaved = jest.fn();
    await show({ onSaved }, { wrap: (repo) => ({ ...repo, update: async () => Promise.reject(new Error('x')) }) });
    await typeMemo('書いた');
    await save();
    expect(screen.getByText(SAVE_ERROR)).toBeTruthy();
    expect(onSaved).not.toHaveBeenCalled();
    expect(memoValue()).toBe('書いた');
    await typeMemo('書き直した');
    expect(screen.queryByText(SAVE_ERROR)).toBeNull();
  });

  it('記録が消えていて update が null でも遷移せずエラー', async () => {
    const onSaved = jest.fn();
    await show({ onSaved }, { wrap: (repo) => ({ ...repo, update: async () => null }) });
    await fireEvent.changeText(screen.getByLabelText(ONE_LINER), 'a');
    await save();
    expect(screen.getByText(SAVE_ERROR)).toBeTruthy();
    expect(onSaved).not.toHaveBeenCalled();
  });
});

describe('「あとで」と下書き', () => {
  it('書きかけがあれば下書き（ひとこと・本文・出ているヒント・入れたヒント）を保存して onLater。記録は変えない', async () => {
    const onLater = jest.fn();
    const { draftStore, repository } = await show({ onLater });
    const shown = shownHints();
    const hint = shown[1] as string;
    await fireEvent.changeText(screen.getByLabelText(ONE_LINER), '下書き');
    await press(hint);
    await press('あとで');
    expect(onLater).toHaveBeenCalled();
    await waitFor(async () => expect(await draftStore.load('x')).not.toBeNull());
    expect(await draftStore.load('x')).toEqual({ oneLiner: '下書き', text: hint, hints: shown, usedHints: [hint] });
    const saved = await stored(repository);
    expect(saved?.oneLiner).toBeNull();
    expect(saved?.postReadMemos).toHaveLength(1);
  });

  it('下書きがあれば、ひとこと・本文・ヒントの顔ぶれ・✓ を戻す', async () => {
    const drafts = createMemoryStorage();
    const hints = [HINTS.feeling[2], HINTS.self[0], HINTS.recommend[0]] as string[];
    await seed(drafts, { oneLiner: '下書き', text: '途中まで', hints, usedHints: [HINTS.recommend[0]] });
    await show({}, { drafts, records: [{ ...base, oneLiner: '保存済み' }] });
    expect(screen.getByLabelText(ONE_LINER).props.value).toBe('下書き');
    expect(memoValue()).toBe('途中まで');
    expect(shownHints().sort()).toEqual([...hints].sort());
    expect(within(screen.getByRole('button', { name: HINTS.recommend[0] as string })).getByText('✓')).toBeTruthy();
  });

  it('何も変えていなければ下書きを保存せず、保存済みなら消す', async () => {
    const onLater = jest.fn();
    const { draftStore } = await show({ onLater }, { records: [{ ...base, oneLiner: 'そのまま' }] });
    await draftStore.save('x', { oneLiner: 'そのまま', text: '', hints: [], usedHints: [] });
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
    await typeMemo('戻る前');
    const handler = handlers[handlers.length - 1] as Parameters<typeof BackHandler.addEventListener>[1];
    let handled: boolean | null | undefined = false;
    await act(async () => {
      handled = handler({} as never);
    });
    expect(handled).toBe(true);
    expect(onLater).toHaveBeenCalled();
    await waitFor(async () => expect((await draftStore.load('x'))?.text).toBe('戻る前'));
    spy.mockRestore();
  });

  it('壊れた下書きでも空の状態で開く', async () => {
    const drafts = createMemoryStorage({ 'writeDraft.v2.x': '{broken' });
    await show({}, { drafts });
    expect(shownHints()).toHaveLength(3);
    expect(memoValue()).toBe('');
  });

  it('下書きの保存に失敗しても onLater する', async () => {
    const onLater = jest.fn();
    await show(
      { onLater },
      { draftStore: (store) => ({ ...store, save: async () => Promise.reject(new Error('x')) }) },
    );
    await typeMemo('a');
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
