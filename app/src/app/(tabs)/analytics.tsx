import { StyleSheet, View } from 'react-native';

import { AppText } from '../../components/AppText';
import { ScreenContainer } from '../../components/ScreenContainer';
import { space } from '../../design/tokens';
import { AnalyticsScreen } from '../../screens/AnalyticsScreen';

// ネイティブのヘッダーは出さず、画面内の大きな見出しにする（中身の刷新は別 Issue）
export default function AnalyticsRoute() {
  return (
    <ScreenContainer>
      <View style={styles.header}>
        <AppText variant="screenTitle">振り返り</AppText>
      </View>
      <AnalyticsScreen />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: space[5], paddingVertical: space[3] },
});
