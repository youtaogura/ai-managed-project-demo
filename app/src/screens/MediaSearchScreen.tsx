import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, TextInput, View } from 'react-native';

import { AppText } from '../components/AppText';
import { ChipGroup, type ChipOption } from '../components/Chip';
import { MediaSearchRow } from '../components/MediaSearchRow';
import { Button } from '../components/Button';
import { ScreenHeaderBar } from '../components/ScreenHeaderBar';
import { resolveFontFamily } from '../design/fonts';
import { colors, radius, size, space, typography } from '../design/tokens';
import { useMediaSearch } from '../hooks/useMediaSearch';
import { useBottomInset } from '../hooks/useBottomInset';
import { mediaCandidateToParams, mediaTitleOnlyParams } from '../lib/mediaCandidateParams';
import type { MediaCandidate, MediaSearchKind } from '../types/mediaSearch';
import { ERROR_KEYWORD_EMPTY, MESSAGE_EMPTY, MESSAGE_SEARCH_ERROR } from './TitleSearchScreen';

type Status = 'idle' | 'searching' | 'invalid' | 'results' | 'empty' | 'error';

const KIND_OPTIONS: readonly ChipOption<MediaSearchKind>[] = [
  { value: 'movie', label: '映画' },
  { value: 'drama', label: 'ドラマ' },
  { value: 'anime', label: 'アニメ' },
];

export function MediaSearchScreen() {
  const bottomInset = useBottomInset();
  const searchProvider = useMediaSearch();
  const [kind, setKind] = useState<MediaSearchKind>('movie');
  // 結果を取得したときの種別（行の表示と記録の kind に使う）
  const [searchedKind, setSearchedKind] = useState<MediaSearchKind>('movie');
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [candidates, setCandidates] = useState<MediaCandidate[]>([]);
  const [searchedKeyword, setSearchedKeyword] = useState('');
  const running = useRef(false);
  const active = useRef(true);

  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);

  const busy = status === 'searching';

  const search = async () => {
    if (running.current) return;
    const trimmed = keyword.trim();
    if (trimmed === '') {
      setStatus('invalid');
      return;
    }
    if (searchProvider === null) return;
    running.current = true;
    setStatus('searching');
    try {
      const result = await searchProvider.search(trimmed, kind);
      if (!active.current) return;
      if (result.status === 'error') {
        setStatus('error');
        return;
      }
      setSearchedKeyword(trimmed);
      setSearchedKind(kind);
      setCandidates(result.candidates);
      setStatus(result.candidates.length === 0 ? 'empty' : 'results');
    } finally {
      running.current = false;
    }
  };

  const select = (candidate: MediaCandidate) => {
    if (running.current) return;
    running.current = true;
    router.replace({
      pathname: '/record/new',
      params: mediaCandidateToParams(candidate, searchedKind),
    });
  };

  const continueManually = () => {
    router.replace({
      pathname: '/record/new',
      params: mediaTitleOnlyParams(keyword, kind),
    });
  };

  const onChangeText = (value: string) => {
    setKeyword(value);
    setStatus((current) => (current === 'searching' ? current : 'idle'));
  };

  const onChangeKind = (value: MediaSearchKind) => {
    if (busy) return;
    setKind(value);
    setStatus('idle');
  };

  const body = typography.body;
  const showList = status === 'results';

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
        <View style={styles.kinds}>
          <ChipGroup
            label="種別"
            options={KIND_OPTIONS}
            value={kind}
            onChange={onChangeKind}
            compact
          />
        </View>
      </ScreenHeaderBar>
      <View style={styles.body}>
        {status === 'invalid' ? (
          <AppText variant="label" style={[styles.notice, { color: colors.danger }]}>
            {ERROR_KEYWORD_EMPTY}
          </AppText>
        ) : null}
        {status === 'searching' ? (
          <ActivityIndicator accessibilityLabel="検索中" style={styles.notice} />
        ) : null}
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
        {showList ? (
          <FlatList
            data={candidates}
            keyExtractor={(item, index) => `${item.mediaType}-${item.tmdbId}-${index}`}
            contentContainerStyle={styles.list}
            ListHeaderComponent={
              <AppText variant="label" style={styles.count}>
                {`「${searchedKeyword}」の検索結果 ${candidates.length} 件`}
              </AppText>
            }
            renderItem={({ item }) => (
              <MediaSearchRow
                candidate={item}
                kind={searchedKind}
                disabled={busy}
                onPress={() => select(item)}
              />
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
          {searchProvider?.attribution}
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
  kinds: { marginTop: space[2] },
  searchButton: { height: size.touchMin, minHeight: size.touchMin },
  body: { flex: 1 },
  notice: { marginTop: space[4], paddingHorizontal: space[4] },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[3],
    padding: space[6],
  },
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
