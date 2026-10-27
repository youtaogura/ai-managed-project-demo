import { shelfLayoutAnimation } from '../bookMotion';

describe('bookMotion', () => {
  it('棚の動き: 通常は位置の移動（update）あり、動きを減らすときは不透明度だけ', () => {
    expect(shelfLayoutAnimation(false).update).toBeDefined();
    const reduced = shelfLayoutAnimation(true);
    expect(reduced.update).toBeUndefined();
    expect(reduced.create).toMatchObject({ property: 'opacity' });
    expect(reduced.delete).toMatchObject({ property: 'opacity' });
  });
});
