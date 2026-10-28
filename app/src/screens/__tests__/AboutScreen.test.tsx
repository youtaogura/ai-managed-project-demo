import { render, screen } from '@testing-library/react-native';
import { getAppInfo } from '../../lib/appInfo';

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

  it('データの出典を出す。openBD は書誌情報だけ', async () => {
    await render(<AboutScreen />);
    expect(screen.getByText('openBD')).toBeTruthy();
    expect(screen.getByText('書誌情報（ISBN から）')).toBeTruthy();
    expect(screen.getByText('国立国会図書館サーチ')).toBeTruthy();
    expect(screen.getByText('タイトル検索')).toBeTruthy();
    expect(screen.queryByText(/TMDb/)).toBeNull();
    expect(screen.getByText('Noto Sans JP / しっぽり明朝')).toBeTruthy();
    expect(screen.getByText('フォント（SIL Open Font License）')).toBeTruthy();
    expect(screen.queryByText(/書影/)).toBeNull();
  });

  it('プライバシーの説明を出す', async () => {
    await render(<AboutScreen />);
    expect(
      screen.getByText(
        '記録はこの端末の中にだけ保存され、外部に送られることはありません。書誌情報を探すときだけ、ISBN やキーワードを上の出典に問い合わせます。',
      ),
    ).toBeTruthy();
  });

  it('オープンソースライセンスの項目を出さない', async () => {
    await render(<AboutScreen />);
    expect(screen.queryByText('オープンソースライセンス')).toBeNull();
  });
});
