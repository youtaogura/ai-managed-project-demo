import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useBottomInset } from '../hooks/useBottomInset';
import { useBookLookup } from '../hooks/useBookLookup';
import { useCoverResolver } from '../hooks/useCoverResolver';
import { useBookSearch } from '../hooks/useBookSearch';
import { candidateToParams, titleOnlyParams } from '../lib/candidateParams';
import { withCover } from '../lib/coverLookup/withCover';
import { bookInfoToParams } from '../lib/isbnLookupParams';
import { colors, formColors, spacing } from '../theme';
import type { BookCandidate } from '../types/bookSearch';

export const ERROR_KEYWORD_EMPTY = 'キーワードを入力してください';
export const MESSAGE_EMPTY = '見つかりませんでした';
export const MESSAGE_SEARCH_ERROR = '検索できませんでした。通信状況を確認してください';

type Status = 'idle' | 'searching' | 'invalid' | 'results' | 'empty' | 'error' | 'resolving';

function subtitle(candidate: BookCandidate): string {
  return [candidate.author, candidate.publisher, candidate.publishedYear]
    .filter((part): part is string => part !== null)
    .join(' / ');
}

export function TitleSearchScreen() {
  const bottomInset = useBottomInset();
  const searchProvider = useBookSearch();
  const lookupProvider = useBookLookup();
  const resolveCover = useCoverResolver();
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [candidates, setCandidates] = useState<BookCandidate[]>([]);
  const running = useRef(false);
  const active = useRef(true);

  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);

  const busy = status === 'searching' || status === 'resolving';

  const search = async () => {
    if (running.current) return;
    const trimmed = keyword.trim();
    if (trimmed === '') {
      setStatus('invalid');
      return;
    }
    running.current = true;
    setStatus('searching');
    try {
      const result = await searchProvider.search(trimmed);
      if (!active.current) return;
      if (result.status === 'error') {
        setStatus('error');
        return;
      }
      setCandidates(result.candidates);
      setStatus(result.candidates.length === 0 ? 'empty' : 'results');
    } finally {
      running.current = false;
    }
  };

  const select = async (candidate: BookCandidate) => {
    if (running.current) return;
    running.current = true;
    setStatus('resolving');
    try {
      let params = candidateToParams(candidate);
      if (candidate.isbn !== null) {
        const result = await lookupProvider.lookupByIsbn(candidate.isbn);
        if (!active.current) return;
        if (result.status === 'found') {
          const book = await withCover(result.book, resolveCover);
          if (!active.current) return;
          params = bookInfoToParams(book);
        }
      }
      router.replace({ pathname: '/record/new', params });
    } finally {
      running.current = false;
    }
  };

  const continueManually = () => {
    router.replace({ pathname: '/record/new', params: titleOnlyParams(keyword) });
  };

  const onChangeText = (value: string) => {
    setKeyword(value);
    setStatus((current) => (current === 'searching' || current === 'resolving' ? current : 'idle'));
  };

  const emphasizeManual = status === 'empty';

  return (
    <View style={styles.container}>
      <Text style={styles.description}>本・漫画のタイトルを入力してください</Text>
      <TextInput
        accessibilityLabel="タイトルのキーワード"
        returnKeyType="search"
        value={keyword}
        onChangeText={onChangeText}
        onSubmitEditing={() => void search()}
        editable={!busy}
        style={styles.input}
      />
      {status === 'invalid' ? <Text style={styles.error}>{ERROR_KEYWORD_EMPTY}</Text> : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="検索"
        accessibilityState={{ disabled: busy }}
        disabled={busy}
        onPress={() => void search()}
        style={[styles.primary, busy && styles.disabled]}
      >
        {status === 'searching' ? (
          <ActivityIndicator color={colors.onTint} />
        ) : (
          <Text style={styles.primaryText}>検索</Text>
        )}
      </Pressable>
      <Text style={styles.attribution}>{searchProvider.attribution}</Text>
      {status === 'empty' ? <Text style={styles.message}>{MESSAGE_EMPTY}</Text> : null}
      {status === 'error' ? (
        <View style={styles.block}>
          <Text style={styles.error}>{MESSAGE_SEARCH_ERROR}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => void search()}
            style={styles.secondary}
          >
            <Text style={styles.secondaryText}>再試行</Text>
          </Pressable>
        </View>
      ) : null}
      {status === 'resolving' ? <ActivityIndicator accessibilityLabel="読み込み中" /> : null}
      {status === 'results' || status === 'resolving' ? (
        <FlatList
          data={candidates}
          keyExtractor={(item, index) => `${item.isbn ?? item.title}-${index}`}
          style={styles.list}
          contentContainerStyle={{ paddingBottom: bottomInset }}
          renderItem={({ item }) => {
            const sub = subtitle(item);
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: busy }}
                disabled={busy}
                onPress={() => void select(item)}
                style={styles.row}
              >
                <Text style={styles.rowTitle}>{item.title}</Text>
                {sub !== '' ? <Text style={styles.rowSub}>{sub}</Text> : null}
              </Pressable>
            );
          }}
        />
      ) : null}
      <Pressable
        accessibilityRole="button"
        onPress={continueManually}
        style={emphasizeManual ? styles.primary : styles.secondary}
      >
        <Text style={emphasizeManual ? styles.primaryText : styles.secondaryText}>
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
  attribution: { fontSize: 12, color: colors.textMuted },
  list: { flexGrow: 0, flexShrink: 1 },
  row: {
    paddingVertical: spacing.sm,
    gap: 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: formColors.border,
  },
  rowTitle: { fontSize: 16, color: colors.text, fontWeight: '600' },
  rowSub: { fontSize: 13, color: colors.textMuted },
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
