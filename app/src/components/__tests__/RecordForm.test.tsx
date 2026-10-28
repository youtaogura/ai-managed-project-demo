import { act, fireEvent, render as rtlRender, screen, waitFor } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import { colors, size, space } from '../../design/tokens';
import { withRepository } from '../../testProviders';
import { createFakeRepository, createMemoryStorage, makeRecord } from '../../testUtils';
import { createShelfRepository } from '../../lib/shelfRepository';
import { RecordForm } from '../RecordForm';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const render = (ui: ReactElement) => rtlRender(withRepository(createFakeRepository().repository, ui));

// 初回レンダリングが CI の遅い環境で 5 秒を超えることがあるため延長する
jest.setTimeout(30000);

beforeEach(() => {
  jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] });
  jest.setSystemTime(new Date(2024, 4, 10, 12, 0, 0));
});
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

const press = (name: string) => fireEvent.press(screen.getByRole('button', { name }));
const type = (label: string, text: string) => fireEvent.changeText(screen.getByLabelText(label), text);
const flat = (node: { props: { style?: unknown } }) =>
  StyleSheet.flatten(node.props.style as never) as Record<string, unknown>;

describe('RecordForm', () => {
  it('タイトルが空（空白のみ）だと保存せずエラーを表示し、入力すると消える', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    await render(<RecordForm onSubmit={onSubmit} />);
    await type('タイトル（必須）', '  ');
    await press('棚に並べる');
    expect(screen.getByText('タイトルを入力してください')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
    await type('タイトル（必須）', 'あ');
    expect(screen.queryByText('タイトルを入力してください')).toBeNull();
  });

  it('入力値が NewRecordInput として onSubmit に渡る（色は初期値）', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    await render(<RecordForm onSubmit={onSubmit} initialSpineColor="spine-4" />);
    await type('タイトル（必須）', ' 吾輩は猫である ');
    await type('作者・著者', '夏目漱石');
    await type('出版社', '新潮社');
    await type('ISBN', '9784101010013');
    await press('棚に並べる');
    expect(onSubmit).toHaveBeenCalledWith({
      title: '吾輩は猫である',
      creator: '夏目漱石',
      publisher: '新潮社',
      isbn: '9784101010013',
      coverUrl: null,
      photoUri: null,
      startDate: null,
      endDate: null,
      status: 'planned',
      rating: null,
      spineColor: 'spine-4',
      source: { provider: 'manual' },
      oneLiner: null,
      postReadMemos: [],
      quotes: [],
      memos: [],
      favorite: false,
      shelfIds: [],
    });
  });

  it('感想・評価・写真の欄は出ない', async () => {
    await render(<RecordForm onSubmit={jest.fn()} />);
    expect(screen.queryByText('感想', { exact: false })).toBeNull();
    expect(screen.queryByText('写真', { exact: false })).toBeNull();
    expect(screen.queryByLabelText('レーティング')).toBeNull();
    expect(screen.queryByText('評価', { exact: false })).toBeNull();
  });

  it('見出しは「タイトル（必須）」で、出版社・ISBN は 2 列', async () => {
    await render(<RecordForm onSubmit={jest.fn()} />);
    expect(screen.getByText('タイトル（必須）')).toBeTruthy();
    const publisherCell = screen.getByLabelText('出版社').parent?.parent;
    const isbnCell = screen.getByLabelText('ISBN').parent?.parent;
    expect(publisherCell?.parent).toBe(isbnCell?.parent);
    expect(flat(publisherCell?.parent ?? { props: {} }).flexDirection).toBe('row');
  });

  it('編集のとき、フォームにない項目（評価・写真・書影・ひとこと・読後メモなど）をそのまま引き継ぐ', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    const postReadMemos = [{ id: 'p', text: 'は、続き', createdAt: '2024-01-01T00:00:00.000Z' }];
    await render(
      <RecordForm
        initialValues={{
          title: '本',
          rating: 4.5,
          photoUri: 'file:///p.jpg',
          coverUrl: 'http://c',
          oneLiner: 'よかった',
          postReadMemos,
          favorite: true,
        }}
        onSubmit={onSubmit}
      />,
    );
    await press('棚に並べる');
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        rating: 4.5,
        photoUri: 'file:///p.jpg',
        coverUrl: 'http://c',
        oneLiner: 'よかった',
        postReadMemos,
        favorite: true,
      }),
    );
  });

  describe('背表紙の色', () => {
    const spineFace = () => flat(screen.getByRole('image')).backgroundColor;

    it('プレビューの背表紙が出て、タイトルを入力すると変わる', async () => {
      await render(<RecordForm onSubmit={jest.fn()} initialSpineColor="spine-2" />);
      expect(spineFace()).toBe(colors.spine2);
      await type('タイトル（必須）', '山月記');
      expect(screen.getByLabelText('山月記、読みたい')).toBeTruthy();
    });

    it('10 色の丸が並び、押すとプレビューの色が変わり、保存される', async () => {
      const onSubmit = jest.fn().mockResolvedValue(undefined);
      await render(<RecordForm onSubmit={onSubmit} initialValues={{ title: 'a' }} initialSpineColor="spine-1" />);
      expect(screen.getAllByRole('radio', { name: /^背表紙の色 / })).toHaveLength(10);
      expect(screen.getByRole('radio', { name: '背表紙の色 1' })).toBeSelected();
      await fireEvent.press(screen.getByRole('radio', { name: '背表紙の色 9' }));
      expect(screen.getByRole('radio', { name: '背表紙の色 9' })).toBeSelected();
      expect(spineFace()).toBe(colors.spine9);
      await press('棚に並べる');
      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ spineColor: 'spine-9' }));
    });

    it('編集では記録の色が初期値（initialSpineColor より優先）', async () => {
      const onSubmit = jest.fn().mockResolvedValue(undefined);
      await render(
        <RecordForm
          onSubmit={onSubmit}
          recordId="r1"
          initialValues={{ title: 'a', spineColor: 'spine-6' }}
          initialSpineColor="spine-1"
        />,
      );
      expect(spineFace()).toBe(colors.spine6);
      await press('棚に並べる');
      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ spineColor: 'spine-6' }));
    });

    it('色の丸はタップ領域が touchMin 以上', async () => {
      await render(<RecordForm onSubmit={jest.fn()} />);
      const radio = screen.getByRole('radio', { name: '背表紙の色 2' });
      const slop = Number(radio.props.hitSlop);
      expect(Number(flat(radio).width) + slop * 2).toBeGreaterThanOrEqual(size.touchMin);
    });
  });

  describe('日付', () => {
    const dateButton = (label: string, value = '—') =>
      screen.getByRole('button', { name: `${label} ${value}` });

    it('空のときは「—」を表示し、シートで今日・決定ができる', async () => {
      await render(<RecordForm onSubmit={jest.fn()} />);
      expect(dateButton('読み始めた日')).toBeTruthy();
      expect(dateButton('読み終えた日')).toBeTruthy();
      await fireEvent.press(dateButton('読み始めた日'));
      await press('今日');
      await press('決定');
      expect(dateButton('読み始めた日', '2024/05/10')).toBeTruthy();
    });

    it('シートの変更は決定まで反映されず、クリアで空になる', async () => {
      await render(<RecordForm onSubmit={jest.fn()} initialValues={{ startDate: '2024-01-31' }} />);
      await fireEvent.press(dateButton('読み始めた日', '2024/01/31'));
      await press('月を増やす');
      expect(screen.getByText('2月')).toBeTruthy();
      expect(screen.getByText('29日')).toBeTruthy();
      await press('日を増やす');
      expect(screen.getByText('1日')).toBeTruthy();
      expect(dateButton('読み始めた日', '2024/01/31')).toBeTruthy();
      await press('クリア');
      await press('決定');
      expect(dateButton('読み始めた日')).toBeTruthy();
    });

    it('見出しは読書の文言で、ヒントは選択中のステータスに合わせて出る', async () => {
      await render(<RecordForm onSubmit={jest.fn()} />);
      expect(screen.queryByText(/今日が入ります/)).toBeNull();
      expect(screen.getByLabelText('作者・著者')).toBeTruthy();
      await fireEvent.press(screen.getByRole('radio', { name: '読んでる' }));
      expect(screen.getByText('「読んでる」を選ぶと、読み始めた日に今日が入ります')).toBeTruthy();
      await fireEvent.press(screen.getByRole('radio', { name: '読み終わった' }));
      expect(screen.getByText('「読み終わった」を選ぶと、終えた日に今日が入ります')).toBeTruthy();
    });

    it('「読み終わった」から「読んでる」に変えると終えた日が空になり、「読みたい」で両方空になる', async () => {
      await render(<RecordForm onSubmit={jest.fn()} initialValues={{ status: 'completed' }} />);
      await fireEvent.press(screen.getByRole('radio', { name: '読んでる' }));
      expect(dateButton('読み始めた日', '2024/05/10')).toBeTruthy();
      expect(dateButton('読み終えた日')).toBeTruthy();
      await fireEvent.press(screen.getByRole('radio', { name: '読みたい' }));
      expect(dateButton('読み始めた日')).toBeTruthy();
      expect(dateButton('読み終えた日')).toBeTruthy();
    });

    it('編集で「読み終わった」から「読んでる」に変えて保存すると endDate が null になる', async () => {
      const onSubmit = jest.fn();
      await render(
        <RecordForm
          onSubmit={onSubmit}
          initialValues={{ title: 'a', status: 'completed', startDate: '2024-01-01', endDate: '2024-02-01' }}
        />,
      );
      await fireEvent.press(screen.getByRole('radio', { name: '読んでる' }));
      await press('棚に並べる');
      await waitFor(() => expect(onSubmit).toHaveBeenCalled());
      expect(onSubmit.mock.calls[0][0]).toMatchObject({
        status: 'in_progress',
        startDate: '2024-01-01',
        endDate: null,
      });
    });

    it('終えた日が開始日より前だとエラーを表示し保存しない', async () => {
      const onSubmit = jest.fn();
      await render(
        <RecordForm
          onSubmit={onSubmit}
          initialValues={{ title: 'a', startDate: '2024-03-02', endDate: '2024-03-01' }}
        />,
      );
      await press('棚に並べる');
      expect(screen.getByText('終了日は開始日以降にしてください')).toBeTruthy();
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('ステータス変更で空の日付に今日が入り、入力済みは変わらない', async () => {
      await render(<RecordForm onSubmit={jest.fn()} />);
      await fireEvent.press(screen.getByRole('radio', { name: '読んでる' }));
      expect(dateButton('読み始めた日', '2024/05/10')).toBeTruthy();
      await fireEvent.press(screen.getByRole('radio', { name: '読み終わった' }));
      expect(dateButton('読み終えた日', '2024/05/10')).toBeTruthy();
      await fireEvent.press(dateButton('読み始めた日', '2024/05/10'));
      await press('日を減らす');
      await press('決定');
      await fireEvent.press(screen.getByRole('radio', { name: '途中でやめた' }));
      expect(dateButton('読み始めた日', '2024/05/09')).toBeTruthy();
      expect(dateButton('読み終えた日', '2024/05/10')).toBeTruthy();
    });

    it('年を増減できる', async () => {
      await render(<RecordForm onSubmit={jest.fn()} />);
      await fireEvent.press(dateButton('読み終えた日'));
      await press('年を減らす');
      expect(screen.getByText('2023年')).toBeTruthy();
      await press('年を増やす');
      await press('月を減らす');
      await press('日を減らす');
      expect(screen.getByText('4月')).toBeTruthy();
      expect(screen.getByText('9日')).toBeTruthy();
    });
  });

  it('ステータスは 4 つのチップの単一選択（radio）', async () => {
    await render(<RecordForm onSubmit={jest.fn()} />);
    for (const name of ['読みたい', '読んでる', '途中でやめた', '読み終わった']) {
      expect(screen.getByRole('radio', { name })).toBeTruthy();
    }
    expect(screen.getByRole('radio', { name: '読みたい' })).toBeSelected();
    await fireEvent.press(screen.getByRole('radio', { name: '読んでる' }));
    expect(screen.getByRole('radio', { name: '読みたい' })).not.toBeSelected();
    expect(screen.getByRole('radio', { name: '読んでる' })).toBeSelected();
  });

  it('取得した値が入力済みになり、保存される', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    await render(
      <RecordForm
        onSubmit={onSubmit}
        initialValues={{ title: 'T', creator: 'C', publisher: 'P', isbn: 'I', coverUrl: 'http://c' }}
      />,
    );
    expect(screen.getByLabelText('タイトル（必須）').props.value).toBe('T');
    expect(screen.getByLabelText('作者・著者').props.value).toBe('C');
    expect(screen.getByLabelText('出版社').props.value).toBe('P');
    expect(screen.getByLabelText('ISBN').props.value).toBe('I');
    await press('棚に並べる');
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ isbn: 'I', coverUrl: 'http://c' }));
  });

  it('保存失敗でメッセージを表示し入力値を保持する', async () => {
    const onSubmit = jest.fn().mockRejectedValue(new Error('x'));
    await render(<RecordForm onSubmit={onSubmit} initialValues={{ title: 'keep' }} />);
    await press('棚に並べる');
    expect(await screen.findByText('保存に失敗しました')).toBeTruthy();
    expect(screen.getByLabelText('タイトル（必須）').props.value).toBe('keep');
  });

  it('作者・著者を入力して保存すると creator として渡る', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    await render(<RecordForm onSubmit={onSubmit} />);
    await type('タイトル（必須）', 'あ');
    await type('作者・著者', '夏目漱石');
    await press('棚に並べる');
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ title: 'あ', creator: '夏目漱石' }));
  });

  it('onDelete があれば「この本を削除」ボタンを出す', async () => {
    await render(<RecordForm onSubmit={jest.fn()} onDelete={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'この本を削除' })).toBeTruthy();
  });

  it('onDelete がなければ削除ボタンを出さない', async () => {
    await render(<RecordForm onSubmit={jest.fn()} />);
    expect(screen.queryByRole('button', { name: 'この本を削除' })).toBeNull();
  });

  it('保存中は主ボタンが無効になり、処理中が出て、二重に呼ばれない', async () => {
    let resolve: () => void = () => undefined;
    const onSubmit = jest.fn(() => new Promise<void>((r) => (resolve = r)));
    await render(<RecordForm onSubmit={onSubmit} initialValues={{ title: 'a' }} />);
    await press('棚に並べる');
    const button = screen.getByRole('button', { name: '棚に並べる' });
    expect(button.props.accessibilityState.disabled).toBe(true);
    expect(screen.getByLabelText('処理中')).toBeTruthy();
    await fireEvent.press(button);
    expect(onSubmit).toHaveBeenCalledTimes(1);
    await act(async () => resolve());
  });

  it('保存後に onSaved が呼ばれる', async () => {
    const onSaved = jest.fn();
    await render(
      <RecordForm onSubmit={jest.fn().mockResolvedValue(undefined)} onSaved={onSaved} initialValues={{ title: 'a' }} />,
    );
    await press('棚に並べる');
    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  it('主ボタンのラベルは submitLabel で変えられる', async () => {
    await render(<RecordForm onSubmit={jest.fn()} submitLabel="保存する" />);
    expect(screen.getByRole('button', { name: '保存する' })).toBeTruthy();
  });

  it('フッターの下端にセーフエリアの余白が入る', async () => {
    await rtlRender(
      <SafeAreaInsetsContext.Provider value={{ top: 0, left: 0, right: 0, bottom: 34 }}>
        {withRepository(createFakeRepository().repository, <RecordForm onSubmit={jest.fn()} />)}
      </SafeAreaInsetsContext.Provider>,
    );
    let node = screen.getByRole('button', { name: '棚に並べる' }).parent;
    let padding: number | undefined;
    while (node && padding === undefined) {
      const style = StyleSheet.flatten(node.props.style) as { paddingBottom?: number } | undefined;
      padding = style?.paddingBottom;
      node = node.parent;
    }
    expect(padding).toBe(space[3] + 34);
  });

  describe('削除', () => {
    const open = async (onDelete: () => Promise<void>, onDeleted?: () => void) => {
      await render(
        <RecordForm
          onSubmit={jest.fn()}
          onDelete={onDelete}
          onDeleted={onDeleted}
          initialValues={{ title: '吾輩' }}
        />,
      );
      await press('この本を削除');
    };

    it('確認シートに記録名が出て、「削除する」で onDelete と onDeleted が呼ばれる', async () => {
      const onDelete = jest.fn().mockResolvedValue(undefined);
      const onDeleted = jest.fn();
      await open(onDelete, onDeleted);
      expect(screen.getByText('「吾輩」の記録（メモ・引用・読後メモを含む）が削除されます。元に戻せません。')).toBeTruthy();
      await act(async () => press('削除する'));
      expect(onDelete).toHaveBeenCalledTimes(1);
      expect(onDeleted).toHaveBeenCalledTimes(1);
    });

    it('「キャンセル」では onDelete が呼ばれない', async () => {
      const onDelete = jest.fn();
      await open(onDelete);
      await press('キャンセル');
      expect(onDelete).not.toHaveBeenCalled();
    });

    it('削除失敗でメッセージを表示し、onDeleted は呼ばれない', async () => {
      const onDeleted = jest.fn();
      await open(jest.fn().mockRejectedValue(new Error('x')), onDeleted);
      await act(async () => press('削除する'));
      expect(screen.getByText('削除に失敗しました')).toBeTruthy();
      expect(onDeleted).not.toHaveBeenCalled();
    });
  });
});

