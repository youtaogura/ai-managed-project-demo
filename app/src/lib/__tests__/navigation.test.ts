import { goBackOrHome } from '../navigation';

function fakeRouter(canGoBack: boolean) {
  return { canGoBack: jest.fn(() => canGoBack), back: jest.fn(), dismissTo: jest.fn() };
}

describe('goBackOrHome', () => {
  it('履歴があれば back する', () => {
    const router = fakeRouter(true);
    goBackOrHome(router);
    expect(router.back).toHaveBeenCalled();
    expect(router.dismissTo).not.toHaveBeenCalled();
  });

  it('履歴がなければ本棚へ dismissTo する', () => {
    const router = fakeRouter(false);
    goBackOrHome(router);
    expect(router.dismissTo).toHaveBeenCalledWith('/');
    expect(router.back).not.toHaveBeenCalled();
  });
});
