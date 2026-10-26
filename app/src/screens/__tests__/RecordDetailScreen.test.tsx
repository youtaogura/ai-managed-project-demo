import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import type { ReactElement } from 'react';
import { Alert, type AlertButton } from 'react-native';

import type { RecordRepository } from '../../lib/recordRepository';
import { withRepository } from '../../testProviders';
import { createFakeRepository, makeRecord } from '../../testUtils';
import { RecordDetailScreen } from '../RecordDetailScreen';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

function renderDetail(repository: RecordRepository, element: ReactElement) {
  return renderRouter({ index: () => withRepository(repository, element) });
}

const full = makeRecord({
  id: 'x',
  kind: 'book',
  title: '吾輩は猫である',
  creator: '夏目漱石',
  publisher: '新潮社',
  isbn: '9784101010014',
  startDate: '2024-01-05',
  endDate: '2024-02-10',
  status: 'completed',
  rating: 4.5,
  review: '一行目\n二行目',
});

function pressAlertButton(label: string) {
  const spy = jest.spyOn(Alert, 'alert');
  return {
    spy,
    press: () => {
      const buttons = spy.mock.calls[0]?.[2] as AlertButton[];
      buttons.find((b) => b.text === label)?.onPress?.();
    },
  };
}

// 初回描画が重く、CI のコールドスタートで 5 秒を超えることがある
jest.setTimeout(15000);

afterEach(() => jest.restoreAllMocks());

describe('RecordDetailScreen', () => {
  it('全項目を表示する', async () => {
    const { repository } = createFakeRepository([full]);
    await renderDetail(repository, <RecordDetailScreen recordId="x" />);
    await waitFor(() => expect(screen.getByText('吾輩は猫である')).toBeTruthy());
    for (const text of [
      '本',
      '夏目漱石',
      '新潮社',
      '9784101010014',
      '2024-01-05',
      '2024-02-10',
      '読み終わった',
      '★ 4.5',
      '一行目\n二行目',
    ]) {
      expect(screen.getByText(text)).toBeTruthy();
    }
    expect(screen.getByText('登録日時')).toBeTruthy();
    expect(screen.getByText('更新日時')).toBeTruthy();
  });

  it('null の項目は「未入力」、感想は「感想はありません」と表示する', async () => {
    const { repository } = createFakeRepository([makeRecord({ id: 'x' })]);
    await renderDetail(repository, <RecordDetailScreen recordId="x" />);
    await waitFor(() => expect(screen.getByText('感想はありません')).toBeTruthy());
    expect(screen.getAllByText('未入力').length).toBe(5);
    expect(screen.getByText('未評価')).toBeTruthy();
  });

  it('本・漫画以外では出版社と ISBN を表示しない', async () => {
    const { repository } = createFakeRepository([makeRecord({ id: 'x', kind: 'movie' })]);
    await renderDetail(repository, <RecordDetailScreen recordId="x" />);
    await waitFor(() => expect(screen.getByText('感想はありません')).toBeTruthy());
    expect(screen.queryByText('出版社')).toBeNull();
    expect(screen.queryByText('ISBN')).toBeNull();
  });

  it('「編集」で onEdit が呼ばれる', async () => {
    const onEdit = jest.fn();
    const { repository } = createFakeRepository([full]);
    await renderDetail(repository, <RecordDetailScreen recordId="x" onEdit={onEdit} />);
    await waitFor(() => expect(screen.getByText('編集')).toBeTruthy());
    await fireEvent.press(screen.getByText('編集'));
    expect(onEdit).toHaveBeenCalledWith('x');
  });

  it('削除を確認すると削除して onDeleted が呼ばれる', async () => {
    const onDeleted = jest.fn();
    const { repository } = createFakeRepository([full]);
    const del = jest.spyOn(repository, 'delete');
    const alert = pressAlertButton('削除');
    await renderDetail(repository, <RecordDetailScreen recordId="x" onDeleted={onDeleted} />);
    await waitFor(() => expect(screen.getByText('削除')).toBeTruthy());
    await fireEvent.press(screen.getByText('削除'));
    expect(alert.spy.mock.calls[0]?.[0]).toBe('この記録を削除しますか？');
    alert.press();
    await waitFor(() => expect(onDeleted).toHaveBeenCalled());
    expect(del).toHaveBeenCalledWith('x');
  });

  it('キャンセルでは削除されない', async () => {
    const onDeleted = jest.fn();
    const { repository } = createFakeRepository([full]);
    const del = jest.spyOn(repository, 'delete');
    const alert = pressAlertButton('キャンセル');
    await renderDetail(repository, <RecordDetailScreen recordId="x" onDeleted={onDeleted} />);
    await waitFor(() => expect(screen.getByText('削除')).toBeTruthy());
    await fireEvent.press(screen.getByText('削除'));
    alert.press();
    expect(del).not.toHaveBeenCalled();
    expect(onDeleted).not.toHaveBeenCalled();
    expect(screen.getByText('吾輩は猫である')).toBeTruthy();
  });

  it('削除に失敗すると「削除できませんでした」を表示して留まる', async () => {
    const onDeleted = jest.fn();
    const { repository } = createFakeRepository([full]);
    const failing: RecordRepository = {
      ...repository,
      delete: async () => {
        throw new Error('fail');
      },
    };
    const alert = pressAlertButton('削除');
    await renderDetail(failing, <RecordDetailScreen recordId="x" onDeleted={onDeleted} />);
    await waitFor(() => expect(screen.getByText('削除')).toBeTruthy());
    await fireEvent.press(screen.getByText('削除'));
    alert.press();
    await waitFor(() => expect(screen.getByText('削除できませんでした')).toBeTruthy());
    expect(onDeleted).not.toHaveBeenCalled();
  });

  it('存在しない id では見つからない表示と戻るボタンを出す', async () => {
    const onBack = jest.fn();
    const { repository } = createFakeRepository([]);
    await renderDetail(repository, <RecordDetailScreen recordId="nope" onBack={onBack} />);
    await waitFor(() => expect(screen.getByText('記録が見つかりません')).toBeTruthy());
    await fireEvent.press(screen.getByText('一覧へ戻る'));
    expect(onBack).toHaveBeenCalled();
  });

  it('読み出しが reject されても見つからない表示になる', async () => {
    const { repository } = createFakeRepository([full]);
    const failing: RecordRepository = {
      ...repository,
      getAll: async () => {
        throw new Error('fail');
      },
    };
    await renderDetail(failing, <RecordDetailScreen recordId="x" />);
    await waitFor(() => expect(screen.getByText('記録が見つかりません')).toBeTruthy());
  });
});
