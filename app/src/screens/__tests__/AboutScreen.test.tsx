import { fireEvent, render, screen } from '@testing-library/react-native';
import { getAppInfo } from '../../lib/appInfo';
import { router } from 'expo-router';

import { AboutScreen } from '../AboutScreen';

jest.mock('../../lib/appInfo', () => ({
  ...jest.requireActual('../../lib/appInfo'),
  getAppInfo: jest.fn(),
}));

const info = (build: string | null) => ({ name: 'AI Managed Demo', version: '1.0.0', build });

describe('AboutScreen', () => {
  beforeEach(() => jest.mocked(getAppInfo).mockReturnValue(info(null)));
  afterEach(() => jest.restoreAllMocks());

  it('アプリ名とバージョンを出す', async () => {
    await render(<AboutScreen />);
    expect(screen.getByText('このアプリについて')).toBeTruthy();
    expect(screen.getByText('AI Managed Demo')).toBeTruthy();
    expect(screen.getByText('バージョン 1.0.0')).toBeTruthy();
  });

  it('ビルド番号があれば括弧で出す', async () => {
    jest.mocked(getAppInfo).mockReturnValue(info('12'));
    await render(<AboutScreen />);
    expect(screen.getByText('バージョン 1.0.0（12）')).toBeTruthy();
  });

  it('ビルド番号がなければバージョンだけ', async () => {
    await render(<AboutScreen />);
    expect(screen.getByText('バージョン 1.0.0')).toBeTruthy();
  });

  it('データの出典を出す。書影は openBD のみ', async () => {
    await render(<AboutScreen />);
    expect(screen.getByText('openBD')).toBeTruthy();
    expect(screen.getByText('書誌情報・書影（ISBN から）')).toBeTruthy();
    expect(screen.getByText('国立国会図書館サーチ')).toBeTruthy();
    expect(screen.getByText('タイトル検索')).toBeTruthy();
    expect(screen.queryByText(/TMDb/)).toBeNull();
    expect(screen.getByText('Noto Sans JP / しっぽり明朝')).toBeTruthy();
    expect(screen.getByText('フォント（SIL Open Font License）')).toBeTruthy();
    expect(screen.queryByText(/国立国会図書館サーチ.*書影/)).toBeNull();
  });

  it('プライバシーの説明を出す', async () => {
    await render(<AboutScreen />);
    expect(
      screen.getByText(
        '記録はこの端末の中にだけ保存され、外部に送られることはありません。書誌情報を探すときだけ、ISBN やキーワードを上の出典に問い合わせます。',
      ),
    ).toBeTruthy();
  });

  it('「オープンソースライセンス」で /licenses へ遷移する', async () => {
    const push = jest.spyOn(router, 'push').mockImplementation(() => undefined);
    await render(<AboutScreen />);
    await fireEvent.press(screen.getByRole('button', { name: /^オープンソースライセンス/ }));
    expect(push).toHaveBeenCalledWith('/licenses');
  });
});
