import { render, screen } from '@testing-library/react-native';

import AnalyticsRoute from '../../app/(tabs)/analytics';
import { withRepository } from '../../testProviders';
import { createFakeRepository, makeRecord } from '../../testUtils';
import type { MediaRecord } from '../../types/record';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('expo-router', () => {
  const { useEffect } = jest.requireActual('react');
  return {
    useFocusEffect: (cb: () => void) => useEffect(cb, [cb]),
    useRouter: () => ({ push: jest.fn() }),
    router: { push: jest.fn() },
  };
});

async function setup(records: MediaRecord[]) {
  await render(withRepository(createFakeRepository(records).repository, <AnalyticsRoute />));
}

// analytics ルートは「振り返り」画面を表示する（画面の詳細は ReviewScreen.test.tsx）
describe('analytics ルート', () => {
  beforeEach(() => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] });
    jest.setSystemTime(new Date(2026, 9, 15));
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('記録 0 件では空状態を表示する', async () => {
    await setup([]);
    expect(await screen.findByText('振り返り')).toBeTruthy();
  });

  it('記録があれば月ごとに読んだ本とどうだった？を表示する', async () => {
    await setup([
      makeRecord({ id: '1', status: 'completed', endDate: '2026-10-01', rating: 4 }),
      makeRecord({ id: '2', status: 'completed', endDate: '2026-10-03', rating: 3 }),
    ]);
    expect(await screen.findByText('月ごとに読んだ本')).toBeTruthy();
    expect(screen.getByText('どうだった？')).toBeTruthy();
  });
});
