import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

import { triggerRatingHaptic } from '../haptics';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light' },
}));

const impact = Haptics.impactAsync as jest.Mock;
const original = Platform.OS;
const setOS = (os: typeof Platform.OS) => {
  Object.defineProperty(Platform, 'OS', { value: os, configurable: true });
};

beforeEach(() => impact.mockReset());
afterEach(() => setOS(original));

describe('triggerRatingHaptic', () => {
  it('ネイティブでは Light で呼ぶ', () => {
    setOS('ios');
    impact.mockResolvedValue(undefined);
    triggerRatingHaptic();
    expect(impact).toHaveBeenCalledWith('light');
  });

  it('web では呼ばない', () => {
    setOS('web');
    triggerRatingHaptic();
    expect(impact).not.toHaveBeenCalled();
  });

  it('reject / throw を握りつぶす', async () => {
    setOS('android');
    impact.mockRejectedValue(new Error('unsupported'));
    expect(() => triggerRatingHaptic()).not.toThrow();
    await Promise.resolve();
    impact.mockImplementation(() => {
      throw new Error('boom');
    });
    expect(() => triggerRatingHaptic()).not.toThrow();
  });
});
