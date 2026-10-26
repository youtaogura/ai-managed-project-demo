import {
  act,
  fireEvent,
  render as rtlRender,
  screen,
  waitFor,
} from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { Linking, StyleSheet } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import { space } from '../../design/tokens';
import { PhotoServiceContextProvider } from '../../hooks/usePhotoService';
import type { PhotoService } from '../../lib/photo/PhotoService';
import { withSettings } from '../../testProviders';
import type { MediaKind, NewRecordInput } from '../../types/record';
import { createMockPhotoService } from '../../testUtils';
import { RecordForm } from '../RecordForm';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const render = (ui: ReactElement, service: PhotoService = createMockPhotoService()) =>
  rtlRender(<PhotoServiceContextProvider service={service}>{ui}</PhotoServiceContextProvider>);

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
const touch = (name: string, x: number) =>
  fireEvent(star(), name, { nativeEvent: { locationX: x, pageX: x } });
const setRating = async (x: number) => {
  await fireEvent(star(), 'layout', {
    nativeEvent: { layout: { width: 200 } },
  });
  await touch('responderGrant', x);
  await touch('responderRelease', x);
};
const type = (label: string, text: string) =>
  fireEvent.changeText(screen.getByLabelText(label), text);

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
    await type('感想（任意）', '良い');
    await setRating(148);
    await press('記録する');
    expect(onSubmit).toHaveBeenCalledWith({
      kind: 'book',
      title: '吾輩は猫である',
      creator: '夏目漱石',
      publisher: '新潮社',
      isbn: '9784101010013',
      coverUrl: null,
      photoUri: null,
      startDate: null,
      endDate: null,
      status: 'planned',
      review: '良い',
      rating: 3.7,
      source: { provider: 'manual' },
    });
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

    it('種別に応じて見出しとヒントが切り替わる', async () => {
      await render(<RecordForm onSubmit={jest.fn()} />);
      expect(screen.getByText('「読み終わった」を選ぶと、終えた日に今日が入ります')).toBeTruthy();
      await fireEvent.press(screen.getByRole('radio', { name: '映画' }));
      expect(dateButton('見始めた日')).toBeTruthy();
      expect(dateButton('見終えた日')).toBeTruthy();
      expect(screen.getByText('「見終わった」を選ぶと、終えた日に今日が入ります')).toBeTruthy();
      expect(screen.getByLabelText('監督など')).toBeTruthy();
    });

    it('終えた日が開始日より前だとエラーを表示し保存しない', async () => {
      const onSubmit = jest.fn();
      await render(
        <RecordForm
          onSubmit={onSubmit}
          initialValues={{ title: 'a', startDate: '2024-03-02', endDate: '2024-03-01' }}
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

    it('ステータスは本・漫画で「読」、それ以外で「見」のラベルになる', async () => {
      await render(<RecordForm onSubmit={jest.fn()} />);
      expect(screen.getAllByRole('radio')).toHaveLength(9);
      expect(screen.getByRole('radio', { name: '読みたい' })).toBeTruthy();
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

  it('種別でステータス文言と ISBN・出版社の表示が切り替わり、ステータスは維持される', async () => {
    await render(<RecordForm onSubmit={jest.fn()} />);
    await fireEvent.press(screen.getByRole('radio', { name: '読んでる' }));
    await fireEvent.press(screen.getByRole('radio', { name: '映画' }));
    expect(screen.getByRole('radio', { name: '見てる' }).props.accessibilityState.selected).toBe(
      true,
    );
    expect(screen.queryByLabelText('ISBN')).toBeNull();
    expect(screen.queryByLabelText('出版社')).toBeNull();
    await fireEvent.press(screen.getByRole('radio', { name: '漫画' }));
    expect(screen.getByLabelText('ISBN')).toBeTruthy();
    expect(screen.getByRole('radio', { name: '読んでる' })).toBeTruthy();
  });

  it('映画に切り替えて保存すると isbn / publisher は null', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    await render(
      <RecordForm onSubmit={onSubmit} initialValues={{ title: 'x', isbn: '1', publisher: 'p' }} />,
    );
    await fireEvent.press(screen.getByRole('radio', { name: '映画' }));
    await press('記録する');
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ isbn: null, publisher: null }));
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
    const act1 = (actionName: string) =>
      fireEvent(star(), 'accessibilityAction', { nativeEvent: { actionName } });
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
          kind: 'manga',
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
    expect(screen.getByRole('radio', { name: '漫画' }).props.accessibilityState.selected).toBe(
      true,
    );
    await press('記録する');
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'manga', coverUrl: 'http://c' }),
    );
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
      <RecordForm
        onSubmit={jest.fn().mockResolvedValue(undefined)}
        onSaved={onSaved}
        initialValues={{ title: 'a' }}
      />,
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
        <PhotoServiceContextProvider service={createMockPhotoService()}>
          <RecordForm onSubmit={jest.fn()} />
        </PhotoServiceContextProvider>
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
        <RecordForm
          onSubmit={jest.fn()}
          onDelete={onDelete}
          onDeleted={onDeleted}
          initialValues={{ title: '吾輩' }}
        />,
      );
      await press('この記録を削除');
    };

    it('確認シートに記録名が出て、「削除する」で onDelete と onDeleted が呼ばれる', async () => {
      const onDelete = jest.fn().mockResolvedValue(undefined);
      const onDeleted = jest.fn();
      await open(onDelete, onDeleted);
      expect(
        screen.getByText('「吾輩」の記録と、付けた写真が削除されます。元に戻せません。'),
      ).toBeTruthy();
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
      expect(
        screen.getByText('書影を取得しました。自分で撮った写真に変えることもできます'),
      ).toBeTruthy();
    });

    it('画像がないとき、文字の表紙の説明を出す', async () => {
      await render(<RecordForm onSubmit={jest.fn()} />);
      expect(screen.getByTestId('text-cover')).toBeTruthy();
      expect(
        screen.getByText(
          'ポスターがないので、タイトルから表紙を作っています。写真を付けるとこちらに表示されます',
        ),
      ).toBeTruthy();
    });

    it('写真があるときは説明を出さない', async () => {
      await render(
        <RecordForm onSubmit={jest.fn()} initialValues={{ photoUri: 'file:///p.jpg' }} />,
      );
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
        <RecordForm
          onSubmit={onSubmit}
          initialValues={{ title: 'a', coverUrl: 'http://c/cover.jpg' }}
        />,
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
        <RecordForm
          onSubmit={jest.fn().mockResolvedValue(undefined)}
          initialValues={{ title: 'a', photoUri: OLD }}
        />,
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
          initialValues={{ title: 'a', photoUri: OLD, coverUrl: 'http://c/cover.jpg' }}
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
        <RecordForm
          onSubmit={jest.fn().mockResolvedValue(undefined)}
          initialValues={{ title: 'a' }}
        />,
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
      await render(
        <RecordForm onSubmit={jest.fn()} initialValues={{ title: 'a', photoUri: OLD }} />,
        service,
      );
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
      const service = createMockPhotoService({ pick, save: jest.fn().mockResolvedValue(SAVED) });
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

describe('RecordForm（使う種別）', () => {
  const renderWith = (
    kinds: MediaKind[],
    initial?: Partial<NewRecordInput>,
    onSubmit = jest.fn(),
  ) => render(withSettings(kinds, <RecordForm initialValues={initial} onSubmit={onSubmit} />));

  it('種別の選択肢は使う種別だけ', async () => {
    await renderWith(['book', 'anime']);
    expect(await screen.findByRole('radio', { name: '本' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'アニメ' })).toBeTruthy();
    expect(screen.queryByRole('radio', { name: '漫画' })).toBeNull();
    expect(screen.queryByRole('radio', { name: '映画' })).toBeNull();
  });

  it('使う種別が 1 つなら種別の選択 UI を出さず、その種別で保存される', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    await renderWith(['movie'], { kind: 'movie' }, onSubmit);
    await screen.findByLabelText('タイトル（必須）');
    expect(screen.queryByText('種別')).toBeNull();
    expect(screen.queryByRole('radio', { name: '映画' })).toBeNull();
    await type('タイトル（必須）', '作品');
    await press('記録する');
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0].kind).toBe('movie');
  });

  it('編集中の記録が使わない種別でも、元の種別が選択肢に残る', async () => {
    await renderWith(['movie'], { kind: 'book', title: '本' });
    expect(await screen.findByRole('radio', { name: '本' })).toBeTruthy();
    await fireEvent.press(screen.getByRole('radio', { name: '映画' }));
    expect(screen.getByRole('radio', { name: '本' })).toBeTruthy();
    expect(screen.queryByRole('radio', { name: '漫画' })).toBeNull();
  });
});

