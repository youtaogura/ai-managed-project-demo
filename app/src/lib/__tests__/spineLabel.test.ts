import { makeRecord } from '../../testUtils';
import { getSpineAccessibilityLabel } from '../spineLabel';

describe('getSpineAccessibilityLabel', () => {
  it('タイトル、作者、ステータス', () => {
    expect(
      getSpineAccessibilityLabel(makeRecord({ title: '本', creator: '著者', status: 'in_progress' })),
    ).toBe('本、著者、読んでる');
  });

  it('作者がなければ省く', () => {
    expect(getSpineAccessibilityLabel(makeRecord({ title: '本', status: 'planned' }))).toBe(
      '本、読みたい',
    );
  });

  it('お気に入りなら末尾に足す', () => {
    expect(
      getSpineAccessibilityLabel(
        makeRecord({ title: '本', creator: '著者', status: 'completed', favorite: true }),
      ),
    ).toBe('本、著者、読んだ、お気に入り');
  });

  it('途中でやめた', () => {
    expect(getSpineAccessibilityLabel(makeRecord({ title: '本', status: 'dropped' }))).toBe(
      '本、途中でやめた',
    );
  });
});
