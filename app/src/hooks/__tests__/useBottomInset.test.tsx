import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import { useBottomInset } from '../useBottomInset';

function Probe() {
  return <Text>{`bottom:${useBottomInset()}`}</Text>;
}

describe('useBottomInset', () => {
  it('SafeAreaInsetsContext の下端インセットを返す', async () => {
    await render(
      <SafeAreaInsetsContext.Provider value={{ top: 59, left: 0, right: 0, bottom: 34 }}>
        <Probe />
      </SafeAreaInsetsContext.Provider>,
    );
    expect(screen.getByText('bottom:34')).toBeTruthy();
  });

  it('Provider がなければ 0 を返す', async () => {
    await render(<Probe />);
    expect(screen.getByText('bottom:0')).toBeTruthy();
  });
});
