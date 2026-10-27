import { act, renderHook, waitFor } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import { useReduceMotion } from '../useReduceMotion';

describe('useReduceMotion', () => {
  afterEach(() => jest.restoreAllMocks());

  it('設定がオンなら true、変更も拾う', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    let emit: (v: boolean) => void = () => undefined;
    const remove = jest.fn();
    jest.spyOn(AccessibilityInfo, 'addEventListener').mockImplementation((_name, handler) => {
      emit = handler as (v: boolean) => void;
      return { remove };
    });
    const { result, unmount } = await renderHook(() => useReduceMotion());
    await waitFor(() => expect(result.current).toBe(true));
    await act(async () => emit(false));
    expect(result.current).toBe(false);
    await unmount();
    expect(remove).toHaveBeenCalled();
  });

  it('オフなら false', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
    const { result } = await renderHook(() => useReduceMotion());
    expect(result.current).toBe(false);
  });
});
