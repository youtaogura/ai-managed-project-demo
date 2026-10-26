import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, space } from '../design/tokens';
import { AppText } from './AppText';
import { BottomSheet } from './BottomSheet';
import { Button } from './Button';
import { TextField } from './TextField';

type StarterEditSheetProps = {
  visible: boolean;
  /** 編集中の文。追加のときは null */
  initialText: string | null;
  /** 検証エラー。空なら出さない */
  error?: string;
  onSubmit: (text: string) => void;
  onDelete: () => void;
  onClose: () => void;
};

export function StarterEditSheet({
  visible,
  initialText,
  error,
  onSubmit,
  onDelete,
  onClose,
}: StarterEditSheetProps) {
  const editing = initialText !== null;
  return (
    <BottomSheet visible={visible} onClose={onClose} title={editing ? '書き出しを編集' : '書き出しを追加'}>
      {visible ? (
        <Form
          key={initialText ?? ''}
          editing={editing}
          initialText={initialText ?? ''}
          error={error}
          onSubmit={onSubmit}
          onDelete={onDelete}
        />
      ) : null}
    </BottomSheet>
  );
}

type FormProps = {
  editing: boolean;
  initialText: string;
  error?: string;
  onSubmit: (text: string) => void;
  onDelete: () => void;
};

function Form({ editing, initialText, error, onSubmit, onDelete }: FormProps) {
  const [text, setText] = useState(initialText);
  return (
    <View style={styles.form}>
      <TextField
        label="書き出し"
        value={text}
        onChangeText={setText}
        placeholder="例: もう一度読むなら、"
        error={error}
        autoFocus
      />
      <AppText variant="micro" style={{ color: colors.textTertiary }}>
        「、」で終わる形がおすすめです
      </AppText>
      <Button label={editing ? '保存する' : '追加する'} onPress={() => onSubmit(text)} />
      {editing ? <Button variant="outline" tone="danger" label="削除する" onPress={onDelete} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: space[3] },
});
