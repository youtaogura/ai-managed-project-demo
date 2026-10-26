import { render, screen } from "@testing-library/react-native";
import { StyleSheet, Text } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ScreenContainer } from "../ScreenContainer";

const frame = { x: 0, y: 0, width: 390, height: 844 };

describe("ScreenContainer", () => {
  it("上端インセット分の paddingTop を持つ", async () => {
    await render(
      <SafeAreaProvider
        initialMetrics={{
          frame,
          insets: { top: 47, left: 0, right: 0, bottom: 0 },
        }}
      >
        <ScreenContainer>
          <Text testID="child">内容</Text>
        </ScreenContainer>
      </SafeAreaProvider>,
    );
    const container = screen.getByTestId("child").parent;
    expect(StyleSheet.flatten(container?.props.style).paddingTop).toBe(47);
  });

  it("プロバイダーがなくても余白 0 で描画する", async () => {
    await render(
      <ScreenContainer>
        <Text testID="child">内容</Text>
      </ScreenContainer>,
    );
    const container = screen.getByTestId("child").parent;
    expect(StyleSheet.flatten(container?.props.style).paddingTop).toBe(0);
  });
});
