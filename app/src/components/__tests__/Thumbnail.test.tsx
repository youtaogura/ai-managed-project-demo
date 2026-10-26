import { fireEvent, render, screen } from '@testing-library/react-native';

import { makeRecord } from '../../testUtils';
import { Thumbnail } from '../Thumbnail';

describe('Thumbnail', () => {
  it('写真 → 書影 → プレースホルダーの順にフォールバックする', async () => {
    await render(<Thumbnail record={makeRecord({ photoUri: 'file://p', coverUrl: 'http://c' })} />);
    expect(screen.getByLabelText('サムネイル').props.source).toEqual({
      uri: 'file://p',
    });
    await fireEvent(screen.getByLabelText('サムネイル'), 'error');
    expect(screen.getByLabelText('サムネイル').props.source).toEqual({
      uri: 'http://c',
    });
    await fireEvent(screen.getByLabelText('サムネイル'), 'error');
    expect(screen.getByTestId('thumbnail-placeholder')).toBeTruthy();
    expect(screen.getByText('📖')).toBeTruthy();
  });

  it('画像がなければ 📖 のプレースホルダー', async () => {
    await render(<Thumbnail record={makeRecord()} />);
    expect(screen.getByText('📖')).toBeTruthy();
  });
});
