import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useBookLookup } from '../hooks/useBookLookup';
import { toIsbn13 } from '../lib/isbn';
import { bookInfoToParams, isbnOnlyParams } from '../lib/isbnLookupParams';
import { colors, formColors, spacing } from '../theme';

type LookupState = 'idle' | 'loading' | 'invalid' | 'not_found' | 'error';

export function IsbnLookupScreen() {
  const provider = useBookLookup();
  const [text, setText] = useState('');
  const [state, setState] = useState<LookupState>('idle');
  const running = useRef(false);
  const active = useRef(true);

  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);

  const search = async () => {
    if (running.current) return;
    const isbn13 = toIsbn13(text);
    if (isbn13 === null) {
      setState('invalid');
      return;
    }
    running.current = true;
    setState('loading');
    const result = await provider.lookupByIsbn(isbn13);
    running.current = false;
    if (!active.current) return;
    if (result.status === 'found') {
      router.replace({
        pathname: '/record/new',
        params: bookInfoToParams(result.book),
      });
    } else {
      setState(result.status);
    }
  };

  const continueManually = () => {
    const isbn13 = toIsbn13(text);
    router.replace({
      pathname: '/record/new',
      params: isbn13 === null ? { kind: 'book' } : isbnOnlyParams(isbn13),
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.text}>ISBN（10 桁または 13 桁）を入力してください</Text>
      <TextInput
        accessibilityLabel="ISBN"
        keyboardType="number-pad"
        value={text}
        editable={state !== 'loading'}
        onChangeText={(value) => {
          setText(value);
          setState('idle');
        }}
        style={styles.input}
      />
      {state === 'invalid' ? (
        <Text style={styles.error}>ISBN を正しく入力してください（10 桁または 13 桁）</Text>
      ) : null}
      <Pressable
        accessibilityRole="button"
        disabled={state === 'loading'}
        onPress={() => void search()}
        style={[styles.button, state === 'loading' && styles.disabled]}
      >
        {state === 'loading' ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>探す</Text>
        )}
      </Pressable>
      {state === 'not_found' ? <Text style={styles.text}>見つかりませんでした</Text> : null}
      {state === 'error' ? (
        <Text style={styles.error}>書誌情報を取得できませんでした。通信状況を確認してください</Text>
      ) : null}
      {state === 'error' ? (
        <Pressable accessibilityRole="button" onPress={() => void search()} style={styles.button}>
          <Text style={styles.buttonText}>再試行</Text>
        </Pressable>
      ) : null}
      <Pressable accessibilityRole="button" onPress={continueManually} style={styles.button}>
        <Text style={styles.buttonText}>手入力で続ける</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
    gap: spacing.md,
    backgroundColor: colors.background,
  },
  text: { fontSize: 16, color: colors.text },
  error: { fontSize: 14, color: formColors.danger },
  input: {
    padding: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: formColors.border,
    backgroundColor: formColors.inputBackground,
  },
  button: {
    padding: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: colors.tint,
  },
  disabled: { backgroundColor: formColors.disabled },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
