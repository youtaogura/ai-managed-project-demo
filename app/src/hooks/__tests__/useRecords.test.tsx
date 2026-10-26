import { router } from 'expo-router';
import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { Text } from 'react-native';

import { withRepository } from '../../testProviders';
import { createFakeRepository, makeRecord } from '../../testUtils';
import type { RecordRepository } from '../../lib/recordRepository';
import { useRecords } from '../useRecords';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

function Probe() {
  const { records, loading, reload } = useRecords();
  return (
    <>
      <Text>{loading ? 'loading' : `count:${records.length}`}</Text>
      <Text onPress={() => void reload()}>reload</Text>
    </>
  );
}

function makeProbe(repository: RecordRepository) {
  return function ProbeWithRepository() {
    return withRepository(repository, <Probe />);
  };
}

describe('useRecords', () => {
  it('読み込み後に件数を返し、reload で最新になる', async () => {
    const { repository, setRecords } = createFakeRepository([makeRecord()]);
    await renderRouter({ index: makeProbe(repository) });
    await waitFor(() => expect(screen.getByText('count:1')).toBeTruthy());
    setRecords([makeRecord({ id: 'a' }), makeRecord({ id: 'b' })]);
    await fireEvent.press(screen.getByText('reload'));
    await waitFor(() => expect(screen.getByText('count:2')).toBeTruthy());
  });

  it('別画面から戻ってフォーカスされると再読み込みする', async () => {
    const { repository, setRecords } = createFakeRepository([makeRecord()]);
    function Other() {
      return <Text>other</Text>;
    }
    await renderRouter({ index: makeProbe(repository), other: Other });
    await waitFor(() => expect(screen.getByText('count:1')).toBeTruthy());
    await act(async () => router.push('/other'));
    await waitFor(() => expect(screen.getByText('other')).toBeTruthy());
    setRecords([makeRecord({ id: 'a' }), makeRecord({ id: 'b' })]);
    await act(async () => router.back());
    await waitFor(() => expect(screen.getByText('count:2')).toBeTruthy());
  });

  it('reject されても空配列で落ちない', async () => {
    const { repository } = createFakeRepository();
    const failing: RecordRepository = {
      ...repository,
      getAll: async () => {
        throw new Error('fail');
      },
    };
    await renderRouter({ index: makeProbe(failing) });
    await waitFor(() => expect(screen.getByText('count:0')).toBeTruthy());
  });
});
