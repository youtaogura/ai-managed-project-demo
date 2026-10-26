import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import { useTopInset } from '../useTopInset';

function Probe() {
  return <Text>{`top:${useTopInset()}`}</Text>;
}

describe('useTopInset', () => {
  it('SafeAreaInsetsContext の上端インセットを返す', async () => {
    await render(
      <SafeAreaInsetsContext.Provider value={{ top: 59, left: 0, right: 0, bottom: 34 }}>
        <Probe />
      </SafeAreaInsetsContext.Provider>,
    );
    expect(screen.getByText('top:59')).toBeTruthy();
  });

  it('Provider がなければ 0 を返す', async () => {
    await render(<Probe />);
    expect(screen.getByText('top:0')).toBeTruthy();
  });
});
