import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { Text } from 'react-native';

import { createShelfRepository, type ShelfRepository } from '../../lib/shelfRepository';
import { withShelfRepository } from '../../testProviders';
import { createMemoryStorage } from '../../testUtils';
import { useShelves } from '../useShelves';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

function Probe() {
  const { shelves, loading, reload } = useShelves();
  return (
    <>
      <Text>{loading ? 'loading' : `shelves:${shelves.map((s) => s.name).join(',')}`}</Text>
      <Text onPress={() => void reload()}>reload</Text>
    </>
  );
}

const render = (repository: ShelfRepository) =>
  renderRouter({ index: () => withShelfRepository(repository, <Probe />) });

describe('useShelves', () => {
  it('本棚を読み込み、reload で最新になる', async () => {
    const repository = createShelfRepository(createMemoryStorage().storage);
    await repository.create('SF');
    await render(repository);
    await waitFor(() => expect(screen.getByText('shelves:SF')).toBeTruthy());
    await repository.create('哲学');
    await fireEvent.press(screen.getByText('reload'));
    await waitFor(() => expect(screen.getByText('shelves:SF,哲学')).toBeTruthy());
  });

  it('読み込みに失敗したら 0 件として扱う', async () => {
    const repository = createShelfRepository(createMemoryStorage().storage);
    await render({ ...repository, getAll: () => Promise.reject(new Error('x')) });
    await waitFor(() => expect(screen.getByText('shelves:')).toBeTruthy());
  });
});
