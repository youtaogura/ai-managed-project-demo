import { act, renderHook } from '@testing-library/react-native';
import { router } from 'expo-router';

import { useAddSheet } from '../useAddSheet';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

beforeEach(() => jest.clearAllMocks());

describe('useAddSheet', () => {
  it('openAdd でシートを開き、closeAdd で閉じる', async () => {
    const { result } = await renderHook(() => useAddSheet());
    await act(async () => result.current.openAdd());
    expect(result.current.addOpen).toBe(true);
    expect(router.push).not.toHaveBeenCalled();
    await act(async () => result.current.closeAdd());
    expect(result.current.addOpen).toBe(false);
  });

  it('手入力は onAdd、各入口は対応する画面へ', async () => {
    const onAdd = jest.fn();
    const { result } = await renderHook(() => useAddSheet(onAdd));
    await act(async () => result.current.select('manual'));
    expect(onAdd).toHaveBeenCalled();
    await act(async () => result.current.select('scan'));
    expect(router.push).toHaveBeenCalledWith('/record/scan');
    await act(async () => result.current.select('search'));
    expect(router.push).toHaveBeenCalledWith('/record/search');
    await act(async () => result.current.select('isbn'));
    expect(router.push).toHaveBeenCalledWith('/record/isbn');
  });
});
