import { renderHook } from '@testing-library/react-native';
import { useFonts } from 'expo-font';

import { useAppFonts } from '../useAppFonts';

jest.mock('expo-font', () => ({ useFonts: jest.fn() }));
const mockUseFonts = jest.mocked(useFonts);

describe('useAppFonts', () => {
  it('読み込み中は ready=false', async () => {
    mockUseFonts.mockReturnValue([false, null]);
    const { result } = await renderHook(() => useAppFonts());
    expect(result.current.ready).toBe(false);
  });

  it('完了すると ready=true', async () => {
    mockUseFonts.mockReturnValue([true, null]);
    const { result } = await renderHook(() => useAppFonts());
    expect(result.current.ready).toBe(true);
  });

  it('失敗しても ready=true', async () => {
    mockUseFonts.mockReturnValue([false, new Error('fail')]);
    const { result } = await renderHook(() => useAppFonts());
    expect(result.current.ready).toBe(true);
  });
});
