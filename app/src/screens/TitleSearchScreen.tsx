import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, TextInput, View } from 'react-native';

import { AppText } from '../components/AppText';
import { BookSearchRow } from '../components/BookSearchRow';
import { Button } from '../components/Button';
import { ScreenHeaderBar } from '../components/ScreenHeaderBar';
import { resolveFontFamily } from '../design/fonts';
import { colors, radius, size, space, typography } from '../design/tokens';
import { useBookLookup } from '../hooks/useBookLookup';
import { useBookSearch } from '../hooks/useBookSearch';
import { useBottomInset } from '../hooks/useBottomInset';
import { candidateToParams, titleOnlyParams } from '../lib/candidateParams';
import { bookInfoToParams } from '../lib/isbnLookupParams';
import type { BookCandidate } from '../types/bookSearch';

export const ERROR_KEYWORD_EMPTY = 'キーワードを入力してください';
export const MESSAGE_EMPTY = '見つかりませんでした';
export const MESSAGE_SEARCH_ERROR = '検索できませんでした。通信状況を確認してください';

type Status = 'idle' | 'searching' | 'invalid' | 'results' | 'empty' | 'error' | 'resolving';

export function TitleSearchScreen() {
  const bottomInset = useBottomInset();
  const searchProvider = useBookSearch();
  const lookupProvider = useBookLookup();
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [candidates, setCandidates] = useState<BookCandidate[]>([]);
  const [searchedKeyword, setSearchedKeyword] = useState('');
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
      setSearchedKeyword(trimmed);
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
        if (result.status === 'found') params = bookInfoToParams(result.book);
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

  const body = typography.body;
  const showList = status === 'results' || status === 'resolving';

  return (
    <View style={styles.container}>
      <ScreenHeaderBar onClose={() => router.back()}>
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <AppText variant="body" style={{ color: colors.textTertiary }}>
              ⌕
            </AppText>
            <TextInput
              accessibilityLabel="タイトルのキーワード"
              placeholder="タイトルで探す"
              placeholderTextColor={colors.textTertiary}
              returnKeyType="search"
              value={keyword}
              onChangeText={onChangeText}
              onSubmitEditing={() => void search()}
              editable={!busy}
              style={[
                styles.input,
                {
                  fontFamily: resolveFontFamily(body.fontFamily, body.fontWeight),
                  fontSize: body.fontSize,
                },
              ]}
            />
          </View>
          <Button
            label="検索"
            disabled={busy}
            onPress={() => void search()}
            style={styles.searchButton}
          />
        </View>
      </ScreenHeaderBar>
      <View style={styles.body}>
        {status === 'invalid' ? (
          <AppText variant="label" style={[styles.notice, { color: colors.danger }]}>
            {ERROR_KEYWORD_EMPTY}
          </AppText>
        ) : null}
        {status === 'searching' ? <ActivityIndicator style={styles.notice} /> : null}
        {status === 'empty' ? (
          <View style={styles.center}>
            <AppText variant="sectionTitle">{MESSAGE_EMPTY}</AppText>
          </View>
        ) : null}
        {status === 'error' ? (
          <View style={styles.center}>
            <AppText variant="label" style={{ color: colors.danger }}>
              {MESSAGE_SEARCH_ERROR}
            </AppText>
            <Button variant="outline" label="再試行" onPress={() => void search()} />
          </View>
        ) : null}
        {status === 'resolving' ? (
          <ActivityIndicator accessibilityLabel="読み込み中" style={styles.notice} />
        ) : null}
        {showList ? (
          <FlatList
            data={candidates}
            keyExtractor={(item, index) => `${item.isbn ?? item.title}-${index}`}
            contentContainerStyle={styles.list}
            ListHeaderComponent={
              <AppText variant="label" style={styles.count}>
                {`「${searchedKeyword}」の検索結果 ${candidates.length} 件`}
              </AppText>
            }
            renderItem={({ item }) => (
              <BookSearchRow candidate={item} disabled={busy} onPress={() => void select(item)} />
            )}
          />
        ) : null}
      </View>
      <View style={[styles.footer, { paddingBottom: space[3] + bottomInset }]}>
        <Button
          variant={status === 'empty' ? 'primary' : 'outline'}
          label="見つからないので手で入力する"
          onPress={continueManually}
        />
        <AppText variant="micro" style={styles.attribution}>
          {searchProvider.attribution}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    height: size.touchMin,
    paddingHorizontal: space[3],
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface2,
  },
  input: { flex: 1, color: colors.textPrimary, padding: 0 },
  searchButton: { height: size.touchMin, minHeight: size.touchMin },
  body: { flex: 1 },
  notice: { marginTop: space[4], paddingHorizontal: space[4] },
  center: { alignItems: 'center', justifyContent: 'center', gap: space[3], padding: space[6] },
  list: { paddingHorizontal: space[4] },
  count: { color: colors.textSecondary, paddingVertical: space[3] },
  footer: {
    gap: space[2],
    paddingHorizontal: space[4],
    paddingTop: space[3],
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  attribution: { color: colors.textTertiary, textAlign: 'center' },
});
