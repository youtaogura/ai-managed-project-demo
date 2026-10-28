import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

/**
 * キーボードが開いているか。iOS は開き始め（Will）、Android は Will が来ないので開いたあと（Did）で切り替える。
 * Web ではイベントが来ないので常に false。
 */
export function useKeyboardVisible(): boolean {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const ios = Platform.OS === 'ios';
    const show = Keyboard.addListener(ios ? 'keyboardWillShow' : 'keyboardDidShow', () => setVisible(true));
    const hide = Keyboard.addListener(ios ? 'keyboardWillHide' : 'keyboardDidHide', () => setVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return visible;
}
