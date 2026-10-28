import { fireEvent, render, screen } from '@testing-library/react-native';

import { FreeField, OneLinerField, Starter } from '../Starter';

const STARTER = 'いちばん心に残ったのは、';

async function setup(patch: Partial<Parameters<typeof Starter>[0]> = {}) {
  const props = {
    starter: STARTER,
    selected: false,
    text: '',
    onChangeText: jest.fn(),
    onSelect: jest.fn(),
    ...patch,
  };
  await render(<Starter {...props} />);
  return props;
}

describe('Starter', () => {
  it('選んでいないカードはヒントと「書く」、タップで選ぶ', async () => {
    const props = await setup();
    expect(screen.getByText('書く')).toBeTruthy();
    expect(screen.queryByLabelText(`${STARTER}の続き`)).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: STARTER }));
    expect(props.onSelect).toHaveBeenCalled();
  });

  it('書き終えた未選択のカードは続きの冒頭を 1 行で出す', async () => {
    await setup({ text: ' 嵐の夜 ' });
    expect(screen.getByText('嵐の夜').props.numberOfLines).toBe(1);
  });

  it('選んでいるカードは続きの入力欄だけ。引用やページの欄はない', async () => {
    const props = await setup({ selected: true });
    await fireEvent.changeText(screen.getByLabelText(`${STARTER}の続き`), '続き');
    expect(props.onChangeText).toHaveBeenCalledWith('続き');
    expect(screen.queryByLabelText(/ページ/)).toBeNull();
    expect(screen.queryByText('引用として残す')).toBeNull();
  });
});

describe('OneLinerField / FreeField', () => {
  it('入力を渡す', async () => {
    const one = jest.fn();
    const free = jest.fn();
    await render(
      <>
        <OneLinerField label="ひとことで言うと、" value="" onChangeText={one} />
        <FreeField value="" onChangeText={free} />
      </>,
    );
    await fireEvent.changeText(screen.getByLabelText('ひとことで言うと、'), 'a');
    await fireEvent.changeText(screen.getByLabelText('自由に書く'), 'b');
    expect(one).toHaveBeenCalledWith('a');
    expect(free).toHaveBeenCalledWith('b');
  });
});
