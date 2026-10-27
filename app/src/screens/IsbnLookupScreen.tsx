import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { LookupSkeletonCard } from '../components/LookupSkeletonCard';
import { NotFoundCard } from '../components/NotFoundCard';
import { ScreenHeaderBar } from '../components/ScreenHeaderBar';
import { TextField } from '../components/TextField';
import { colors, size, space } from '../design/tokens';
import { useBookLookup } from '../hooks/useBookLookup';
import { useBottomInset } from '../hooks/useBottomInset';
import { toIsbn13 } from '../lib/isbn';
import { bookInfoToParams, isbnOnlyParams } from '../lib/isbnLookupParams';

export const ERROR_ISBN_INVALID = 'ISBN を正しく入力してください（10 桁または 13 桁）';
export const MESSAGE_NOT_FOUND = '見つかりませんでした';
export const MESSAGE_LOOKUP_ERROR = '書誌情報を取得できませんでした。通信状況を確認してください';

type Status = 'idle' | 'loading' | 'invalid' | 'not_found' | 'error';

type IsbnLookupScreenProps = {
  initialIsbn?: string;
  initialNotFound?: boolean;
};

export function IsbnLookupScreen({ initialIsbn = '', initialNotFound = false }: IsbnLookupScreenProps) {
  const provider = useBookLookup();
  const bottomInset = useBottomInset();
  const [text, setText] = useState(initialIsbn);
  const [status, setStatus] = useState<Status>(initialNotFound ? 'not_found' : 'idle');
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
      <ScreenHeaderBar title="ISBN を入力する" onClose={() => router.back()} />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, { paddingBottom: space[6] + bottomInset }]}
      >
        <View style={styles.field}>
          <TextField
            variant="isbn"
            label="ISBN（10 桁または 13 桁）"
            value={text}
            onChangeText={onChangeText}
            editable={!loading}
            error={status === 'invalid' ? ERROR_ISBN_INVALID : undefined}
          />
          <AppText variant="label" style={styles.hint}>
            ハイフンはあってもなくても大丈夫です。裏表紙やカバー袖に書かれています。
          </AppText>
        </View>
        {status === 'not_found' ? (
          <NotFoundCard
            onManual={continueManually}
            onRetry={() => void search()}
            onTitleSearch={() => router.replace('/record/search')}
          />
        ) : (
          <>
            <Button label="探す" disabled={loading} onPress={() => void search()} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="バーコードで読み取る"
              onPress={() => router.replace('/record/scan')}
              style={styles.link}
            >
              <AppText variant="button" style={{ color: colors.textSecondary }}>
                バーコードで読み取る
              </AppText>
            </Pressable>
          </>
        )}
        {loading ? <LookupSkeletonCard state="loading" /> : null}
        {status === 'error' ? (
          <LookupSkeletonCard
            state="error"
            message={MESSAGE_LOOKUP_ERROR}
            onRetry={() => void search()}
          />
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space[4], gap: space[4] },
  field: { gap: space[2] },
  hint: { color: colors.textTertiary },
  link: { minHeight: size.touchMin, alignItems: 'center', justifyContent: 'center' },
});
