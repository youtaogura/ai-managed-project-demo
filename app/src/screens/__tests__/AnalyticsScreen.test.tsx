import { render, screen } from '@testing-library/react-native';

import { withRepository } from '../../testProviders';
import { createFakeRepository, makeRecord } from '../../testUtils';
import type { MediaRecord } from '../../types/record';
import { AnalyticsScreen } from '../AnalyticsScreen';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('expo-router', () => {
  const { useEffect } = jest.requireActual('react');
  return { useFocusEffect: (cb: () => void) => useEffect(cb, [cb]) };
});

async function setup(records: MediaRecord[]) {
  await render(withRepository(createFakeRepository(records).repository, <AnalyticsScreen />));
}

describe('AnalyticsScreen', () => {
  beforeEach(() => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] });
    jest.setSystemTime(new Date(2026, 9, 15));
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('記録 0 件では空状態を表示する', async () => {
    await setup([]);
    expect(await screen.findByText('分析できる記録がまだありません')).toBeTruthy();
  });

  it('月別・分布・平均を表示する', async () => {
    await setup([
      makeRecord({ id: '1', kind: 'book', status: 'completed', endDate: '2026-10-01', rating: 4 }),
      makeRecord({ id: '2', kind: 'movie', status: 'completed', endDate: '2026-10-03', rating: 3 }),
      makeRecord({ id: '3', kind: 'movie', status: 'completed', endDate: null }),
    ]);
    expect(await screen.findByText('月別の完了数')).toBeTruthy();
    expect(screen.getByText('レーティングの分布')).toBeTruthy();
    expect(screen.getByText('平均')).toBeTruthy();
    expect(screen.getByText('2025-11')).toBeTruthy();
    expect(screen.getByText('2026-10')).toBeTruthy();
    expect(screen.getByText('2')).toBeTruthy();
    expect(screen.getByText('終了日が未入力の記録: 1 件')).toBeTruthy();
    expect(screen.getByText('平均 3.5（2 件）')).toBeTruthy();
    expect(screen.getByText('本: 4.0（1 件）')).toBeTruthy();
    expect(screen.getByText('映画: 3.0（1 件）')).toBeTruthy();
    expect(screen.getByText('4点台')).toBeTruthy();
  });

  it('完了も評価もない記録だけなら平均は「—」で注記は出ない', async () => {
    await setup([makeRecord()]);
    expect(await screen.findByText('平均 —（0 件）')).toBeTruthy();
    expect(screen.queryByText(/終了日が未入力/)).toBeNull();
  });
});
