import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { BottomSheet, releaseSwipe, shouldDismissSwipe } from '../BottomSheet';

describe('BottomSheet', () => {
  it('visible=false では描画しない', async () => {
    await render(
      <BottomSheet visible={false} onClose={jest.fn()} title="見出し">
        <Text>中身</Text>
      </BottomSheet>,
    );
    expect(screen.queryByText('中身')).toBeNull();
  });

  it('visible で中身・見出し・ダイアログ属性を出す', async () => {
    await render(
      <BottomSheet visible onClose={jest.fn()} title="見出し">
        <Text>中身</Text>
      </BottomSheet>,
    );
    expect(screen.getByText('中身')).toBeTruthy();
    expect(screen.getByText('見出し')).toBeTruthy();
    expect(screen.getByLabelText('見出し').props.accessibilityViewIsModal).toBe(true);
  });

  it('scrim・閉じるボタン・戻るで onClose、本体タップでは呼ばない', async () => {
    const onClose = jest.fn();
    await render(
      <BottomSheet visible onClose={onClose} showCloseButton>
        <Text>中身</Text>
      </BottomSheet>,
    );
    await fireEvent.press(screen.getByText('中身'));
    expect(onClose).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByTestId('bottom-sheet-scrim', { includeHiddenElements: true }));
    expect(onClose).toHaveBeenCalledTimes(1);
    await fireEvent.press(screen.getByLabelText('閉じる'));
    expect(onClose).toHaveBeenCalledTimes(2);
    await act(async () => {
      screen.getByTestId('bottom-sheet-modal').props.onRequestClose();
    });
    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it('スワイプ解放でしきい値を超えれば onClose、未満なら戻す', () => {
    const onClose = jest.fn();
    const reset = jest.fn();
    releaseSwipe(100, 0, onClose, reset);
    expect(onClose).toHaveBeenCalledTimes(1);
    releaseSwipe(10, 0, onClose, reset);
    expect(reset).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('つまみ領域に PanResponder のハンドラがある', async () => {
    await render(<BottomSheet visible onClose={jest.fn()} />);
    expect(typeof screen.getByTestId('bottom-sheet-handle-area').props.onResponderRelease).toBe('function');
  });

  it('スワイプ判定', () => {
    expect(shouldDismissSwipe(100, 0)).toBe(true);
    expect(shouldDismissSwipe(30, 1)).toBe(true);
    expect(shouldDismissSwipe(30, 0.1)).toBe(false);
    expect(shouldDismissSwipe(-10, 2)).toBe(false);
  });
});
