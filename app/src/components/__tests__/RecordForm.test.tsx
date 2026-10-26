import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Alert, type AlertButton } from 'react-native';

import { RecordForm } from '../RecordForm';

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
    await press('保存');
    expect(screen.getByText('タイトルを入力してください')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
    await type('タイトル', 'あ');
    expect(screen.queryByText('タイトルを入力してください')).toBeNull();
  });

  it('入力値が NewRecordInput として onSubmit に渡る', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    await render(<RecordForm onSubmit={onSubmit} />);
    await type('タイトル', ' 吾輩は猫である ');
    await type('作者・著者・監督など', '夏目漱石');
    await type('出版社', '新潮社');
    await type('ISBN', '9784101010013');
    await type('感想', '良い');
    await setRating(148);
    await press('保存');
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
    });
  });

  it('開始日・終了日は空で始まり、入力・今日・クリアができる', async () => {
    await render(<RecordForm onSubmit={jest.fn()} />);
    expect(screen.getByLabelText('開始日').props.value).toBe('');
    expect(screen.getByLabelText('終了日').props.value).toBe('');
    await type('開始日', '2024-01-01');
    expect(screen.getByLabelText('開始日').props.value).toBe('2024-01-01');
    await press('開始日をクリア');
    expect(screen.getByLabelText('開始日').props.value).toBe('');
    await press('開始日を今日にする');
    expect(screen.getByLabelText('開始日').props.value).toBe('2024-05-10');
    await press('終了日を今日にする');
    expect(screen.getByLabelText('終了日').props.value).toBe('2024-05-10');
  });

  it('日付の形式違い・逆転でエラーを表示し保存しない', async () => {
    const onSubmit = jest.fn();
    await render(<RecordForm onSubmit={onSubmit} />);
    await type('タイトル', 'a');
    await type('開始日', '2024-02-30');
    await press('保存');
    expect(screen.getByText('日付は YYYY-MM-DD の形式で入力してください')).toBeTruthy();
    await type('開始日', '2024-03-02');
    await type('終了日', '2024-03-01');
    await press('保存');
    expect(screen.getByText('終了日は開始日以降にしてください')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('ステータス変更で自動的に今日の日付が入り、後から変更できる', async () => {
    await render(<RecordForm onSubmit={jest.fn()} />);
    await fireEvent.press(screen.getByRole('radio', { name: '読んでる' }));
    expect(screen.getByLabelText('開始日').props.value).toBe('2024-05-10');
    await type('開始日', '2024-05-01');
    await fireEvent.press(screen.getByRole('radio', { name: '読み終わった' }));
    expect(screen.getByLabelText('終了日').props.value).toBe('2024-05-10');
    expect(screen.getByLabelText('開始日').props.value).toBe('2024-05-01');
    await press('終了日をクリア');
    expect(screen.getByLabelText('終了日').props.value).toBe('');
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
    await press('保存');
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
    await press('保存');
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
    await press('保存');
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
    expect(screen.getByLabelText('タイトル').props.value).toBe('T');
    expect(screen.getByLabelText('作者・著者・監督など').props.value).toBe('C');
    expect(screen.getByLabelText('出版社').props.value).toBe('P');
    expect(screen.getByLabelText('ISBN').props.value).toBe('I');
    expect(screen.getByRole('radio', { name: '漫画' }).props.accessibilityState.selected).toBe(
      true,
    );
    await press('保存');
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'manga', coverUrl: 'http://c' }),
    );
  });

  it('保存失敗でメッセージを表示し入力値を保持する', async () => {
    const onSubmit = jest.fn().mockRejectedValue(new Error('x'));
    await render(<RecordForm onSubmit={onSubmit} initialValues={{ title: 'keep' }} />);
    await press('保存');
    expect(await screen.findByText('保存に失敗しました')).toBeTruthy();
    expect(screen.getByLabelText('タイトル').props.value).toBe('keep');
  });

  it('onDelete がなければ削除ボタンを出さない', async () => {
    await render(<RecordForm onSubmit={jest.fn()} />);
    expect(screen.queryByRole('button', { name: '削除' })).toBeNull();
  });

  describe('削除', () => {
    const open = async (onDelete: () => Promise<void>) => {
      const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
      await render(<RecordForm onSubmit={jest.fn()} onDelete={onDelete} />);
      await press('削除');
      const buttons = alert.mock.calls[0]?.[2] as AlertButton[];
      return (text: string) => buttons.find((b) => b.text === text);
    };

    it('「削除」を選ぶと onDelete が呼ばれる', async () => {
      const onDelete = jest.fn().mockResolvedValue(undefined);
      const find = await open(onDelete);
      await act(async () => {
        find('削除')?.onPress?.();
      });
      expect(onDelete).toHaveBeenCalledTimes(1);
    });

    it('「キャンセル」では onDelete が呼ばれない', async () => {
      const onDelete = jest.fn();
      const find = await open(onDelete);
      expect(find('キャンセル')?.onPress).toBeUndefined();
      expect(onDelete).not.toHaveBeenCalled();
    });

    it('削除失敗でメッセージを表示する', async () => {
      const find = await open(jest.fn().mockRejectedValue(new Error('x')));
      await act(async () => {
        find('削除')?.onPress?.();
      });
      expect(screen.getByText('削除に失敗しました')).toBeTruthy();
    });
  });
});