describe('RecordForm の本棚', () => {
  async function setupShelves(props: Partial<React.ComponentProps<typeof RecordForm>> = {}) {
    const shelfRepository = createShelfRepository(createMemoryStorage().storage);
    await shelfRepository.importShelves(
      [
        { id: 'a', name: 'SF', order: 0 },
        { id: 'b', name: '哲学', order: 1 },
      ],
      'replace',
    );
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    await rtlRender(
      withRepository(
        createFakeRepository([makeRecord({ id: 'r1', shelfIds: ['a'] }), makeRecord({ id: 'r2', shelfIds: ['a', 'b'] })])
          .repository,
        <RecordForm onSubmit={onSubmit} initialValues={{ title: '本' }} {...props} />,
        shelfRepository,
      ),
    );
    return { onSubmit };
  }

  it('本棚がチップで出て、入れていないものは未選択。「すべての本」の説明も出る', async () => {
    await setupShelves();
    expect(await screen.findByRole('checkbox', { name: 'SF' })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: '哲学' })).not.toBeChecked();
    expect(screen.getByText('「すべての本」にはいつも入ります')).toBeTruthy();
  });

  it('編集のとき初期値の本棚が選択済みで、存在しない ID は出さない', async () => {
    await setupShelves({ initialValues: { title: '本', shelfIds: ['b', 'gone', 'a'] } });
    expect(await screen.findByRole('checkbox', { name: 'SF' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: '哲学' })).toBeChecked();
    expect(screen.getAllByRole('checkbox')).toHaveLength(2);
  });

  it('押すと入り切りでき、保存で shelfIds が入る。存在しない ID は保存しない', async () => {
    const { onSubmit } = await setupShelves({ initialValues: { title: '本', shelfIds: ['gone'] } });
    await fireEvent.press(await screen.findByRole('checkbox', { name: '哲学' }));
    await fireEvent.press(screen.getByRole('checkbox', { name: 'SF' }));
    await fireEvent.press(screen.getByRole('checkbox', { name: '哲学' }));
    await fireEvent.press(screen.getByRole('checkbox', { name: '哲学' }));
    expect(screen.getByRole('checkbox', { name: '哲学' })).toBeChecked();
    await press('棚に並べる');
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ shelfIds: ['a', 'b'] })));
  });

  it('「＋ 本棚を作る」で作成シートが開き、作ると新しい本棚が選択される', async () => {
    const { onSubmit } = await setupShelves();
    await fireEvent.press(await screen.findByRole('button', { name: '本棚を作る' }));
    await fireEvent.changeText(await screen.findByLabelText('名前'), '歴史');
    await fireEvent.press(screen.getByRole('button', { name: '作る' }));
    expect(await screen.findByRole('checkbox', { name: '歴史' })).toBeChecked();
    await press('棚に並べる');
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ shelfIds: [expect.any(String)] })),
    );
  });
});
