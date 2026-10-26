import { fireEvent, render, screen } from '@testing-library/react-native';

import { LookupSkeletonCard } from '../LookupSkeletonCard';

describe('LookupSkeletonCard', () => {
  it('loading は「書誌情報を検索中…」を出し、再試行は出さない', async () => {
    await render(<LookupSkeletonCard state="loading" />);
    expect(screen.getByText('書誌情報を検索中…')).toBeTruthy();
    expect(screen.queryByRole('button', { name: '再試行' })).toBeNull();
  });

  it('error はメッセージと再試行を出し、押すと onRetry', async () => {
    const onRetry = jest.fn();
    await render(<LookupSkeletonCard state="error" message="失敗しました" onRetry={onRetry} />);
    expect(screen.getByText('失敗しました')).toBeTruthy();
    expect(screen.queryByText('書誌情報を検索中…')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: '再試行' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('onRetry がなければ再試行を出さない', async () => {
    await render(<LookupSkeletonCard state="error" message="失敗しました" />);
    expect(screen.queryByRole('button', { name: '再試行' })).toBeNull();
  });
});
