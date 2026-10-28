import {
  applyStatusChange,
  createFormValues,
  paramsToInitialValues,
  recordToFormValues,
  starFills,
  todayString,
  toNewRecordInput,
  validateForm,
} from '../recordForm';
import type { MediaRecord } from '../../types/record';

const base = () => ({ ...createFormValues(), title: 'タイトル' });

describe('validateForm', () => {
  it('正常な値ではエラーがない', () => {
    expect(validateForm(base())).toEqual({});
  });

  it('空白のみのタイトルはエラー', () => {
    expect(validateForm({ ...base(), title: '  　' }).title).toBe('タイトルを入力してください');
  });

  it('実在しない日付・形式違いはエラー', () => {
    const errors = validateForm({
      ...base(),
      startDate: '2024-02-30',
      endDate: '2024/03/01',
    });
    expect(errors.startDate).toBe('日付は YYYY-MM-DD の形式で入力してください');
    expect(errors.endDate).toBe('日付は YYYY-MM-DD の形式で入力してください');
  });

  it('終了日が開始日より前ならエラー、同日は可', () => {
    expect(
      validateForm({
        ...base(),
        startDate: '2024-03-02',
        endDate: '2024-03-01',
      }).endDate,
    ).toBe('終了日は開始日以降にしてください');
    expect(
      validateForm({
        ...base(),
        startDate: '2024-03-01',
        endDate: '2024-03-01',
      }),
    ).toEqual({});
  });

});


