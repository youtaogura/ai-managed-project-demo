import { render, screen } from '@testing-library/react-native';

import { StarterText } from '../StarterText';

describe('StarterText', () => {
  it('書き出しと続きを 1 つの Text に一続きで入れる', async () => {
    await render(<StarterText starter="読み終えて、" text=" いちばん残ったのは…" />);
    const text = screen.getByLabelText('読み終えて、いちばん残ったのは…');
    expect(text.children.length).toBe(2);
    expect(screen.getByText('読み終えて、')).toBeTruthy();
  });
});
