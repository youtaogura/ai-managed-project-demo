import { render, screen } from "@testing-library/react-native";
import { Animated, StyleSheet } from "react-native";

import { makeRecord } from "../../testUtils";
import { BookFlightOverlay, type Flight } from "../BookFlightOverlay";

const baseFlight: Flight = {
  key: 1,
  record: makeRecord({ id: "b1", title: "本" }),
  from: { x: 10, y: 200, width: 30, height: 120 },
  to: { x: 20, y: 80, width: 40, height: 150 },
  direction: "open",
  reduceMotion: false,
};

function layerStyle() {
  return StyleSheet.flatten(
    screen.getByTestId("book-flight", { includeHiddenElements: true }).props
      .style,
  );
}

const ranges: number[][] = [];
const inputRanges = () => ranges;

describe("BookFlightOverlay", () => {
  beforeEach(() => {
    ranges.length = 0;
    const original = Animated.Value.prototype.interpolate;
    jest
      .spyOn(Animated.Value.prototype, "interpolate")
      .mockImplementation(function (this: Animated.Value, config) {
        ranges.push([...config.inputRange]);
        return original.call(this, config);
      });
  });

  afterEach(() => jest.restoreAllMocks());

  it("flight が null のときは何も描かない", async () => {
    await render(<BookFlightOverlay flight={null} onDone={() => {}} />);
    expect(
      screen.queryByTestId("book-flight", { includeHiddenElements: true }),
    ).toBeNull();
  });

  it('操作を受け付けない（pointerEvents="none"）', async () => {
    await render(<BookFlightOverlay flight={baseFlight} onDone={() => {}} />);
    expect(
      screen.getByTestId("book-flight", { includeHiddenElements: true }).props
        .pointerEvents,
    ).toBe("none");
  });

  it("open は持ち上げの中間フレームを持ち、close は持たない", async () => {
    const { rerender } = await render(
      <BookFlightOverlay flight={baseFlight} onDone={() => {}} />,
    );
    const open = layerStyle();
    expect(open.left).toBe(10);
    expect(open.top).toBe(200);
    expect(inputRanges()).toContainEqual(expect.arrayContaining([0, 1]));
    expect(Math.max(...inputRanges().map((r) => r.length))).toBe(3);

    ranges.length = 0;
    await rerender(
      <BookFlightOverlay
        flight={{ ...baseFlight, key: 2, direction: "close" }}
        onDone={() => {}}
      />,
    );
    expect(Math.max(...inputRanges().map((r) => r.length))).toBe(2);
  });

  it("動きを減らすときは transform がなく、不透明度だけで現れる", async () => {
    await render(
      <BookFlightOverlay
        flight={{ ...baseFlight, reduceMotion: true }}
        onDone={() => {}}
      />,
    );
    const style = layerStyle();
    expect(style.transform).toBeUndefined();
    expect(style.opacity).toBeDefined();
    expect(style.left).toBe(20);
    expect(style.top).toBe(80);
    expect(
      screen.getByTestId("book-flight", { includeHiddenElements: true }).props
        .pointerEvents,
    ).toBe("none");
  });
});
