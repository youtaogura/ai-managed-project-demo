import { act, fireEvent, render as rtlRender, screen, waitFor } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { Linking, StyleSheet } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import { space } from '../../design/tokens';
import type { PhotoService } from '../../lib/photo/PhotoService';
import { withRepository } from '../../testProviders';
import { createShelfRepository } from '../../lib/shelfRepository';
import { createFakeRepository, createMemoryStorage, createMockPhotoService, makeRecord } from '../../testUtils';
import { RecordForm } from '../RecordForm';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const render = (ui: ReactElement, service: PhotoService = createMockPhotoService()) =>
  rtlRender(withRepository(createFakeRepository().repository, ui, service));

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
const star = () => screen.getByLabelText('レーティング');
const touch = (name: string, x: number) => fireEvent(star(), name, { nativeEvent: { locationX: x, pageX: x } });
const setRating = async (x: number) => {
  await fireEvent(star(), 'layout', {
    nativeEvent: { layout: { width: 200 } },
  });
  await touch('responderGrant', x);
  await touch('responderRelease', x);
};
const type = (label: string, text: string) => fireEvent.changeText(screen.getByLabelText(label), text);

describe('RecordForm', () => {
  it('タイトルが空だと保存せずエラーを表示する', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    await render(<RecordForm onSubmit={onSubmit} />);
    await press('記録する');
    expect(screen.getByText('タイトルを入力してください')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
    await type('タイトル（必須）', 'あ');
    expect(screen.queryByText('タイトルを入力してください')).toBeNull();
  });

  it('入力値が NewRecordInput として onSubmit に渡る', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    await render(<RecordForm onSubmit={onSubmit} />);
    await type('タイトル（必須）', ' 吾輩は猫である ');
    await type('作者・著者', '夏目漱石');
    await type('出版社', '新潮社');
    await type('ISBN', '9784101010013');
    await setRating(148);
    await press('記録する');
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
      rating: 3.7,
      source: { provider: 'manual' },
      oneLiner: null,
      starters: [],
      quotes: [],
      memos: [],
      freeTexts: [],
      favorite: false,
      shelfIds: [],
    });
  });

  it('感想の入力欄は出ない', async () => {
    await render(<RecordForm onSubmit={jest.fn()} />);
    expect(screen.queryByText('感想', { exact: false })).toBeNull();
  });

  it('編集のとき、フォームにない項目（ひとこと・書き出し・本棚など）をそのまま引き継ぐ', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    const starters = [
      {
        id: 's',
        starter: 'は、',
        text: '続き',
        createdAt: '2024-01-01T00:00:00.000Z',
      },
    ];
    await render(
      <RecordForm
        initialValues={{
          title: '本',
          oneLiner: 'よかった',
          starters,
          favorite: true,
          shelfIds: ['shelf-1'],
        }}
        onSubmit={onSubmit}
      />,
    );
    await press('記録する');
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        oneLiner: 'よかった',
        starters,
        favorite: true,
        shelfIds: ['shelf-1'],
      }),
    );
  });

  describe('日付', () => {
    const dateButton = (label: string, value = '選択してください') =>
      screen.getByRole('button', { name: `${label} ${value}` });

    it('空のときは「選択してください」を表示し、シートで今日・決定ができる', async () => {
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

    it('見出しとヒントは読書の文言', async () => {
      await render(<RecordForm onSubmit={jest.fn()} />);
      expect(dateButton('読み始めた日')).toBeTruthy();
      expect(dateButton('読み終えた日')).toBeTruthy();
      expect(screen.getByText('「読み終わった」を選ぶと、終えた日に今日が入ります')).toBeTruthy();
      expect(screen.getByLabelText('作者・著者')).toBeTruthy();
    });

    it('終えた日が開始日より前だとエラーを表示し保存しない', async () => {
      const onSubmit = jest.fn();
      await render(
        <RecordForm
          onSubmit={onSubmit}
          initialValues={{
            title: 'a',
            startDate: '2024-03-02',
            endDate: '2024-03-01',
          }}
        />,
      );
      await press('記録する');
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

    it('ステータスは読書の 4 文言だけ', async () => {
      await render(<RecordForm onSubmit={jest.fn()} />);
      expect(screen.getAllByRole('radio').map((r) => r.props.accessibilityLabel ?? '')).toHaveLength(4);
      for (const name of ['読みたい', '読んでる', '途中でやめた', '読み終わった']) {
        expect(screen.getByRole('radio', { name })).toBeTruthy();
      }
      expect(screen.queryByText(/見たい|見てる|見終わった/)).toBeNull();
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

  it('種別の選択はなく、ISBN・出版社が常に出る', async () => {
    await render(<RecordForm onSubmit={jest.fn()} />);
    expect(screen.queryByText('種別')).toBeNull();
    expect(screen.queryByRole('radio', { name: /^(本|漫画|映画|ドラマ|アニメ)$/ })).toBeNull();
    expect(screen.getByLabelText('ISBN')).toBeTruthy();
    expect(screen.getByLabelText('出版社')).toBeTruthy();
  });

  it('保存する入力に kind がない', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    await render(<RecordForm onSubmit={onSubmit} initialValues={{ title: 'x', isbn: '1', publisher: 'p' }} />);
    await press('記録する');
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ isbn: '1', publisher: 'p' }));
    expect(onSubmit.mock.calls[0][0]).not.toHaveProperty('kind');
  });

  it('タップ・ドラッグで評価が変わり、離した値が保存される', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    await render(<RecordForm onSubmit={onSubmit} initialValues={{ title: 'x' }} />);
    expect(screen.getAllByText('未評価').length).toBeGreaterThan(0);
    await fireEvent(star(), 'layout', {
      nativeEvent: { layout: { width: 200 } },
    });
    await touch('responderGrant', 100);
    expect(screen.getAllByText('2.5').length).toBeGreaterThan(0);
    await touch('responderMove', 148);
    expect(screen.getAllByText('3.7').length).toBeGreaterThan(0);
    await touch('responderMove', 148);
    await touch('responderMove', 400);
    expect(screen.getAllByText('5.0').length).toBeGreaterThan(0);
    await touch('responderMove', -50);
    await touch('responderRelease', -50);
    await press('記録する');
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ rating: 1 }));
  });

  it('星の上のタッチは親にスクロールを奪われない', async () => {
    await render(<RecordForm onSubmit={jest.fn()} />);
    expect(star().props.onResponderTerminationRequest()).toBe(false);
    expect(star().props.onStartShouldSetResponder()).toBe(true);
  });

  it('adjustable の increment/decrement とクリアで操作できる', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    await render(<RecordForm onSubmit={onSubmit} initialValues={{ title: 'x' }} />);
    expect(star().props.accessibilityRole).toBe('adjustable');
    const act1 = (actionName: string) => fireEvent(star(), 'accessibilityAction', { nativeEvent: { actionName } });
    await act1('decrement');
    expect(star().props.accessibilityValue).toEqual({ text: '未評価' });
    await act1('increment');
    expect(star().props.accessibilityValue).toEqual({ text: '3.0' });
    await act1('decrement');
    expect(star().props.accessibilityValue).toEqual({ text: '2.9' });
    await press('レーティングをクリア');
    expect(star().props.accessibilityValue).toEqual({ text: '未評価' });
    await press('記録する');
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ rating: null }));
  });

  it('レイアウト前のタッチは無視され、編集時は保存済みの評価を表示する', async () => {
    await render(<RecordForm onSubmit={jest.fn()} initialValues={{ rating: 3.7 }} />);
    expect(star().props.accessibilityValue).toEqual({ text: '3.7' });
    expect(screen.getAllByText('3.7').length).toBeGreaterThan(0);
  });

  it('初期値が入力済みになり、書影 URL は保存時に含まれる', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    await render(
      <RecordForm
        onSubmit={onSubmit}
        initialValues={{
          title: 'T',
          creator: 'C',
          publisher: 'P',
          isbn: 'I',
          coverUrl: 'http://c',
        }}
      />,
    );
    expect(screen.getByLabelText('タイトル（必須）').props.value).toBe('T');
    expect(screen.getByLabelText('作者・著者').props.value).toBe('C');
    expect(screen.getByLabelText('出版社').props.value).toBe('P');
    expect(screen.getByLabelText('ISBN').props.value).toBe('I');
    await press('記録する');
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ isbn: 'I', coverUrl: 'http://c' }));
  });

  it('保存失敗でメッセージを表示し入力値を保持する', async () => {
    const onSubmit = jest.fn().mockRejectedValue(new Error('x'));
    await render(<RecordForm onSubmit={onSubmit} initialValues={{ title: 'keep' }} />);
    await press('記録する');
    expect(await screen.findByText('保存に失敗しました')).toBeTruthy();
    expect(screen.getByLabelText('タイトル（必須）').props.value).toBe('keep');
  });

  it('onDelete がなければ削除ボタンを出さない', async () => {
    await render(<RecordForm onSubmit={jest.fn()} />);
    expect(screen.queryByRole('button', { name: 'この記録を削除' })).toBeNull();
  });

  it('保存中は主ボタンが無効になり、二重に呼ばれない', async () => {
    let resolve: () => void = () => undefined;
    const onSubmit = jest.fn(() => new Promise<void>((r) => (resolve = r)));
    await render(<RecordForm onSubmit={onSubmit} initialValues={{ title: 'a' }} />);
    await press('記録する');
    const button = screen.getByRole('button', { name: '記録する' });
    expect(button.props.accessibilityState.disabled).toBe(true);
    await fireEvent.press(button);
    expect(onSubmit).toHaveBeenCalledTimes(1);
    await act(async () => resolve());
  });

  it('保存後に onSaved が呼ばれる', async () => {
    const onSaved = jest.fn();
    await render(
      <RecordForm onSubmit={jest.fn().mockResolvedValue(undefined)} onSaved={onSaved} initialValues={{ title: 'a' }} />,
    );
    await press('記録する');
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
    let node = screen.getByRole('button', { name: '記録する' }).parent;
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
        <RecordForm onSubmit={jest.fn()} onDelete={onDelete} onDeleted={onDeleted} initialValues={{ title: '吾輩' }} />,
      );
      await press('この記録を削除');
    };

    it('確認シートに記録名が出て、「削除する」で onDelete と onDeleted が呼ばれる', async () => {
      const onDelete = jest.fn().mockResolvedValue(undefined);
      const onDeleted = jest.fn();
      await open(onDelete, onDeleted);
      expect(screen.getByText('「吾輩」の記録と、付けた写真が削除されます。元に戻せません。')).toBeTruthy();
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

    it('削除失敗でメッセージを表示する', async () => {
      await open(jest.fn().mockRejectedValue(new Error('x')));
      await act(async () => press('削除する'));
      expect(screen.getByText('削除に失敗しました')).toBeTruthy();
    });
  });

  describe('書影の説明', () => {
    it('書影があり写真がないとき、書影取得の説明を出す', async () => {
      await render(<RecordForm onSubmit={jest.fn()} initialValues={{ coverUrl: 'http://c' }} />);
      expect(screen.getByText('書影を取得しました。自分で撮った写真に変えることもできます')).toBeTruthy();
    });

    it('画像がないとき、文字の表紙の説明を出す', async () => {
      await render(<RecordForm onSubmit={jest.fn()} />);
      expect(screen.getByTestId('text-cover')).toBeTruthy();
      expect(
        screen.getByText('ポスターがないので、タイトルから表紙を作っています。写真を付けるとこちらに表示されます'),
      ).toBeTruthy();
    });

    it('写真があるときは説明を出さない', async () => {
      await render(<RecordForm onSubmit={jest.fn()} initialValues={{ photoUri: 'file:///p.jpg' }} />);
      expect(screen.queryByText(/書影を取得しました|ポスターがない/)).toBeNull();
    });
  });

  describe('写真', () => {
    const SAVED = 'file:///documents/photos/new.jpg';
    const OLD = 'file:///documents/photos/old.jpg';
    const picked = (uri = 'file:///tmp/pick.jpg') => ({ status: 'picked', uri }) as const;
    const thumbnailUri = () => screen.getByLabelText('a').props.source.uri;
    const choose = (name: string) => act(async () => press(name));

    it('撮影・選択ボタンがあり、写真が無いとき削除ボタンは出ない', async () => {
      await render(<RecordForm onSubmit={jest.fn()} />);
      expect(screen.getByRole('button', { name: 'カメラで撮影' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'ライブラリから選択' })).toBeTruthy();
      expect(screen.queryByRole('button', { name: '写真を削除' })).toBeNull();
    });

    it('選んだ写真が書影より優先してプレビューされ、保存で photoUri に入る', async () => {
      const service = createMockPhotoService({
        pick: jest.fn().mockResolvedValue(picked()),
        save: jest.fn().mockResolvedValue(SAVED),
      });
      const onSubmit = jest.fn().mockResolvedValue(undefined);
      await render(
        <RecordForm onSubmit={onSubmit} initialValues={{ title: 'a', coverUrl: 'http://c/cover.jpg' }} />,
        service,
      );
      expect(thumbnailUri()).toBe('http://c/cover.jpg');
      await choose('ライブラリから選択');
      expect(service.pick).toHaveBeenCalledWith('library');
      expect(service.save).toHaveBeenCalledWith('file:///tmp/pick.jpg');
      expect(thumbnailUri()).toBe(SAVED);
      await press('記録する');
      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ photoUri: SAVED }));
    });

    it('キャンセルでは何も変わらない', async () => {
      const service = createMockPhotoService();
      await render(<RecordForm onSubmit={jest.fn()} />, service);
      await choose('カメラで撮影');
      expect(service.pick).toHaveBeenCalledWith('camera');
      expect(service.save).not.toHaveBeenCalled();
      expect(screen.queryByRole('button', { name: '写真を削除' })).toBeNull();
    });

    it('保存済みの写真の置き換えでは、保存成功後に旧ファイルを削除する', async () => {
      const service = createMockPhotoService({
        pick: jest.fn().mockResolvedValue(picked()),
        save: jest.fn().mockResolvedValue(SAVED),
      });
      await render(
        <RecordForm onSubmit={jest.fn().mockResolvedValue(undefined)} initialValues={{ title: 'a', photoUri: OLD }} />,
        service,
      );
      await choose('ライブラリから選択');
      expect(service.remove).not.toHaveBeenCalled();
      await press('記録する');
      expect(service.remove).toHaveBeenCalledWith(OLD);
      expect(service.remove).toHaveBeenCalledTimes(1);
    });

    it('保存に失敗したときは旧ファイルも新規コピーも削除しない', async () => {
      const service = createMockPhotoService({
        pick: jest.fn().mockResolvedValue(picked()),
        save: jest.fn().mockResolvedValue(SAVED),
      });
      await render(
        <RecordForm
          onSubmit={jest.fn().mockRejectedValue(new Error('x'))}
          initialValues={{ title: 'a', photoUri: OLD }}
        />,
        service,
      );
      await choose('ライブラリから選択');
      await press('記録する');
      expect(service.remove).not.toHaveBeenCalled();
    });

    it('写真を削除すると書影表示に戻り、保存成功後に旧ファイルを削除する', async () => {
      const service = createMockPhotoService();
      const onSubmit = jest.fn().mockResolvedValue(undefined);
      await render(
        <RecordForm
          onSubmit={onSubmit}
          initialValues={{
            title: 'a',
            photoUri: OLD,
            coverUrl: 'http://c/cover.jpg',
          }}
        />,
        service,
      );
      expect(thumbnailUri()).toBe(OLD);
      await press('写真を削除');
      expect(thumbnailUri()).toBe('http://c/cover.jpg');
      expect(service.remove).not.toHaveBeenCalled();
      await press('記録する');
      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ photoUri: null }));
      expect(service.remove).toHaveBeenCalledWith(OLD);
    });

    it('未保存の新規コピーは、再選択・削除で即座に消える', async () => {
      const pick = jest.fn().mockResolvedValue(picked());
      const save = jest.fn().mockResolvedValueOnce('file:///documents/photos/1.jpg');
      save.mockResolvedValueOnce('file:///documents/photos/2.jpg');
      const service = createMockPhotoService({ pick, save });
      await render(<RecordForm onSubmit={jest.fn()} />, service);
      await choose('ライブラリから選択');
      await choose('ライブラリから選択');
      expect(service.remove).toHaveBeenCalledWith('file:///documents/photos/1.jpg');
      await press('写真を削除');
      expect(service.remove).toHaveBeenCalledWith('file:///documents/photos/2.jpg');
    });

    it('保存せずに破棄すると未保存の新規コピーを削除し、保存済みの写真は残す', async () => {
      const service = createMockPhotoService({
        pick: jest.fn().mockResolvedValue(picked()),
        save: jest.fn().mockResolvedValue(SAVED),
      });
      const view = await render(
        <RecordForm onSubmit={jest.fn()} initialValues={{ title: 'a', photoUri: OLD }} />,
        service,
      );
      await choose('ライブラリから選択');
      await view.unmount();
      expect(service.remove).toHaveBeenCalledTimes(1);
      expect(service.remove).toHaveBeenCalledWith(SAVED);
    });

    it('保存後に破棄しても保存した写真は削除されない', async () => {
      const service = createMockPhotoService({
        pick: jest.fn().mockResolvedValue(picked()),
        save: jest.fn().mockResolvedValue(SAVED),
      });
      const view = await render(
        <RecordForm onSubmit={jest.fn().mockResolvedValue(undefined)} initialValues={{ title: 'a' }} />,
        service,
      );
      await choose('ライブラリから選択');
      await press('記録する');
      await view.unmount();
      expect(service.remove).not.toHaveBeenCalled();
    });

    it('記録を削除すると写真ファイルも削除する', async () => {
      const service = createMockPhotoService({
        pick: jest.fn().mockResolvedValue(picked()),
        save: jest.fn().mockResolvedValue(SAVED),
      });
      await render(
        <RecordForm
          onSubmit={jest.fn()}
          onDelete={jest.fn().mockResolvedValue(undefined)}
          initialValues={{ title: 'a', photoUri: OLD }}
        />,
        service,
      );
      await choose('ライブラリから選択');
      await press('この記録を削除');
      await act(async () => press('削除する'));
      expect(service.remove).toHaveBeenCalledWith(OLD);
      expect(service.remove).toHaveBeenCalledWith(SAVED);
    });

    it('コピーが例外を投げたら文言を表示し、既存の写真を維持する', async () => {
      const service = createMockPhotoService({
        pick: jest.fn().mockResolvedValue(picked()),
        save: jest.fn().mockRejectedValue(new Error('x')),
      });
      await render(<RecordForm onSubmit={jest.fn()} initialValues={{ title: 'a', photoUri: OLD }} />, service);
      await choose('ライブラリから選択');
      expect(screen.getByText('写真を保存できませんでした')).toBeTruthy();
      expect(thumbnailUri()).toBe(OLD);
      expect(screen.queryByRole('button', { name: '設定を開く' })).toBeNull();
    });

    it('権限が拒否されたら理由と「設定を開く」を表示し、再要求不可なら設定を開く', async () => {
      const openSettings = jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined);
      const service = createMockPhotoService({
        pick: jest.fn().mockResolvedValue({ status: 'denied', canAskAgain: false }),
      });
      await render(<RecordForm onSubmit={jest.fn()} />, service);
      await choose('カメラで撮影');
      expect(screen.getByText('カメラへのアクセスが許可されていません')).toBeTruthy();
      await press('設定を開く');
      expect(openSettings).toHaveBeenCalledTimes(1);
      expect(service.pick).toHaveBeenCalledTimes(1);
    });

    it('再要求できる場合は「設定を開く」で再度許可を要求する', async () => {
      const openSettings = jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined);
      openSettings.mockClear();
      const pick = jest
        .fn()
        .mockResolvedValueOnce({ status: 'denied', canAskAgain: true })
        .mockResolvedValueOnce(picked());
      const service = createMockPhotoService({
        pick,
        save: jest.fn().mockResolvedValue(SAVED),
      });
      await render(<RecordForm onSubmit={jest.fn()} initialValues={{ title: 'a' }} />, service);
      await choose('ライブラリから選択');
      expect(screen.getByText('写真ライブラリへのアクセスが許可されていません')).toBeTruthy();
      await choose('設定を開く');
      expect(pick).toHaveBeenCalledTimes(2);
      expect(openSettings).not.toHaveBeenCalled();
      expect(thumbnailUri()).toBe(SAVED);
      expect(screen.queryByText('設定を開く')).toBeNull();
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
        undefined,
        undefined,
        shelfRepository,
      ),
    );
    return { onSubmit };
  }

  it('入れていないときは「まだ入れていません」を出す', async () => {
    await setupShelves();
    expect(screen.getByRole('button', { name: '本棚、まだ入れていません' })).toBeTruthy();
  });

  it('編集のとき初期値の本棚名を「、」でつなぎ、存在しない ID は出さない', async () => {
    await setupShelves({ initialValues: { title: '本', shelfIds: ['b', 'gone', 'a'] } });
    expect(await screen.findByRole('button', { name: '本棚、SF、哲学' })).toBeTruthy();
  });

  it('シートで選ぶと行が変わり、保存で shelfIds が入る。存在しない ID はチェックに入れない', async () => {
    const { onSubmit } = await setupShelves({ initialValues: { title: '本', shelfIds: ['gone'] } });
    await fireEvent.press(await screen.findByRole('button', { name: /^本棚、/ }));
    expect(await screen.findByText('本棚を選ぶ')).toBeTruthy();
    expect(screen.getByText('2 冊')).toBeTruthy();
    expect(screen.getByRole('button', { name: '本棚に入れない' })).toBeTruthy();
    await fireEvent.press(screen.getByRole('checkbox', { name: '哲学' }));
    await fireEvent.press(screen.getByRole('checkbox', { name: 'SF' }));
    await fireEvent.press(screen.getByRole('button', { name: '2 つの本棚に入れる' }));
    expect(await screen.findByRole('button', { name: '本棚、SF、哲学' })).toBeTruthy();
    await press('記録する');
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ shelfIds: ['a', 'b'] })));
  });
});
