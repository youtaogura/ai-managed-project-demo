import { render, screen } from '@testing-library/react-native';

import { resolveFontFamily } from '../../design/fonts';
import { colors, typography } from '../../design/tokens';
import { AppText } from '../AppText';

describe('AppText', () => {
  it('variant の文字スタイルと既定色を適用する', async () => {
    await render(<AppText variant="screenTitle">題名</AppText>);
    const style = screen.getByText('題名').props.style;
    const flat = Object.assign({}, ...[style].flat());
    expect(flat).toMatchObject({
      color: colors.textPrimary,
      fontSize: typography.screenTitle.fontSize,
      lineHeight: typography.screenTitle.lineHeight,
      fontFamily: resolveFontFamily('Noto Sans JP', '900'),
    });
    expect(flat.fontWeight).toBeUndefined();
  });

  it('variant 省略時は body、style で上書きでき、props を透過する', async () => {
    await render(
      <AppText accessibilityRole="header" style={{ color: 'red' }}>
        本文
      </AppText>,
    );
    const el = screen.getByRole('header');
    const flat = Object.assign({}, ...[el.props.style].flat());
    expect(flat.color).toBe('red');
    expect(flat.fontSize).toBe(typography.body.fontSize);
  });
});
