import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { useEffect } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';

import { Shelf } from '../../components/Shelf';
import { FLIGHT_DURATION_MS } from '../../lib/bookMotion';
import { makeRecord } from '../../testUtils';
import { BookFlightProvider, useBookFlight, useHeroSpine } from '../useBookFlight';

const HIDDEN = { includeHiddenElements: true };
const reading = makeRecord({ id: 'b1', title: '読んでる本', status: 'in_progress' });
const done = makeRecord({ id: 'b2', title: '読んだ本', status: 'completed' });

// measureInWindow は呼び出した View ごとに決めた矩形を返す
function mockMeasure(rects: (view: unknown) => [number, number, number, number]) {
  const proto = View.prototype as unknown as { measureInWindow?: unknown };
  const original = proto.measureInWindow;
  proto.measureInWindow = function (this: unknown, cb: (...args: number[]) => void) {
    cb(...rects(this));
  };
  return () => {
    proto.measureInWindow = original;
  };
}

function Hero({ id, closeRef }: { id: string; closeRef: { current: ((id: string) => void) | null } }) {
  const { ref, onLayout, hidden } = useHeroSpine(id);
  const { close } = useBookFlight();
  useEffect(() => {
    closeRef.current = close;
  }, [close, closeRef]);
  return <View testID="hero" ref={ref} onLayout={onLayout} style={hidden ? { opacity: 0 } : undefined} />;
}

async function setup(withHero = false) {
  const closeRef: { current: ((id: string) => void) | null } = { current: null };
  const onPressRecord = jest.fn();
  const view = await render(
    <BookFlightProvider>
      <Shelf records={[reading, done]} width={400} onPressRecord={onPressRecord} />
      {withHero ? <Hero id="b1" closeRef={closeRef} /> : null}
    </BookFlightProvider>,
  );
  return { view, onPressRecord, closeRef };
}

describe('BookFlightProvider', () => {
  let restore: () => void = () => undefined;
  beforeEach(() => {
    jest.useFakeTimers();
    restore = mockMeasure(() => [20, 400, 30, 120]);
  });
  afterEach(() => {
    restore();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('読んでる本を押すと onPressRecord と同時に取り出しオーバーレイが出て、終わりで消える', async () => {
    const { onPressRecord } = await setup();
    expect(screen.queryByTestId('book-flight', HIDDEN)).toBeNull();
    await fireEvent.press(screen.getByLabelText(/^読んでる本、/));
    expect(onPressRecord).toHaveBeenCalledWith(reading);
    const overlay = screen.getByTestId('book-flight', HIDDEN);
    expect(overlay.props.pointerEvents).toBe('none');
    const flat = StyleSheet.flatten(overlay.props.style);
    expect(flat.transform).toBeDefined();

    await act(async () => {
      jest.advanceTimersByTime(FLIGHT_DURATION_MS + 50);
    });
    expect(screen.queryByTestId('book-flight', HIDDEN)).toBeNull();
  });

  it('連打してもオーバーレイは 1 つだけで、残らない', async () => {
    await setup();
    const press = () => fireEvent.press(screen.getByLabelText(/^読んでる本、/));
    await press();
    await press();
    await act(async () => {
      jest.advanceTimersByTime(100);
    });
    await press();
    expect(screen.getAllByTestId('book-flight', HIDDEN)).toHaveLength(1);
    await act(async () => {
      jest.advanceTimersByTime(FLIGHT_DURATION_MS + 50);
    });
    expect(screen.queryByTestId('book-flight', HIDDEN)).toBeNull();
  });

  it('読んでる以外の本は動きなしで onPressRecord だけ', async () => {
    const { onPressRecord } = await setup();
    await fireEvent.press(screen.getByLabelText(/^読んだ本、/));
    expect(onPressRecord).toHaveBeenCalledWith(done);
    expect(screen.queryByTestId('book-flight', HIDDEN)).toBeNull();
  });

  it('位置が測れないときは、押しても動きは出ないが onPressRecord は呼ばれる', async () => {
    restore();
    restore = mockMeasure(() => [Number.NaN, 0, 0, 0]);
    const { onPressRecord } = await setup();
    await fireEvent.press(screen.getByLabelText(/^読んでる本、/));
    expect(onPressRecord).toHaveBeenCalled();
    expect(screen.queryByTestId('book-flight', HIDDEN)).toBeNull();
  });

  it('動きを減らすときは transform を持たず、不透明度だけ変わる', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    await setup();
    await act(async () => undefined);
    await fireEvent.press(screen.getByLabelText(/^読んでる本、/));
    const flat = StyleSheet.flatten(screen.getByTestId('book-flight', HIDDEN).props.style);
    expect(flat.transform).toBeUndefined();
    expect(flat.opacity).toBeDefined();
  });

  it('動いている間、棚の背表紙は不透明度 0、終わりで戻る', async () => {
    await setup();
    await fireEvent.press(screen.getByLabelText(/^読んでる本、/));
    const shelfSpine = () => screen.getByLabelText(/^読んでる本、/, { includeHiddenElements: false });
    const wrapper = () => shelfSpine().parent;
    expect(StyleSheet.flatten(wrapper()?.props.style)?.opacity).toBe(0);
    await act(async () => {
      jest.advanceTimersByTime(FLIGHT_DURATION_MS + 50);
    });
    expect(StyleSheet.flatten(wrapper()?.props.style)?.opacity).toBeUndefined();
  });

  it('戻るとき、棚の位置が測れればヒーローから棚へ戻る動きが出る', async () => {
    const { closeRef } = await setup(true);
    await act(async () => closeRef.current?.('b1'));
    expect(screen.getByTestId('book-flight', HIDDEN)).toBeTruthy();
    expect(StyleSheet.flatten(screen.getByTestId('hero').props.style)).toMatchObject({ opacity: 0 });
    await act(async () => {
      jest.advanceTimersByTime(FLIGHT_DURATION_MS + 50);
    });
    await waitFor(() => expect(screen.queryByTestId('book-flight', HIDDEN)).toBeNull());
  });

  it('戻るとき、棚に載っていない本なら何も出さない', async () => {
    const { closeRef } = await setup(true);
    await act(async () => closeRef.current?.('unknown'));
    expect(screen.queryByTestId('book-flight', HIDDEN)).toBeNull();
  });

  it('途中でアンマウントしてもクラッシュしない', async () => {
    const { view } = await setup();
    await fireEvent.press(screen.getByLabelText(/^読んでる本、/));
    await view.unmount();
    await act(async () => {
      jest.advanceTimersByTime(FLIGHT_DURATION_MS + 50);
    });
  });
});

describe('プロバイダーなし', () => {
  it('Shelf は動きなしで押せる', async () => {
    const onPressRecord = jest.fn();
    await render(<Shelf records={[reading]} width={400} onPressRecord={onPressRecord} />);
    await fireEvent.press(screen.getByLabelText(/^読んでる本、/));
    expect(onPressRecord).toHaveBeenCalled();
    expect(screen.queryByTestId('book-flight', HIDDEN)).toBeNull();
  });
});
