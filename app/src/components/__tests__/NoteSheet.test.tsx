import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { TextInput } from 'react-native';

import { createNoteDraftStore } from '../../lib/noteDraftStore';
import { createMemoryStorage } from '../../testUtils';
import { withNoteDraftStore } from '../../testProviders';
import { SLIDE_DURATION } from '../BottomSheet';
import { NoteSheet, type NoteSheetProps } from '../NoteSheet';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

async function setup(props: Partial<NoteSheetProps> = {}, initial: Record<string, string> = {}) {
  const { storage, data } = createMemoryStorage(initial);
  const store = createNoteDraftStore(storage);
  const onSubmit = jest.fn().mockResolvedValue(undefined);
  const onClose = jest.fn();
  const element = (visible: boolean) =>
    withNoteDraftStore(
      store,
      <NoteSheet visible={visible} bookTitle="吾輩は猫である" recordId="r1" onSubmit={onSubmit} onClose={onClose} {...props} />,
    );
  const view = await render(element(true));
  return { data, store, onSubmit, onClose, rerender: async (visible: boolean) => view.rerender(element(visible)) };
}

const ready = () => waitFor(() => expect(screen.getByLabelText('本文')).toBeTruthy());

describe('NoteSheet（新規）', () => {
  it('タイトル・タブ（初期はメモ）・ページ・本文を出し、ひとことと線は出さない', async () => {
    await setup();
    await ready();
    expect(screen.getByText('吾輩は猫である')).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'メモ', selected: true })).toBeTruthy();
    expect(screen.getByRole('tab', { name: '引用', selected: false })).toBeTruthy();
    const page = screen.getByLabelText('ページ');
    expect(screen.getByText('なくても大丈夫')).toBeTruthy();
    expect(page.props.maxLength).toBe(10);
    expect(page.props.keyboardType).toBe('number-pad');
    expect(screen.queryByLabelText('ひとこと')).toBeNull();
    expect(screen.queryByTestId('quote-line')).toBeNull();
  });

  it('引用に切り替えると線とひとこと欄が出る', async () => {
    await setup();
    await ready();
    await fireEvent.press(screen.getByRole('tab', { name: '引用' }));
    expect(screen.getByTestId('quote-line')).toBeTruthy();
    expect(screen.getByLabelText('ひとこと')).toBeTruthy();
  });

  it('本文が空白だけのあいだ「残す」は disabled', async () => {
    await setup();
    await ready();
    expect(screen.getByRole('button', { name: '残す' }).props.accessibilityState.disabled).toBe(true);
    await fireEvent.changeText(screen.getByLabelText('本文'), '  ');
    expect(screen.getByRole('button', { name: '残す' }).props.accessibilityState.disabled).toBe(true);
    await fireEvent.changeText(screen.getByLabelText('本文'), '本文');
    expect(screen.getByRole('button', { name: '残す' }).props.accessibilityState.disabled).toBe(false);
  });

  it('「残す」で onSubmit を呼び、下書きを消して閉じる', async () => {
    const { onSubmit, onClose, data } = await setup({}, {
      'noteDraft.v1.r1': JSON.stringify({ kind: 'memo', page: '1', text: '下書き', comment: '' }),
    });
    await waitFor(() => expect(screen.getByLabelText('本文').props.value).toBe('下書き'));
    await fireEvent.changeText(screen.getByLabelText('ページ'), '88');
    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: '残す' }));
    });
    expect(onSubmit).toHaveBeenCalledWith({ kind: 'memo', page: '88', text: '下書き', comment: '' });
    expect(onClose).toHaveBeenCalled();
    expect(data.has('noteDraft.v1.r1')).toBe(false);
  });

  it('引用のひとことも渡す', async () => {
    const { onSubmit } = await setup();
    await ready();
    await fireEvent.press(screen.getByRole('tab', { name: '引用' }));
    await fireEvent.changeText(screen.getByLabelText('本文'), '一文');
    await fireEvent.changeText(screen.getByLabelText('ひとこと'), 'いい');
    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: '残す' }));
    });
    expect(onSubmit).toHaveBeenCalledWith({ kind: 'quote', page: '', text: '一文', comment: 'いい' });
  });

  it('保存に失敗したらエラーを出し、閉じず入力も残す', async () => {
    const { onClose, onSubmit } = await setup();
    onSubmit.mockRejectedValue(new Error('x'));
    await ready();
    await fireEvent.changeText(screen.getByLabelText('本文'), '本文');
    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: '残す' }));
    });
    expect(screen.getByText('保存できませんでした。もう一度お試しください')).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByLabelText('本文').props.value).toBe('本文');
  });

  it('書きかけで閉じると下書きを保存し、開き直すと復元される', async () => {
    const { onClose, store, rerender } = await setup();
    await ready();
    await fireEvent.press(screen.getByRole('tab', { name: '引用' }));
    await fireEvent.changeText(screen.getByLabelText('本文'), '書きかけ');
    await fireEvent.press(screen.getByRole('button', { name: '閉じる' }));
    expect(onClose).toHaveBeenCalled();
    await waitFor(async () => expect(await store.load('r1')).toMatchObject({ kind: 'quote', text: '書きかけ' }));
    await rerender(false);
    await rerender(true);
    await waitFor(() => expect(screen.getByLabelText('本文').props.value).toBe('書きかけ'));
    expect(screen.getByRole('tab', { name: '引用', selected: true })).toBeTruthy();
  });

  it('背景タップでも下書きを保存する。すべて空なら下書きを消す', async () => {
    const { store } = await setup({}, {
      'noteDraft.v1.r1': JSON.stringify({ kind: 'memo', page: '', text: 'a', comment: '' }),
    });
    await waitFor(() => expect(screen.getByLabelText('本文').props.value).toBe('a'));
    await fireEvent.changeText(screen.getByLabelText('本文'), '');
    await fireEvent.press(screen.getByTestId('bottom-sheet-scrim', { includeHiddenElements: true }));
    await waitFor(async () => expect(await store.load('r1')).toBeNull());
  });

  it('下書きの保存・読み込みに失敗しても落ちない', async () => {
    const failing = {
      load: jest.fn().mockRejectedValue(new Error('x')),
      save: jest.fn().mockRejectedValue(new Error('x')),
      clear: jest.fn().mockRejectedValue(new Error('x')),
    };
    const onClose = jest.fn();
    await render(
      withNoteDraftStore(
        failing,
        <NoteSheet visible bookTitle="T" recordId="r1" onSubmit={jest.fn().mockResolvedValue(undefined)} onClose={onClose} />,
      ),
    );
    await ready();
    await fireEvent.changeText(screen.getByLabelText('本文'), 'a');
    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: '残す' }));
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('NoteSheet（編集）', () => {
  const editing = { kind: 'quote' as const, page: '12', text: '元の文', comment: '元のひとこと' };

  it('見出し・初期値・「保存する」を出し、下書きは読まず・書かない', async () => {
    const { onClose, data } = await setup({ editing }, {
      'noteDraft.v1.r1': JSON.stringify({ kind: 'memo', page: '', text: '別の下書き', comment: '' }),
    });
    expect(screen.getByText('引用を直す')).toBeTruthy();
    expect(screen.getByLabelText('本文').props.value).toBe('元の文');
    expect(screen.getByLabelText('ページ').props.value).toBe('12');
    expect(screen.getByLabelText('ひとこと').props.value).toBe('元のひとこと');
    await fireEvent.changeText(screen.getByLabelText('本文'), '変えた');
    await fireEvent.press(screen.getByRole('button', { name: '閉じる' }));
    expect(onClose).toHaveBeenCalled();
    expect(data.get('noteDraft.v1.r1')).toContain('別の下書き');
    expect(screen.getByRole('button', { name: '保存する' })).toBeTruthy();
  });

  it('削除は確認を経る。キャンセルでは何も消えない', async () => {
    const onDelete = jest.fn().mockResolvedValue(undefined);
    const { onClose } = await setup({ editing: { ...editing, kind: 'memo' }, onDelete });
    await fireEvent.press(screen.getByRole('button', { name: '削除' }));
    expect(screen.getByText('このメモを削除しますか？')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'キャンセル' }));
    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.getByLabelText('本文')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: '削除' }));
    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: '削除する' }));
    });
    expect(onDelete).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('削除に失敗したらエラーを出して閉じない', async () => {
    const onDelete = jest.fn().mockRejectedValue(new Error('x'));
    const { onClose } = await setup({ editing, onDelete });
    await fireEvent.press(screen.getByRole('button', { name: '削除' }));
    expect(screen.getByText('この引用を削除しますか？')).toBeTruthy();
    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: '削除する' }));
    });
    expect(screen.getByText('削除できませんでした。もう一度お試しください')).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe('NoteSheet（入力欄のフォーカス）', () => {
  it('ページ・本文・ひとことはフォーカスとブラーを繰り返しても入力できる', async () => {
    await setup();
    await ready();
    await fireEvent.press(screen.getByRole('tab', { name: '引用' }));
    for (const name of ['ページ', '本文', 'ひとこと']) {
      const input = screen.getByLabelText(name);
      await fireEvent(input, 'focus');
      await fireEvent.changeText(input, '1');
      await fireEvent(input, 'blur');
      expect(screen.getByLabelText(name).props.value).toBe('1');
    }
  });
});

