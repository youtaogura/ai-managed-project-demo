import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useBookLookup } from '../hooks/useBookLookup';
import { toIsbn13 } from '../lib/isbn';
import { bookInfoToParams, isbnOnlyParams } from '../lib/isbnLookupParams';
import { colors, formColors, spacing } from '../theme';

export const ERROR_ISBN_INVALID = 'ISBN を正しく入力してください（10 桁または 13 桁）';
export const MESSAGE_NOT_FOUND = '見つかりませんでした';
export const MESSAGE_LOOKUP_ERROR = '書誌情報を取得できませんでした。通信状況を確認してください';

type Status = 'idle' | 'loading' | 'invalid' | 'not_found' | 'error';

export function IsbnLookupScreen() {
  const provider = useBookLookup();
  const [text, setText] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const running = useRef(false);
  const active = useRef(true);

  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);

  const loading = status === 'loading';

  const search = async () => {
    if (running.current) return;
    const isbn13 = toIsbn13(text);
    if (isbn13 === null) {
      setStatus('invalid');
      return;
    }
    running.current = true;
    setStatus('loading');
    try {
      const result = await provider.lookupByIsbn(isbn13);
      if (!active.current) return;
      if (result.status === 'found') {
        router.replace({
          pathname: '/record/new',
          params: bookInfoToParams(result.book),
        });
        return;
      }
      setStatus(result.status);
    } finally {
      running.current = false;
    }
  };

  const continueManually = () => {
    router.replace({
      pathname: '/record/new',
      params: isbnOnlyParams(toIsbn13(text)),
    });
  };

  const onChangeText = (value: string) => {
    setText(value);
    setStatus((current) => (current === 'loading' ? current : 'idle'));
  };

  return (
    <View style={styles.container}>
      <Text style={styles.description}>ISBN（10 桁または 13 桁）を入力してください</Text>
      <TextInput
        accessibilityLabel="ISBN"
        keyboardType="number-pad"
        value={text}
        onChangeText={onChangeText}
        editable={!loading}
        style={styles.input}
      />
      {status === 'invalid' ? <Text style={styles.error}>{ERROR_ISBN_INVALID}</Text> : null}
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: loading }}
        disabled={loading}
        onPress={() => void search()}
        style={[styles.primary, loading && styles.disabled]}
      >
        {loading ? (
          <ActivityIndicator color={colors.onTint} />
        ) : (
          <Text style={styles.primaryText}>探す</Text>
        )}
      </Pressable>
      {status === 'not_found' ? <Text style={styles.message}>{MESSAGE_NOT_FOUND}</Text> : null}
      {status === 'error' ? (
        <View style={styles.block}>
          <Text style={styles.error}>{MESSAGE_LOOKUP_ERROR}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => void search()}
            style={styles.secondary}
          >
            <Text style={styles.secondaryText}>再試行</Text>
          </Pressable>
        </View>
      ) : null}
      <Pressable
        accessibilityRole="button"
        onPress={continueManually}
        style={status === 'not_found' ? styles.primary : styles.secondary}
      >
        <Text style={status === 'not_found' ? styles.primaryText : styles.secondaryText}>
          手入力で続ける
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.md,
    gap: spacing.md,
    backgroundColor: colors.background,
  },
  description: { fontSize: 14, color: colors.textMuted },
  input: {
    padding: spacing.md,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: formColors.border,
    backgroundColor: formColors.inputBackground,
    fontSize: 16,
    color: colors.text,
  },
  block: { gap: spacing.sm },
  error: { color: formColors.danger, fontSize: 14 },
  message: { color: colors.text, fontSize: 16 },
  primary: {
    padding: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: colors.tint,
  },
  primaryText: { color: colors.onTint, fontSize: 16, fontWeight: '600' },
  disabled: { backgroundColor: formColors.disabled },
  secondary: { padding: spacing.md, alignItems: 'center' },
  secondaryText: { color: colors.tint, fontSize: 16 },
});
