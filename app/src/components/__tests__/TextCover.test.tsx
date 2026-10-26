import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { colors, typography } from '../../design/tokens';
import { TextCover } from '../TextCover';

describe('TextCover', () => {
  it('本の色の地と文字色', async () => {
    await render(<TextCover title="題" creator={null} width={150} />);
    expect(StyleSheet.flatten(screen.getByTestId('text-cover').props.style).backgroundColor).toBe(
      colors.coverBookBg,
    );
    expect(StyleSheet.flatten(screen.getByText('題').props.style).color).toBe(colors.coverBookInk);
  });

  it.each([
    [150, typography.coverTitleHero.fontSize],
    [100, typography.coverTitleCard.fontSize],
    [56, typography.coverTitleThumb.fontSize],
  ])('幅 %i のタイトルは明朝体 %i', async (width, fontSize) => {
    await render(<TextCover title="題" creator="作者" width={width} />);
    const style = StyleSheet.flatten(screen.getByText('題').props.style);
    expect(style.fontFamily).toBe('ShipporiMincho_800ExtraBold');
    expect(style.fontSize).toBe(fontSize);
  });

  it('作者があれば出し、null なら出さない', async () => {
    const { rerender } = await render(
      <TextCover title="題" creator="作者" width={100} />,
    );
    expect(screen.getByText('作者')).toBeTruthy();
    await rerender(<TextCover title="題" creator={null} width={100} />);
    expect(screen.queryByText('作者')).toBeNull();
  });

  it('thumb サイズでは作者を出さない', async () => {
    await render(<TextCover title="題" creator="作者" width={56} />);
    expect(screen.queryByText('作者')).toBeNull();
  });
});
