import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { resolveFontFamily } from '../design/fonts';
import { colors, space, typography } from '../design/tokens';
import { AppText } from './AppText';
import { BottomSheet, SLIDE_DURATION, TITLE_LINE_HEIGHT, TITLE_SIZE } from './BottomSheet';
import { Button } from './Button';
import { FocusInput } from './NoteSheet';

const ERROR_SAVE = '保存できませんでした。もう一度お試しください';
const ERROR_DELETE = '削除できませんでした。もう一度お試しください';
/** 入力欄の高さ（`reading` の 6 行ぶん） */
const BODY_MIN_HEIGHT = typography.reading.lineHeight * 6;

export type PostReadMemoSheetProps = {
  visible: boolean;
  /** 本のタイトル（シートの上に小さく出す） */
  bookTitle: string;
  /** 直す読後メモの本文（全文） */
  text: string;
  /** 本文（空白だけではない）を保存する。失敗したら reject */
  onSubmit: (text: string) => Promise<void>;
  /** 削除の確定。失敗したら reject */
  onDelete: () => Promise<void>;
  onClose: () => void;
};

/** 読み返す画面で読後メモを押すと開く「読後メモを直す」シート。 */
export function PostReadMemoSheet({ visible, bookTitle, onClose, ...rest }: PostReadMemoSheetProps) {
  return (
    <BottomSheet visible={visible} onClose={onClose} title={bookTitle} showCloseButton closeInTitleRow>
      {visible ? <Form {...rest} onClose={onClose} /> : null}
    </BottomSheet>
  );
}

type FormProps = Omit<PostReadMemoSheetProps, 'visible' | 'bookTitle'>;

function Form({ text: initial, onSubmit, onDelete, onClose }: FormProps) {
  const [text, setText] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const inputRef = useRef<ComponentRef<typeof TextInput>>(null);
  // 開いたときだけ、カーソルを本文の末尾へ置く（以降はユーザーが動かせる）
  const [initialSelection, setInitialSelection] = useState<{ start: number; end: number } | undefined>({
    start: initial.length,
    end: initial.length,
  });

  // シートが出る動きのあとに入力欄へフォーカスする（autoFocus だと動きの途中で当たる）
  useEffect(() => {
    if (confirming) return;
    const timer = setTimeout(() => inputRef.current?.focus(), SLIDE_DURATION);
    return () => clearTimeout(timer);
  }, [confirming]);

  const submit = async () => {
    setBusy(true);
    try {
      await onSubmit(text);
      onClose();
    } catch {
      setError(ERROR_SAVE);
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await onDelete();
      onClose();
    } catch {
      setError(ERROR_DELETE);
      setConfirming(false);
      setBusy(false);
    }
  };

  if (confirming) {
    return (
      <View style={styles.form}>
        <AppText variant="sectionTitle">この読後メモを削除しますか？</AppText>
        <AppText variant="body" style={{ color: colors.textSecondary }}>
          元に戻せません。
        </AppText>
        <Button variant="outline" label="キャンセル" disabled={busy} onPress={() => setConfirming(false)} />
        <Button variant="outline" tone="danger" label="削除する" disabled={busy} onPress={() => void remove()} />
      </View>
    );
  }

  return (
    <View style={styles.form}>
      <AppText variant="bookTitle" style={styles.heading}>
        読後メモを直す
      </AppText>
      <FocusInput
        ref={inputRef}
        accessibilityLabel="読後メモ"
        selection={initialSelection}
        onSelectionChange={() => setInitialSelection(undefined)}
        multiline
        textAlignVertical="top"
        value={text}
        onChangeText={(next) => {
          setText(next);
          setError(null);
        }}
        style={[styles.body, readingFont]}
      />
      {error ? (
        <AppText variant="body" style={{ color: colors.danger }}>
          {error}
        </AppText>
      ) : null}
      <Button label="保存する" disabled={busy || text.trim() === ''} onPress={() => void submit()} />
      <Button
        variant="text"
        tone="danger"
        label="この読後メモを削除"
        disabled={busy}
        onPress={() => {
          setError(null);
          setConfirming(true);
        }}
      />
    </View>
  );
}

const readingFont = {
  fontFamily: resolveFontFamily(typography.reading.fontFamily, typography.reading.fontWeight),
  fontSize: typography.reading.fontSize,
  lineHeight: typography.reading.lineHeight,
};

const styles = StyleSheet.create({
  form: { gap: space[4] },
  heading: { fontSize: TITLE_SIZE, lineHeight: TITLE_LINE_HEIGHT },
  // TextField の README どおり面は surface-1（メモ・引用を書くシートの surface-2 とは揃えない）
  body: {
    backgroundColor: colors.surface1,
    minHeight: BODY_MIN_HEIGHT,
    padding: space[4],
  },
});
