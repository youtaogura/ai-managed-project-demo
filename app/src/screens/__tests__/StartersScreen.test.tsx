import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { STARTER_FIXED } from '../../lib/constants';
import { pickStarters } from '../../lib/starterPicker';
import { createStarterSettingsStore } from '../../lib/starterSettingsStore';
import { withStarterSettings } from '../../testProviders';
import { createMemoryStorage } from '../../testUtils';
import { StartersScreen } from '../StartersScreen';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const FIRST = 'いちばん心に残ったのは、';

async function setup() {
  const store = createStarterSettingsStore(createMemoryStorage().storage);
  await render(withStarterSettings(store, <StartersScreen />));
  expect(await screen.findByText('読み終えたら書き出しを出す')).toBeTruthy();
  return store;
}

async function addCustom(text: string) {
  await fireEvent.press(screen.getByRole('button', { name: '＋ 自分の書き出しを追加' }));
  await fireEvent.changeText(screen.getByLabelText('書き出し'), text);
  await fireEvent.press(screen.getByRole('button', { name: '追加する' }));
}

describe('StartersScreen', () => {
  it('固定と既定の 7 つが順に出て、固定は disabled で編集導線もない', async () => {
    const store = await setup();
    expect(screen.getByText('固定')).toBeTruthy();
    expect(screen.getByText(STARTER_FIXED)).toBeTruthy();
    const fixed = screen.getByRole('switch', { name: STARTER_FIXED });
    expect(fixed.props.accessibilityState).toMatchObject({ checked: true, disabled: true });
    await fireEvent.press(fixed);
    expect(screen.queryByText('自分で追加')).toBeNull();
    expect(screen.queryByRole('button', { name: `${STARTER_FIXED}を編集` })).toBeNull();
    expect(screen.queryByRole('button', { name: `${FIRST}を編集` })).toBeNull();
    // 機能・数・項目 7 つ・固定 = switch は 9 つ
    expect(screen.getAllByRole('switch')).toHaveLength(9);
    expect((await store.load()).items.some((i) => i.text === STARTER_FIXED)).toBe(false);
  });

  it('機能のトグルで enabled が保存され、pickStarters が空になる', async () => {
    const store = await setup();
    await fireEvent.press(screen.getByRole('switch', { name: '読み終えたら書き出しを出す' }));
    await waitFor(async () => expect((await store.load()).enabled).toBe(false));
    expect(pickStarters(await store.load())).toEqual([]);
    expect(
      screen.getByRole('switch', { name: '読み終えたら書き出しを出す' }).props.accessibilityState,
    ).toMatchObject({ checked: false });
  });

  it('一度に出す数を選ぶと保存され、pickStarters の件数に従う', async () => {
    const store = await setup();
    expect(screen.getByRole('radio', { name: '3' }).props.accessibilityState).toMatchObject({ selected: true });
    await fireEvent.press(screen.getByRole('radio', { name: '5' }));
    await waitFor(async () => expect((await store.load()).count).toBe(5));
    expect(screen.getByRole('radio', { name: '5' }).props.accessibilityState).toMatchObject({ selected: true });
    expect(pickStarters(await store.load())).toHaveLength(5);
  });

  it('項目のトグルで保存され、オフにした項目は pickStarters に出ない', async () => {
    const store = await setup();
    await fireEvent.press(screen.getByRole('switch', { name: FIRST }));
    await waitFor(async () => expect((await store.load()).items[0]?.enabled).toBe(false));
    const picked = pickStarters({ ...(await store.load()), count: 5 }, () => 0);
    expect(picked.some((p) => p.text === FIRST)).toBe(false);
  });

  it('自分の書き出しを追加すると末尾に入り、「自分で追加」の印がつく', async () => {
    const store = await setup();
    await addCustom('  もう一度読むなら、 ');
    expect(screen.getByText('自分で追加')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'もう一度読むなら、を編集' })).toBeTruthy();
    await waitFor(async () => {
      const last = (await store.load()).items.at(-1);
      expect(last).toMatchObject({ text: 'もう一度読むなら、', custom: true, enabled: true });
    });
    expect(screen.queryByRole('button', { name: '追加する' })).toBeNull();
  });

  it('空は追加できずエラーを出して閉じない。重複も同様', async () => {
    const store = await setup();
    await addCustom('   ');
    expect(screen.getByText('書き出しを入力してください')).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('書き出し'), FIRST);
    await fireEvent.press(screen.getByRole('button', { name: '追加する' }));
    expect(screen.getByText('同じ書き出しがあります')).toBeTruthy();
    expect((await store.load()).items).toHaveLength(7);
  });

  it('名前の変更で文が変わり、id と enabled は保たれる。重複・空は弾く', async () => {
    const store = await setup();
    await addCustom('A、');
    await fireEvent.press(screen.getByRole('switch', { name: 'A、' }));
    await fireEvent.press(screen.getByRole('button', { name: 'A、を編集' }));
    await fireEvent.changeText(screen.getByLabelText('書き出し'), '');
    await fireEvent.press(screen.getByRole('button', { name: '保存する' }));
    expect(screen.getByText('書き出しを入力してください')).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('書き出し'), 'B、');
    await fireEvent.press(screen.getByRole('button', { name: '保存する' }));
    await waitFor(async () => {
      const last = (await store.load()).items.at(-1);
      expect(last).toMatchObject({ text: 'B、', enabled: false, custom: true });
    });
    expect(screen.queryByText('保存する')).toBeNull();
  });

  it('削除は確認で「削除する」を押したときだけ消える', async () => {
    const store = await setup();
    await addCustom('A、');
    await fireEvent.press(screen.getByRole('button', { name: 'A、を編集' }));
    await fireEvent.press(screen.getByRole('button', { name: '削除する' }));
    expect(screen.getByText('この書き出しを削除しますか？')).toBeTruthy();
    expect(screen.getByText('過去に書いた記録の文章は変わりません')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'キャンセル' }));
    expect(screen.getByRole('button', { name: 'A、を編集' })).toBeTruthy();
    expect((await store.load()).items).toHaveLength(8);

    await fireEvent.press(screen.getByRole('button', { name: 'A、を編集' }));
    await fireEvent.press(screen.getByRole('button', { name: '削除する' }));
    await fireEvent.press(screen.getByRole('button', { name: '削除する' }));
    await waitFor(async () => expect((await store.load()).items).toHaveLength(7));
    expect(screen.queryByRole('button', { name: 'A、を編集' })).toBeNull();
  });
});
