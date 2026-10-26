import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet, Text } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import { size } from '../../design/tokens';
import { ScreenHeaderBar } from '../ScreenHeaderBar';

function topPadding() {
  let node = screen.getByRole('button', { name: '閉じる' }).parent;
  while (node) {
    const padding = (StyleSheet.flatten(node.props.style) as { paddingTop?: number } | null)?.paddingTop;
    if (padding !== undefined) return padding;
    node = node.parent;
  }
  return undefined;
}

describe('ScreenHeaderBar', () => {
  it('タイトルと閉じるボタンを出し、閉じるで onClose を呼ぶ', async () => {
    const onClose = jest.fn();
    await render(<ScreenHeaderBar title="ISBN を入力する" onClose={onClose} />);
    expect(screen.getByText('ISBN を入力する')).toBeTruthy();
    const close = screen.getByRole('button', { name: '閉じる' });
    const style = StyleSheet.flatten(close.props.style);
    expect(style.width).toBeGreaterThanOrEqual(size.touchMin);
    expect(style.height).toBeGreaterThanOrEqual(size.touchMin);
    await fireEvent.press(close);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('上端のセーフエリア分だけ上余白が増える', async () => {
    await render(
      <SafeAreaInsetsContext.Provider value={{ top: 47, left: 0, right: 0, bottom: 0 }}>
        <ScreenHeaderBar title="t" onClose={jest.fn()} />
      </SafeAreaInsetsContext.Provider>,
    );
    expect(topPadding()).toBe(47 + 8);
  });

  it('インセットがなければ space の分だけ', async () => {
    await render(<ScreenHeaderBar title="t" onClose={jest.fn()} />);
    expect(topPadding()).toBe(8);
  });

  it('右の要素を出す', async () => {
    await render(<ScreenHeaderBar title="t" onClose={jest.fn()} right={<Text>右</Text>} />);
    expect(screen.getByText('右')).toBeTruthy();
  });

  it('children があればタイトルの代わりに中央に出す', async () => {
    await render(
      <ScreenHeaderBar title="出ない" onClose={jest.fn()}>
        <Text>検索欄</Text>
      </ScreenHeaderBar>,
    );
    expect(screen.getByText('検索欄')).toBeTruthy();
    expect(screen.queryByText('出ない')).toBeNull();
  });

  it('divider=false なら区切り線を出さない', async () => {
    await render(<ScreenHeaderBar title="t" onClose={jest.fn()} divider={false} onImage />);
    expect(screen.getByRole('button', { name: '閉じる' })).toBeTruthy();
  });
});
