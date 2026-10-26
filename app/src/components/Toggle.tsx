import { Pressable, StyleSheet, View } from 'react-native';

import { colors, size, space } from '../design/tokens';
import { AppText } from './AppText';

const TRACK = { regular: { width: 51, height: 31 }, small: { width: 44, height: 27 } } as const;
const KNOB_INSET = 2;
const ROW_MIN_HEIGHT = 52;

type ToggleProps = {
  value: boolean;
  onValueChange: (value: boolean) => void;
  label: string;
  disabled?: boolean;
  small?: boolean;
};

type SwitchProps = Pick<ToggleProps, 'value' | 'small'>;

function Switch({ value, small = false }: SwitchProps) {
  const track = small ? TRACK.small : TRACK.regular;
  const knob = track.height - KNOB_INSET * 2;
  return (
    <View
      style={{
        width: track.width,
        height: track.height,
        borderRadius: track.height / 2,
        backgroundColor: value ? colors.ribbon : colors.lineStrong,
        justifyContent: 'center',
        paddingHorizontal: KNOB_INSET,
        alignItems: value ? 'flex-end' : 'flex-start',
      }}
    >
      <View
        style={{
          width: knob,
          height: knob,
          borderRadius: knob / 2,
          backgroundColor: value ? colors.ribbonInk : colors.surface1,
        }}
      />
    </View>
  );
}

/** スイッチだけ。行全体をタップ領域にしたいときは ToggleRow を使う。 */
export function Toggle({ value, onValueChange, label, disabled = false, small }: ToggleProps) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      onPress={() => onValueChange(!value)}
      style={styles.toggle}
    >
      <Switch value={value} small={small} />
    </Pressable>
  );
}

type ToggleRowProps = Omit<ToggleProps, 'small'> & { description?: string };

/** ラベル（と説明）＋スイッチ。行全体がタップ領域。 */
export function ToggleRow({ value, onValueChange, label, description, disabled = false }: ToggleRowProps) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      onPress={() => onValueChange(!value)}
      style={styles.row}
    >
      <View style={styles.texts}>
        <AppText variant="body" style={styles.label}>
          {label}
        </AppText>
        {description ? (
          <AppText variant="micro" style={{ color: colors.textSecondary }}>
            {description}
          </AppText>
        ) : null}
      </View>
      <Switch value={value} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  toggle: { minHeight: ROW_MIN_HEIGHT, minWidth: size.touchMin, justifyContent: 'center' },
  row: {
    minHeight: ROW_MIN_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space[3],
  },
  texts: { flex: 1, gap: space[1] },
  label: { fontWeight: '700' },
});