describe('NoteSheet（タイトル行）', () => {
  it('本のタイトルと「閉じる」が同じ行に出る', async () => {
    await setup();
    await ready();
    const title = screen.getByText('吾輩は猫である');
    const row = title.parent;
    let node = screen.getByRole('button', { name: '閉じる' }).parent;
    while (node && node !== row) node = node.parent;
    expect(node).toBe(row);
  });
});

describe('NoteSheet（開いたら本文にフォーカス）', () => {
  const editing = { kind: 'memo' as const, page: '', text: '元の文', comment: '' };
  const slide = () => act(() => jest.advanceTimersByTime(SLIDE_DURATION));
  let focusSpy: jest.SpyInstance;
  const focused = () => {
    const calls = focusSpy.mock.contexts as { props?: { accessibilityLabel?: string } }[];
    return calls.some((c) => c?.props?.accessibilityLabel === '本文');
  };

  beforeEach(() => {
    jest.useFakeTimers();
    focusSpy = jest.spyOn(TextInput.prototype, 'focus').mockImplementation(() => undefined);
    focusSpy.mockClear();
  });
  afterEach(() => {
    focusSpy.mockRestore();
    jest.useRealTimers();
  });

  it('動きのあとに本文へフォーカスする。それまでは当てない', async () => {
    await setup({ editing });
    expect(focused()).toBe(false);
    await slide();
    expect(focused()).toBe(true);
  });

  it('下書きの読み込み後に本文へフォーカスする', async () => {
    await setup({}, { 'noteDraft.v1.r1': JSON.stringify({ kind: 'memo', page: '', text: '途中', comment: '' }) });
    await ready();
    await slide();
    expect(focused()).toBe(true);
  });

  it('編集でもフォーカスし、カーソルは末尾。動かしたあとは固定しない', async () => {
    await setup({ editing });
    await ready();
    expect(screen.getByLabelText('本文').props.selection).toEqual({ start: 3, end: 3 });
    await slide();
    expect(focused()).toBe(true);
    await fireEvent(screen.getByLabelText('本文'), 'selectionChange', {
      nativeEvent: { selection: { start: 1, end: 1 } },
    });
    expect(screen.getByLabelText('本文').props.selection).toBeUndefined();
  });

  it('メモ⇄引用でも本文の欄は作り直されず、フォーカスし直す', async () => {
    await setup();
    await ready();
    await slide();
    const before = screen.getByLabelText('本文');
    focusSpy.mockClear();
    await fireEvent.press(screen.getByRole('tab', { name: '引用' }));
    expect(screen.getByLabelText('本文')).toBe(before);
    expect(focused()).toBe(true);
    await fireEvent.press(screen.getByRole('tab', { name: 'メモ' }));
    expect(screen.getByLabelText('本文')).toBe(before);
  });

  it('削除確認からキャンセルで戻ると、もう一度フォーカスする', async () => {
    await setup({ editing, onDelete: jest.fn() });
    await ready();
    await slide();
    await fireEvent.press(screen.getByRole('button', { name: '削除' }));
    focusSpy.mockClear();
    await fireEvent.press(screen.getByRole('button', { name: 'キャンセル' }));
    await slide();
    expect(focused()).toBe(true);
  });

  it('閉じて開き直すと、もう一度フォーカスする', async () => {
    const { rerender } = await setup();
    await ready();
    await slide();
    await rerender(false);
    focusSpy.mockClear();
    await rerender(true);
    await ready();
    await slide();
    expect(focused()).toBe(true);
  });
});
