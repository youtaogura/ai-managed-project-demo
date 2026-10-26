import { render, screen } from '@testing-library/react-native';

import licensesJson from '../../generated/licenses.json';
import { parseLicenseList } from '../../lib/licenses';
import { LicensesScreen } from '../LicensesScreen';

describe('LicensesScreen', () => {
  it('名前・バージョン・ライセンスを出す', async () => {
    await render(<LicensesScreen />);
    expect(screen.getByText('オープンソースライセンス')).toBeTruthy();
    const first = parseLicenseList(licensesJson)[0];
    expect(first).toBeDefined();
    expect(screen.getByText(first?.name ?? '')).toBeTruthy();
    expect(screen.getByText(`${first?.version} · ${first?.license}`)).toBeTruthy();
  });
});
