import { fireEvent, render, screen } from '@testing-library/react-native';

import { triggerRatingHaptic } from '../../lib/haptics';
import { RatingSlider } from '../RatingSlider';

jest.mock('../../lib/haptics', () => ({ triggerRatingHaptic: jest.fn(), triggerImpactHaptic: jest.fn() }));

const slider = () => screen.getByLabelText('どうだった？');
const touch = (name: string, x: number) => fireEvent(slider(), name, { nativeEvent: { locationX: x, pageX: x } });
const WIDTH = 100;
const layout = () => fireEvent(slider(), 'layout', { nativeEvent: { layout: { width: WIDTH } } });

beforeEach(() => jest.clearAllMocks());

describe('RatingSlider', () => {
  it('タップ位置から 0.1 刻みで値を出す', async () => {
    const onChange = jest.fn();
    await render(<RatingSlider value={null} onChange={onChange} />);
    await layout();
    await touch('responderGrant', 90);
    expect(onChange).toHaveBeenLastCalledWith(4.5);
    await touch('responderGrant', 73);
    expect(onChange).toHaveBeenLastCalledWith(3.7);
    expect(triggerRatingHaptic).not.toHaveBeenCalled();
  });

  it('整数をまたぐと触覚', async () => {
    const onChange = jest.fn();
    await render(<RatingSlider value={3.9} onChange={onChange} />);
    await layout();
    await touch('responderGrant', 80);
    expect(onChange).toHaveBeenLastCalledWith(4);
    expect(triggerRatingHaptic).toHaveBeenCalledTimes(1);
    await touch('responderMove', 82);
    await touch('responderRelease', 84);
    expect(onChange).toHaveBeenCalledWith(4.2);
  });

  it('範囲は 1.0〜5.0', async () => {
    const onChange = jest.fn();
    await render(<RatingSlider value={3} onChange={onChange} />);
    await layout();
    await touch('responderGrant', 500);
    expect(onChange).toHaveBeenLastCalledWith(5);
    await touch('responderGrant', -50);
    expect(onChange).toHaveBeenLastCalledWith(1);
  });

  it('幅が 0 のときは何もしない', async () => {
    const onChange = jest.fn();
    await render(<RatingSlider value={3} onChange={onChange} />);
    await fireEvent(slider(), 'layout', { nativeEvent: { layout: { width: 0 } } });
    await touch('responderGrant', 10);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('adjustable で increment / decrement が 0.1 ずつ増減する', async () => {
    const onChange = jest.fn();
    const { rerender } = await render(<RatingSlider value={3} onChange={onChange} />);
    expect(slider().props.accessibilityRole).toBe('adjustable');
    await fireEvent(slider(), 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
    expect(onChange).toHaveBeenLastCalledWith(3.1);
    await fireEvent(slider(), 'accessibilityAction', { nativeEvent: { actionName: 'decrement' } });
    expect(onChange).toHaveBeenLastCalledWith(2.9);
    expect(triggerRatingHaptic).toHaveBeenCalledTimes(1);
    onChange.mockClear();
    await rerender(<RatingSlider value={5} onChange={onChange} />);
    await fireEvent(slider(), 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('未選択では increment が 3.0、decrement が 1.0', async () => {
    const onChange = jest.fn();
    await render(<RatingSlider value={null} onChange={onChange} />);
    await fireEvent(slider(), 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
    expect(onChange).toHaveBeenLastCalledWith(3);
    await fireEvent(slider(), 'accessibilityAction', { nativeEvent: { actionName: 'decrement' } });
    expect(onChange).toHaveBeenLastCalledWith(1);
  });
});