describe('todayString', () => {
  it('ローカル日付を YYYY-MM-DD で返す', () => {
    expect(todayString(new Date(2024, 0, 5, 23, 59))).toBe('2024-01-05');
  });
  it('引数なしで現在日付を返す', () => {
    expect(todayString()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('applyStatusChange', () => {
  it('in_progress で開始日が空なら今日を入れる', () => {
    expect(applyStatusChange(base(), 'in_progress', '2024-05-01')).toMatchObject({
      status: 'in_progress',
      startDate: '2024-05-01',
      endDate: '',
    });
  });
  it.each(['completed', 'dropped'] as const)('%s で終了日が空なら今日を入れる', (status) => {
    expect(applyStatusChange(base(), status, '2024-05-01').endDate).toBe('2024-05-01');
  });
  it('既存の日付は上書きしない', () => {
    const v = { ...base(), startDate: '2024-01-01', endDate: '2024-02-01' };
    expect(applyStatusChange(v, 'in_progress', '2024-05-01').startDate).toBe('2024-01-01');
    expect(applyStatusChange(v, 'completed', '2024-05-01').endDate).toBe('2024-02-01');
  });
  it('planned で両方の日付を空にする', () => {
    const v = { ...base(), startDate: '2024-01-01', endDate: '2024-02-01' };
    expect(applyStatusChange(v, 'planned', '2024-05-01')).toMatchObject({ startDate: '', endDate: '' });
  });
  it('in_progress で終了日を空にし、開始日は残す', () => {
    const v = { ...base(), startDate: '2024-01-01', endDate: '2024-02-01' };
    expect(applyStatusChange(v, 'in_progress', '2024-05-01')).toMatchObject({
      startDate: '2024-01-01',
      endDate: '',
    });
  });
  it('completed / dropped で開始日は変えない', () => {
    const v = { ...base(), startDate: '2024-01-01' };
    expect(applyStatusChange(v, 'completed', '2024-05-01').startDate).toBe('2024-01-01');
    expect(applyStatusChange(base(), 'dropped', '2024-05-01').startDate).toBe('');
  });
  it('planned では日付を入れない', () => {
    expect(applyStatusChange(base(), 'planned', '2024-05-01')).toMatchObject({
      startDate: '',
      endDate: '',
    });
  });
});

describe('toNewRecordInput', () => {
  it('trim・空文字→null を行う', () => {
    const input = toNewRecordInput({
      ...base(),
      title: ' 本 ',
      creator: ' ',
      publisher: ' 出版 ',
      isbn: '978',
      coverUrl: 'http://x/c.png',
    });
    expect(input).toMatchObject({
      title: '本',
      creator: null,
      publisher: '出版',
      isbn: '978',
      rating: null,
      startDate: null,
      coverUrl: 'http://x/c.png',
      photoUri: null,
    });
  });
  it('フォームが扱わない値（評価・写真・書影 URL・ひとこと・お気に入りなど）は carried から引き継ぐ', () => {
    const input = toNewRecordInput(
      { ...base(), coverUrl: null },
      { rating: 4.5, photoUri: 'file:///p.jpg', coverUrl: 'http://x/c.png', oneLiner: '良い', favorite: true },
    );
    expect(input).toMatchObject({
      rating: 4.5,
      photoUri: 'file:///p.jpg',
      coverUrl: 'http://x/c.png',
      oneLiner: '良い',
      favorite: true,
    });
  });
  it('spineColor と shelfIds はフォームの値を使う', () => {
    const input = toNewRecordInput(
      { ...base(), spineColor: 'spine-4', shelfIds: ['a'] },
      { spineColor: 'spine-1', shelfIds: ['z'] },
    );
    expect(input.spineColor).toBe('spine-4');
    expect(input.shelfIds).toEqual(['a']);
  });
  it('isbn / publisher は空なら null、あれば trim して入れる', () => {
    const v = { ...base(), publisher: ' 出版 ', isbn: '978' };
    const input = toNewRecordInput(v);
    expect(input.isbn).toBe('978');
    expect(input.publisher).toBe('出版');
    expect(input).not.toHaveProperty('kind');
  });
});

describe('createFormValues / recordToFormValues', () => {
  it('既定値と初期値の反映', () => {
    expect(createFormValues()).toMatchObject({ status: 'planned', spineColor: 'spine-1', shelfIds: [] });
    expect(createFormValues()).not.toHaveProperty('kind');
    expect(createFormValues()).not.toHaveProperty('rating');
  });
  it('背表紙の色は initial → defaultSpineColor の順', () => {
    expect(createFormValues({}, 'spine-5').spineColor).toBe('spine-5');
    expect(createFormValues({ spineColor: 'spine-2' }, 'spine-5').spineColor).toBe('spine-2');
    expect(createFormValues({ shelfIds: ['a'] }).shelfIds).toEqual(['a']);
  });
  it('記録からフォーム値に変換する', () => {
    const record: MediaRecord = {
      id: '1',
      title: 'T',
      creator: 'C',
      publisher: null,
      isbn: null,
      coverUrl: 'u',
      photoUri: 'p',
      startDate: '2024-01-01',
      endDate: null,
      status: 'in_progress',
      rating: 2.5,
      createdAt: 'a',
      updatedAt: 'b',
      source: { provider: 'manual' },
      oneLiner: null,
      postReadMemos: [],
      quotes: [],
      memos: [],
      favorite: false,
      shelfIds: [],
      spineColor: 'spine-1',
    };
    expect(recordToFormValues(record)).toMatchObject({
      title: 'T',
      creator: 'C',
      publisher: '',
      startDate: '2024-01-01',
      coverUrl: 'u',
      spineColor: 'spine-1',
    });
  });
});

describe('shelfIds', () => {
  it('初期値はないと空で、記録の shelfIds を引き継ぐ', () => {
    expect(createFormValues().shelfIds).toEqual([]);
    expect(createFormValues({ shelfIds: ['a'] }).shelfIds).toEqual(['a']);
  });
  it('NewRecordInput の shelfIds はフォームの値を使う', () => {
    const values = { ...createFormValues({ title: 'T' }), shelfIds: ['b'] };
    expect(toNewRecordInput(values, { shelfIds: ['a'] }).shelfIds).toEqual(['b']);
  });
});

describe('paramsToInitialValues', () => {
  it('文字列の値だけを取り出し、古い kind は無視する', () => {
    expect(
      paramsToInitialValues({
        kind: 'movie',
        title: 'T',
        creator: 'C',
        publisher: 'P',
        isbn: 'I',
        coverUrl: 'U',
      }),
    ).toEqual({
      title: 'T',
      creator: 'C',
      publisher: 'P',
      isbn: 'I',
      coverUrl: 'U',
      source: { provider: 'manual' },
    });
    expect(paramsToInitialValues({ title: ['a', 'b'], isbn: '' })).toEqual({
      source: { provider: 'manual' },
    });
  });
});

describe('starFills', () => {
  it('評価を各星の塗り割合に変換する', () => {
    expect(starFills(3.7)).toEqual([1, 1, 1, 0.7, 0]);
    expect(starFills(null)).toEqual([0, 0, 0, 0, 0]);
    expect(starFills(5)).toEqual([1, 1, 1, 1, 1]);
    expect(starFills(1)).toEqual([1, 0, 0, 0, 0]);
  });
});

describe('source', () => {
  const base = createFormValues({ title: 'T' });

  it('初期値の source を保持し、なければ manual', () => {
    expect(base.source).toEqual({ provider: 'manual' });
    const v = createFormValues({ source: { provider: 'ndl', ndlId: '1' } });
    expect(toNewRecordInput(v).source).toEqual({ provider: 'ndl', ndlId: '1' });
  });

  it('openbd は ISBN が同じなら保持、書き換えると manual に降格', () => {
    const v = createFormValues({
      title: 'T',
      isbn: '9784065199817',
      source: { provider: 'openbd', isbn: '9784065199817' },
    });
    expect(toNewRecordInput(v).source).toEqual({
      provider: 'openbd',
      isbn: '9784065199817',
    });
    expect(toNewRecordInput({ ...v, isbn: '9784101010013' }).source).toEqual({
      provider: 'manual',
    });
    expect(toNewRecordInput({ ...v, isbn: '' }).source).toEqual({
      provider: 'manual',
    });
  });

  it('ndl は ISBN を書き換えても保持される', () => {
    const v = createFormValues({
      title: 'T',
      isbn: '1',
      source: { provider: 'ndl', ndlId: '9' },
    });
    expect(toNewRecordInput({ ...v, isbn: '2' }).source).toEqual({
      provider: 'ndl',
      ndlId: '9',
    });
  });

  it('paramsToInitialValues は古い tmdb の source を manual にする', () => {
    expect(
      paramsToInitialValues({
        sourceProvider: 'tmdb',
        sourceType: 'tv',
        sourceId: '7',
      }).source,
    ).toEqual({ provider: 'manual' });
  });

  it('paramsToInitialValues はクエリから source を作る', () => {
    expect(paramsToInitialValues({ sourceProvider: 'ndl', sourceId: '5' }).source).toEqual({
      provider: 'ndl',
      ndlId: '5',
    });
    expect(paramsToInitialValues({ sourceProvider: 'ndl' }).source).toEqual({
      provider: 'manual',
    });
  });
});
