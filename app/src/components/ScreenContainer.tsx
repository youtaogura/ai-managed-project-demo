import { useContext, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaInsetsContext } from "react-native-safe-area-context";

import { colors } from "../theme";

// ナビゲーションヘッダーのない画面用。上端のセーフエリア分の余白を確保する。
// ヘッダーがある画面で使うと余白が二重になるので使わない。
export function ScreenContainer({ children }: { children: ReactNode }) {
  const insets = useContext(SafeAreaInsetsContext);
  return (
    <View style={[styles.container, { paddingTop: insets?.top ?? 0 }]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
});
