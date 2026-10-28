import { act, renderHook } from '@testing-library/react-native';
import { Keyboard, Platform } from 'react-native';

import { useKeyboardVisible } from '../useKeyboardVisible';

function captureListeners() {
  const listeners: { name: string; listener: () => void }[] = [];
  const remove = jest.fn();
  const spy = jest.spyOn(Keyboard, 'addListener').mockImplementation((name, listener) => {
    listeners.push({ name, listener: listener as () => void });
    return { remove } as unknown as ReturnType<typeof Keyboard.addListener>;
  });
  const emit = (name: string) => listeners.filter((l) => l.name === name).forEach((l) => l.listener());
  return { spy, emit, remove, names: () => listeners.map((l) => l.name) };
}

describe('useKeyboardVisible', () => {
  const originalOS = Platform.OS;
  afterEach(() => {
    Platform.OS = originalOS;
    jest.restoreAllMocks();
  });

  it('iOS は開き始め・閉じ始めで切り替わり、外すとリスナーを外す', async () => {
    Platform.OS = 'ios';
    const { emit, remove, names } = captureListeners();
    const { result, unmount } = await renderHook(() => useKeyboardVisible());
    expect(names()).toEqual(['keyboardWillShow', 'keyboardWillHide']);
    expect(result.current).toBe(false);
    await act(async () => emit('keyboardWillShow'));
    expect(result.current).toBe(true);
    await act(async () => emit('keyboardWillHide'));
    expect(result.current).toBe(false);
    await unmount();
    expect(remove).toHaveBeenCalledTimes(2);
  });

  it('Android は開いたあと・閉じたあと（Did）で切り替わる', async () => {
    Platform.OS = 'android';
    const { emit, names } = captureListeners();
    const { result } = await renderHook(() => useKeyboardVisible());
    expect(names()).toEqual(['keyboardDidShow', 'keyboardDidHide']);
    await act(async () => emit('keyboardDidShow'));
    expect(result.current).toBe(true);
    await act(async () => emit('keyboardDidHide'));
    expect(result.current).toBe(false);
  });
});
