import {
  computeFlightFrames,
  FLIGHT_DURATION_MS,
  LIFT_PX,
  LIFT_SCALE,
  shelfLayoutAnimation,
} from '../bookMotion';

const from = { x: 20, y: 400, width: 30, height: 120 };
const to = { x: 24, y: 100, width: 40, height: 150 };

describe('bookMotion', () => {
  it('動きの総時間は 300ms 以内、持ち上げは押下の 4px より大きい', () => {
    expect(FLIGHT_DURATION_MS).toBeLessThanOrEqual(300);
    expect(LIFT_PX).toBeGreaterThan(4);
  });

  it('取り出すときは持ち上げて拡大してから、先の矩形へ移る', () => {
    const frames = computeFlightFrames(from, to);
    expect(frames.inputRange).toHaveLength(3);
    expect(frames.translateY).toEqual([0, -LIFT_PX, -300]);
    expect(frames.translateX).toEqual([0, 0, 4]);
    expect(frames.scaleX).toEqual([1, LIFT_SCALE, 40 / 30]);
    expect(frames.scaleY).toEqual([1, LIFT_SCALE, 150 / 120]);
  });

  it('戻すときは持ち上げず、一直線に移る', () => {
    const frames = computeFlightFrames(to, from, false);
    expect(frames.inputRange).toEqual([0, 1]);
    expect(frames.translateY).toEqual([0, 300]);
    expect(frames.scaleX).toEqual([1, 30 / 40]);
  });

  it('元の大きさが 0 でも拡大率は 1', () => {
    const frames = computeFlightFrames({ x: 0, y: 0, width: 0, height: 0 }, to, false);
    expect(frames.scaleX).toEqual([1, 1]);
  });

  it('棚の動き: 通常は位置の移動（update）あり、動きを減らすときは不透明度だけ', () => {
    expect(shelfLayoutAnimation(false).update).toBeDefined();
    const reduced = shelfLayoutAnimation(true);
    expect(reduced.update).toBeUndefined();
    expect(reduced.create).toMatchObject({ property: 'opacity' });
    expect(reduced.delete).toMatchObject({ property: 'opacity' });
  });
});
