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
    asQuote: false,
    onChangeAsQuote: jest.fn(),
    page: '',
    onChangePage: jest.fn(),
    ...patch,
  };
  await render(<Starter {...props} />);
  return props;
}

describe('Starter', () => {
  it('選んでいないカードは書き出しと「書く」、タップで選ぶ', async () => {
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

  it('選んでいるカードは入力欄と「引用として残す」。ページはオンのときだけ', async () => {
    const props = await setup({ selected: true });
    await fireEvent.changeText(screen.getByLabelText(`${STARTER}の続き`), '続き');
    expect(props.onChangeText).toHaveBeenCalledWith('続き');
    expect(screen.queryByLabelText(/ページ/)).toBeNull();
    expect(screen.getAllByRole('switch', { name: '引用として残す' })).toHaveLength(1);
    await fireEvent.press(screen.getByText('引用として残す'));
    expect(props.onChangeAsQuote).toHaveBeenCalledWith(true);
    await fireEvent.press(screen.getByRole('switch', { name: '引用として残す' }));
    expect(props.onChangeAsQuote).toHaveBeenCalledWith(true);
  });

  it('引用がオンならページ欄（数字キーボード・10 文字）', async () => {
    const props = await setup({ selected: true, asQuote: true });
    const page = screen.getByLabelText('ページ（任意）');
    expect(page.props.keyboardType).toBe('number-pad');
    expect(page.props.maxLength).toBe(10);
    await fireEvent.changeText(page, '12');
    expect(props.onChangePage).toHaveBeenCalledWith('12');
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
