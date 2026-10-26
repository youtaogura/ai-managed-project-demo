import { fireEvent, render, screen } from '@testing-library/react-native';

import { NotFoundCard } from '../NotFoundCard';

describe('NotFoundCard', () => {
  it('見出し・説明・3 つの操作を出し、それぞれのコールバックを呼ぶ', async () => {
    const handlers = { onManual: jest.fn(), onRetry: jest.fn(), onTitleSearch: jest.fn() };
    await render(<NotFoundCard {...handlers} />);
    expect(screen.getByText('見つかりませんでした')).toBeTruthy();
    expect(
      screen.getByText(
        '古い本や同人誌は登録されていないことがあります。ISBN はそのまま、残りを手で入力できます。',
      ),
    ).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: '手で入力する' }));
    await fireEvent.press(screen.getByRole('button', { name: 'もう一度探す' }));
    await fireEvent.press(screen.getByRole('button', { name: 'タイトルで探す' }));
    expect(handlers.onManual).toHaveBeenCalledTimes(1);
    expect(handlers.onRetry).toHaveBeenCalledTimes(1);
    expect(handlers.onTitleSearch).toHaveBeenCalledTimes(1);
  });
});
