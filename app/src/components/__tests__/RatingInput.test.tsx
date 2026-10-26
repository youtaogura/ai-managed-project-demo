import { fireEvent, render, screen } from '@testing-library/react-native';

import { triggerRatingHaptic } from '../../lib/haptics';
import { RatingInput } from '../RatingInput';

jest.mock('../../lib/haptics', () => ({ triggerRatingHaptic: jest.fn() }));

const star = () => screen.getByLabelText('レーティング');
const touch = (name: string, x: number) =>
  fireEvent(star(), name, { nativeEvent: { locationX: x, pageX: x } });
const press = (name: string) => fireEvent.press(screen.getByRole('button', { name }));

beforeEach(() => jest.clearAllMocks());

describe('RatingInput', () => {
  it('＋/− で 0.1 ずつ変わりクランプされる', async () => {
    const onChange = jest.fn();
    await render(<RatingInput value="3.0" onChange={onChange} />);
    await press('レーティングを 0.1 上げる');
    expect(onChange).toHaveBeenLastCalledWith('3.1');
    await press('レーティングを 0.1 下げる');
    expect(onChange).toHaveBeenLastCalledWith('2.9');
  });

  it('5.0 の＋と 1.0 の− は変わらない', async () => {
    const onChange = jest.fn();
    const { rerender } = await render(<RatingInput value="5.0" onChange={onChange} />);
    await press('レーティングを 0.1 上げる');
    await rerender(<RatingInput value="1.0" onChange={onChange} />);
    await press('レーティングを 0.1 下げる');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('未入力で＋は 3.0、−は未入力のまま。触覚は鳴らさない', async () => {
    const onChange = jest.fn();
    await render(<RatingInput value="" onChange={onChange} />);
    await press('レーティングを 0.1 下げる');
    expect(onChange).not.toHaveBeenCalled();
    await press('レーティングを 0.1 上げる');
    expect(onChange).toHaveBeenCalledWith('3.0');
    expect(triggerRatingHaptic).not.toHaveBeenCalled();
    expect(screen.getAllByText('未評価').length).toBeGreaterThan(0);
  });

  it('クリアで空に戻る。未入力ではクリアできない', async () => {
    const onChange = jest.fn();
    const { rerender } = await render(<RatingInput value="4.2" onChange={onChange} />);
    expect(screen.getAllByText('4.2').length).toBeGreaterThan(0);
    await press('レーティングをクリア');
    expect(onChange).toHaveBeenCalledWith('');
    expect(triggerRatingHaptic).not.toHaveBeenCalled();
    onChange.mockClear();
    await rerender(<RatingInput value="" onChange={onChange} />);
    await press('レーティングをクリア');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('整数の境目をまたぐと触覚が鳴る', async () => {
    const onChange = jest.fn();
    const { rerender } = await render(<RatingInput value="2.9" onChange={onChange} />);
    await press('レーティングを 0.1 上げる');
    expect(triggerRatingHaptic).toHaveBeenCalledTimes(1);
    await rerender(<RatingInput value="3.0" onChange={onChange} />);
    await press('レーティングを 0.1 上げる');
    expect(triggerRatingHaptic).toHaveBeenCalledTimes(1);
    await rerender(<RatingInput value="2.8" onChange={onChange} />);
    await press('レーティングを 0.1 上げる');
    expect(triggerRatingHaptic).toHaveBeenCalledTimes(1);
  });

  it('ドラッグで複数の境目を飛んでも 1 回、同じ値では鳴らさない', async () => {
    const onChange = jest.fn();
    await render(<RatingInput value="2.0" onChange={onChange} />);
    await fireEvent(star(), 'layout', { nativeEvent: { layout: { width: 200 } } });
    await touch('responderGrant', 160);
    expect(onChange).toHaveBeenCalledWith('4.0');
    expect(triggerRatingHaptic).toHaveBeenCalledTimes(1);
    await touch('responderMove', 50);
    expect(onChange).toHaveBeenLastCalledWith('1.3');
    onChange.mockClear();
    await touch('responderMove', 50);
    await touch('responderRelease', 50);
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it('adjustable と増減アクション、スクロール奪取防止', async () => {
    const onChange = jest.fn();
    await render(<RatingInput value="3.0" onChange={onChange} error="エラー" />);
    expect(star().props.accessibilityRole).toBe('adjustable');
    expect(star().props.accessibilityValue).toEqual({ text: '3.0' });
    expect(star().props.onResponderTerminationRequest()).toBe(false);
    await fireEvent(star(), 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
    expect(onChange).toHaveBeenLastCalledWith('3.1');
    await fireEvent(star(), 'accessibilityAction', { nativeEvent: { actionName: 'decrement' } });
    expect(onChange).toHaveBeenLastCalledWith('2.9');
    expect(screen.getByText('エラー')).toBeTruthy();
  });

  it('不正な値は未入力として扱う', async () => {
    await render(<RatingInput value="abc" onChange={jest.fn()} />);
    expect(star().props.accessibilityValue).toEqual({ text: '未評価' });
  });
});
