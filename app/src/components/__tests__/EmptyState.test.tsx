import { render, screen } from '@testing-library/react-native';

import { EmptyState } from '../EmptyState';

describe('EmptyState', () => {
  it('タイトルと補足を表示する', async () => {
    await render(<EmptyState title="タイトル" description="補足" />);
    expect(screen.getByText('タイトル')).toBeTruthy();
    expect(screen.getByText('補足')).toBeTruthy();
  });

  it('補足がなければタイトルのみ表示する', async () => {
    await render(<EmptyState title="タイトル" />);
    expect(screen.getByText('タイトル')).toBeTruthy();
    expect(screen.queryByText('補足')).toBeNull();
  });
});
