import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { colors, typography } from '../../design/tokens';
import { MEDIA_KINDS } from '../../types/record';
import { TextCover } from '../TextCover';

describe('TextCover', () => {
  it.each(MEDIA_KINDS)('%s の地と文字色', async (kind) => {
    await render(<TextCover kind={kind} title="題" creator={null} width={150} />);
    const k = (kind.charAt(0).toUpperCase() + kind.slice(1)) as 'Book';
    expect(StyleSheet.flatten(screen.getByTestId('text-cover').props.style).backgroundColor).toBe(
      colors[`cover${k}Bg`],
    );
    expect(StyleSheet.flatten(screen.getByText('題').props.style).color).toBe(colors[`cover${k}Ink`]);
  });

  it.each([
    [150, typography.coverTitleHero.fontSize],
    [100, typography.coverTitleCard.fontSize],
    [56, typography.coverTitleThumb.fontSize],
  ])('幅 %i のタイトルは明朝体 %i', async (width, fontSize) => {
    await render(<TextCover kind="book" title="題" creator="作者" width={width} />);
    const style = StyleSheet.flatten(screen.getByText('題').props.style);
    expect(style.fontFamily).toBe('ShipporiMincho_800ExtraBold');
    expect(style.fontSize).toBe(fontSize);
  });

  it('作者があれば出し、null なら出さない', async () => {
    const { rerender } = await render(
      <TextCover kind="book" title="題" creator="作者" width={100} />,
    );
    expect(screen.getByText('作者')).toBeTruthy();
    await rerender(<TextCover kind="book" title="題" creator={null} width={100} />);
    expect(screen.queryByText('作者')).toBeNull();
  });

  it('thumb サイズでは作者を出さない', async () => {
    await render(<TextCover kind="book" title="題" creator="作者" width={56} />);
    expect(screen.queryByText('作者')).toBeNull();
  });
});