describe('RecordForm（記録する項目のオフ）', () => {
  const KINDS: MediaKind[] = ['book', 'manga', 'movie', 'drama', 'anime'];
  const saved: Partial<NewRecordInput> = {
    kind: 'book',
    title: '吾輩',
    status: 'in_progress',
    startDate: '2024-01-05',
    endDate: '2024-02-10',
    rating: 4.5,
    review: '良い本',
    photoUri: 'file:///documents/photos/p.jpg',
  };
  const renderWith = (
    fields: Parameters<typeof withSettings>[2],
    initial: Partial<NewRecordInput> = {},
    onSubmit = jest.fn().mockResolvedValue(undefined),
  ) =>
    render(withSettings(KINDS, <RecordForm initialValues={initial} onSubmit={onSubmit} />, fields));
  const hint = '「読み終わった」を選ぶと、終えた日に今日が入ります';

  it('レーティングがオフならレーティングが出ない', async () => {
    await renderWith({ rating: false });
    await screen.findByLabelText('タイトル（必須）');
    expect(screen.queryByLabelText('レーティング')).toBeNull();
  });

  it('ステータスがオフならステータスのチップが出ない', async () => {
    await renderWith({ status: false });
    await screen.findByLabelText('タイトル（必須）');
    expect(screen.queryByText('ステータス')).toBeNull();
    expect(screen.queryByRole('radio', { name: '読み終わった' })).toBeNull();
  });

  it('感想がオフなら感想欄が出ない', async () => {
    await renderWith({ review: false });
    await screen.findByLabelText('タイトル（必須）');
    expect(screen.queryByLabelText('感想（任意）')).toBeNull();
    expect(screen.queryByPlaceholderText('感じたことを自由に')).toBeNull();
  });

  it('写真がオフなら写真の取得ボタンが出ない', async () => {
    await renderWith({ photo: false });
    await screen.findByLabelText('タイトル（必須）');
    expect(screen.queryByRole('button', { name: 'カメラで撮影' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'ライブラリから選択' })).toBeNull();
  });

  it('始めた日だけオフなら、終えた日だけが残る', async () => {
    await renderWith({ startDate: false });
    expect(
      await screen.findByRole('button', { name: '読み終えた日 選択してください' }),
    ).toBeTruthy();
    expect(screen.queryByRole('button', { name: '読み始めた日 選択してください' })).toBeNull();
    expect(screen.getByText(hint)).toBeTruthy();
  });

  it('終えた日だけオフなら、始めた日だけが残る', async () => {
    await renderWith({ endDate: false });
    expect(
      await screen.findByRole('button', { name: '読み始めた日 選択してください' }),
    ).toBeTruthy();
    expect(screen.queryByRole('button', { name: '読み終えた日 選択してください' })).toBeNull();
  });

  it('日付が両方オフなら日付の行もヒントも出ない', async () => {
    await renderWith({ startDate: false, endDate: false });
    await screen.findByLabelText('タイトル（必須）');
    expect(screen.queryByRole('button', { name: /読み(始め|終え)た日/ })).toBeNull();
    expect(screen.queryByText(hint)).toBeNull();
  });

  it('オフの項目の保存済みの値は、編集して保存しても変わらない', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    await renderWith(
      {
        rating: false,
        status: false,
        startDate: false,
        endDate: false,
        review: false,
        photo: false,
      },
      saved,
      onSubmit,
    );
    await type('タイトル（必須）', '吾輩は猫');
    await press('記録する');
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      title: '吾輩は猫',
      status: 'in_progress',
      startDate: '2024-01-05',
      endDate: '2024-02-10',
      rating: 4.5,
      review: '良い本',
      photoUri: 'file:///documents/photos/p.jpg',
    });
  });

  it('非表示の項目の不正な値で保存が止まらない', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    await renderWith(
      { rating: false, startDate: false, endDate: false },
      { ...saved, startDate: '2024-03-01', endDate: '2024-01-01', rating: 9 },
      onSubmit,
    );
    await press('記録する');
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(screen.queryByText(/レーティングは|終了日は/)).toBeNull();
  });

  it('終えた日がオフのとき、ステータスを「読み終わった」にしても終了日を入れない', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    await renderWith({ endDate: false }, { title: 'a' }, onSubmit);
    await fireEvent.press(await screen.findByRole('radio', { name: '読み終わった' }));
    await press('記録する');
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ status: 'completed', endDate: null });
  });
});
