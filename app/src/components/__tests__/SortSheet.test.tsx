import { fireEvent, render, screen } from '@testing-library/react-native';

import { withSettings } from '../../testProviders';
import { SortSheet } from '../SortSheet';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const KINDS = ['book' as const];

const renderSheet = (fields: Parameters<typeof withSettings>[2], onChange = jest.fn()) =>
  render(
    withSettings(
      KINDS,
      <SortSheet visible value="title_asc" onClose={jest.fn()} onChange={onChange} />,
      fields,
    ),
  );

describe('SortSheet', () => {
  it('すべてオンなら 5 つの行を出す', async () => {
    await renderSheet({});
    for (const label of ['終了日', '開始日', 'レーティング', 'タイトル', '登録日時']) {
      expect(await screen.findByText(label)).toBeTruthy();
    }
  });

  it('終えた日・始めた日・レーティングがオフならその行を出さない', async () => {
    await renderSheet({ endDate: false, startDate: false, rating: false });
    expect(await screen.findByText('タイトル')).toBeTruthy();
    expect(screen.getByText('登録日時')).toBeTruthy();
    expect(screen.queryByText('終了日')).toBeNull();
    expect(screen.queryByText('開始日')).toBeNull();
    expect(screen.queryByText('レーティング')).toBeNull();
  });

  it('残った行から選べる', async () => {
    const onChange = jest.fn();
    await renderSheet({ rating: false }, onChange);
    await fireEvent.press((await screen.findAllByRole('radio', { name: '古い順' }))[0]);
    expect(onChange).toHaveBeenCalledWith('endDate_asc');
  });
});
