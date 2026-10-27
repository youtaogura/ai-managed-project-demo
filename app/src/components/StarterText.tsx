import { colors } from '../design/tokens';
import { AppText } from './AppText';

type StarterTextProps = {
  starter: string;
  text: string;
};

/** 書き出しとその続きを、改行せずに一続きの文章として組む。 */
export function StarterText({ starter, text }: StarterTextProps) {
  const body = text.trim();
  return (
    <AppText variant="reading" accessibilityLabel={`${starter}${body}`}>
      <AppText variant="starter" style={{ color: colors.ribbon }}>
        {starter}
      </AppText>
      {body}
    </AppText>
  );
}
