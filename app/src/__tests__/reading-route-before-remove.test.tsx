import { render } from "@testing-library/react-native";

import ReadingRoute from "../app/reading/[id]";

type Listener = (e: { data?: { action?: { type?: string } } }) => void;

const mockClose = jest.fn();
let mockListener: Listener | undefined;

jest.mock("expo-router", () => ({
  Stack: { Screen: () => null },
  useLocalSearchParams: () => ({ id: "r1" }),
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  useNavigation: () => ({
    addListener: (_type: string, l: Listener) => {
      mockListener = l;
      return () => {};
    },
  }),
}));
jest.mock("../hooks/useBookFlight", () => ({
  useBookFlight: () => ({ close: mockClose }),
}));
jest.mock("../screens/ReadingScreen", () => ({ ReadingScreen: () => null }));

describe("読んでる本のルートの beforeRemove", () => {
  beforeEach(async () => {
    mockClose.mockClear();
    mockListener = undefined;
    await render(<ReadingRoute />);
  });

  it.each(["GO_BACK", "POP", "POP_TO"])(
    "%s のときは背表紙を棚へ戻す",
    (type) => {
      mockListener?.({ data: { action: { type } } });
      expect(mockClose).toHaveBeenCalledWith("r1");
    },
  );

  it.each(["REPLACE", "NAVIGATE", "PUSH"])("%s のときは動かさない", (type) => {
    mockListener?.({ data: { action: { type } } });
    expect(mockClose).not.toHaveBeenCalled();
  });

  it("action がないときも動かさない", () => {
    mockListener?.({});
    expect(mockClose).not.toHaveBeenCalled();
  });
});
