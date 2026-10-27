import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo, StyleSheet } from 'react-native';

import { StatusTabs } from '../StatusTabs';

const counts = { all: 5, in_progress: 1, completed: 3, planned: 1 };

describe('StatusTabs', () => {
  it('4 つのタブと件数を出し、選択中は selected', async () => {
    await render(<StatusTabs value="completed" counts={counts} onChange={jest.fn()} />);
    expect(screen.getAllByRole('tab')).toHaveLength(4);
    expect(screen.getByRole('tab', { name: '読んだ 3' }).props.accessibilityState.selected).toBe(true);
    expect(screen.getByRole('tab', { name: 'すべて 5' }).props.accessibilityState.selected).toBe(false);
  });

  it('押すと onChange に値が渡る', async () => {
    const onChange = jest.fn();
    await render(<StatusTabs value="all" counts={counts} onChange={onChange} />);
    await fireEvent.press(screen.getByRole('tab', { name: '読みたい 1' }));
    expect(onChange).toHaveBeenCalledWith('planned');
  });

  describe('下線', () => {
    const layout = (x: number, width: number) => ({ nativeEvent: { layout: { x, y: 0, width, height: 44 } } });
    const measureAll = async () => {
      await fireEvent(screen.getByRole('tab', { name: 'すべて 5' }), 'layout', layout(20, 60));
      await fireEvent(screen.getByRole('tab', { name: '読んでる 1' }), 'layout', layout(100, 80));
      await fireEvent(screen.getByRole('tab', { name: '読んだ 3' }), 'layout', layout(200, 70));
    };
    const underline = () => StyleSheet.flatten(screen.getByTestId('status-underline').props.style);

    afterEach(() => {
      jest.useRealTimers();
      jest.restoreAllMocks();
    });

    it('測れる前は出さず、測れたら選択タブの位置と幅に置く', async () => {
      await render(<StatusTabs value="in_progress" counts={counts} onChange={jest.fn()} />);
      expect(screen.queryByTestId('status-underline')).toBeNull();
      await measureAll();
      expect(underline().width).toBe(80);
      expect(underline().transform).toEqual([{ translateX: 100 }]);
    });

    it('選択が変わると、選んだタブへすべる', async () => {
      jest.useFakeTimers();
      const view = await render(<StatusTabs value="all" counts={counts} onChange={jest.fn()} />);
      await measureAll();
      expect(underline().width).toBe(60);
      await view.rerender(<StatusTabs value="completed" counts={counts} onChange={jest.fn()} />);
      expect(screen.getByRole('tab', { name: '読んだ 3' }).props.accessibilityState.selected).toBe(true);
      await act(async () => {
        jest.advanceTimersByTime(400);
      });
      expect(underline().width).toBe(70);
      expect(underline().transform).toEqual([{ translateX: 200 }]);
    });

    it('動きを減らすときは即時に切り替わる', async () => {
      jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
      const view = await render(<StatusTabs value="all" counts={counts} onChange={jest.fn()} />);
      await act(async () => undefined);
      await measureAll();
      await view.rerender(<StatusTabs value="completed" counts={counts} onChange={jest.fn()} />);
      expect(underline().width).toBe(70);
      expect(underline().transform).toEqual([{ translateX: 200 }]);
    });
  });
});
