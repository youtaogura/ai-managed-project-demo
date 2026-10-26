import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { colors, radius } from '../../design/tokens';
import { InfoCell, InfoCellRow } from '../InfoCell';

describe('InfoCell', () => {
  it('見出しと値を表示し、押せない', async () => {
    await render(<InfoCell label="読み始めた" value="2026-01-01" />);
    expect(screen.getByText('読み始めた')).toBeTruthy();
    expect(screen.getByText('2026-01-01')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('値がなければ「—」', async () => {
    await render(
      <>
        <InfoCell label="a" value="" />
        <InfoCell label="b" />
        <InfoCell label="c" value={null} />
      </>,
    );
    expect(screen.getAllByText('—')).toHaveLength(3);
  });

  it('onPress があればボタン', async () => {
    const onPress = jest.fn();
    await render(<InfoCell label="読み終えた" value="2026-02-01" onPress={onPress} />);
    const b = screen.getByRole('button', { name: '読み終えた 2026-02-01' });
    const s = StyleSheet.flatten(b.props.style);
    expect(s.backgroundColor).toBe(colors.surface2);
    expect(s.borderRadius).toBe(radius.card);
    await fireEvent.press(b);
    expect(onPress).toHaveBeenCalled();
  });

  it('Row は子を並べる', async () => {
    await render(
      <InfoCellRow>
        <InfoCell label="x" value="1" />
        <InfoCell label="y" value="2" />
      </InfoCellRow>,
    );
    expect(screen.getByText('x')).toBeTruthy();
    expect(screen.getByText('y')).toBeTruthy();
  });
});
