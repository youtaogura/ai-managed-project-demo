import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, space } from '../design/tokens';
import {
  formatDateParts,
  parseDateParts,
  shiftDateParts,
  type DatePart,
  type DateParts,
} from '../lib/date';
import { todayString } from '../lib/recordForm';
import { AppText } from './AppText';
import { BottomSheet } from './BottomSheet';
import { Button } from './Button';

type DatePickerSheetProps = {
  title: string;
  /** 'YYYY-MM-DD'。空なら今日から始める */
  value: string;
  /** 決定した値（'YYYY-MM-DD'、クリアなら空文字） */
  onConfirm: (value: string) => void;
  onClose: () => void;
};

const PARTS: { part: DatePart; name: string; unit: string }[] = [
  { part: 'y', name: '年', unit: '年' },
  { part: 'm', name: '月', unit: '月' },
  { part: 'd', name: '日', unit: '日' },
];

function today(): DateParts {
  return parseDateParts(todayString()) ?? { y: 1970, m: 1, d: 1 };
}

// 開くたびに下書きを作り直すため、親は開いている間だけこの部品を描画する
export function DatePickerSheet({ title, value, onConfirm, onClose }: DatePickerSheetProps) {
  const [draft, setDraft] = useState<DateParts | null>(() => parseDateParts(value) ?? today());

  const shift = (part: DatePart, delta: number) =>
    setDraft((prev) => shiftDateParts(prev ?? today(), part, delta));

  return (
    <BottomSheet visible onClose={onClose} title={title}>
      <View style={styles.rows}>
        {PARTS.map(({ part, name, unit }) => (
          <View key={part} style={styles.row}>
            <Button
              variant="icon"
              accessibilityLabel={`${name}を減らす`}
              onPress={() => shift(part, -1)}
            >
              <AppText variant="sectionTitle">−</AppText>
            </Button>
            <AppText variant="sectionTitle" style={styles.value} accessibilityLabel={`${name} ${draft ? draft[part] : '未設定'}`}>
              {draft ? `${draft[part]}${unit}` : '—'}
            </AppText>
            <Button
              variant="icon"
              accessibilityLabel={`${name}を増やす`}
              onPress={() => shift(part, 1)}
            >
              <AppText variant="sectionTitle">＋</AppText>
            </Button>
          </View>
        ))}
      </View>
      <View style={styles.actions}>
        <View style={styles.action}>
          <Button variant="outline" label="今日" onPress={() => setDraft(today())} />
        </View>
        <View style={styles.action}>
          <Button variant="outline" label="クリア" onPress={() => setDraft(null)} />
        </View>
      </View>
      <Button
        label="決定"
        onPress={() => onConfirm(draft ? formatDateParts(draft) : '')}
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  rows: { gap: space[3], marginBottom: space[4] },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  value: { flex: 1, textAlign: 'center', color: colors.textPrimary },
  actions: { flexDirection: 'row', gap: space[3], marginBottom: space[3] },
  action: { flex: 1 },
});
