import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

export function triggerImpactHaptic(): void {
  if (Platform.OS === 'web') return;
  try {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  } catch {
    // 非対応端末では何もしない
  }
}

export function triggerRatingHaptic(): void {
  triggerImpactHaptic();
}
