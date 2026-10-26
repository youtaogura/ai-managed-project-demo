import { render } from '@testing-library/react-native';
import { Text } from 'react-native';

import { createFakeRepository } from '../../testUtils';
import { RecordRepositoryProvider, useRecordRepository } from '../useRecordRepository';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

function Child() {
  useRecordRepository();
  return <Text>child</Text>;
}

describe('RecordRepositoryProvider', () => {
  it('マウント時に migrate を 1 回呼ぶ', async () => {
    const { repository } = createFakeRepository();
    const migrate = jest.spyOn(repository, 'migrate');
    const view = await render(
      <RecordRepositoryProvider repository={repository}>
        <Child />
      </RecordRepositoryProvider>,
    );
    await view.rerender(
      <RecordRepositoryProvider repository={repository}>
        <Child />
      </RecordRepositoryProvider>,
    );
    expect(migrate).toHaveBeenCalledTimes(1);
  });

  it('Provider なしでは例外', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    await expect(render(<Child />)).rejects.toThrow('RecordRepositoryProvider が必要です');
  });
});
