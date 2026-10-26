import {
  crossesInteger,
  applyStatusChange,
  createFormValues,
  paramsToInitialValues,
  parseRating,
  ratingFromPosition,
  recordToFormValues,
  starFills,
  stepRating,
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

  it.each(['0.9', '5.1', '3.25', 'abc', '1e1'])('レーティング %s はエラー', (rating) => {
    expect(validateForm({ ...base(), rating }).rating).toBe(
      'レーティングは 1.0〜5.0 の範囲で、小数第1位まで入力してください',
    );
  });

  it.each(['', '1', '1.0', '3.7', '5.0', '５．０'])('レーティング %s は可', (rating) => {
    expect(validateForm({ ...base(), rating })).toEqual({});
  });
});

describe('parseRating', () => {
  it('空文字は null、空白は無視', () => {
    expect(parseRating('')).toBeNull();
    expect(parseRating('  ')).toBeNull();
    expect(parseRating(' 3.5 ')).toBe(3.5);
  });
  it('全角を半角に正規化する', () => {
    expect(parseRating('４．５')).toBe(4.5);
  });
  it('数値でなければ NaN', () => {
    expect(parseRating('x')).toBeNaN();
    expect(parseRating('-1')).toBeNaN();
  });
});

describe('stepRating', () => {
  it('空のとき + で 3.0、− は変化なし', () => {
    expect(stepRating('', 1)).toBe('3.0');
    expect(stepRating('', -1)).toBe('');
    expect(stepRating('abc', 1)).toBe('3.0');
  });
  it('0.1 刻みで誤差が出ない', () => {
    let text = '1.0';
    for (let i = 0; i < 3; i++) text = stepRating(text, 1);
    expect(text).toBe('1.3');
    expect(stepRating('2.3', -1)).toBe('2.2');
    expect(stepRating('0.7', 1)).toBe('1.0');
  });
  it('上下限を超えない', () => {
    expect(stepRating('5.0', 1)).toBe('5.0');
    expect(stepRating('1.0', -1)).toBe('1.0');
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
  it('planned では日付を入れない', () => {
    expect(applyStatusChange(base(), 'planned', '2024-05-01')).toMatchObject({
      startDate: '',
      endDate: '',
    });
  });
});

describe('toNewRecordInput', () => {
  it('trim・空文字→null・rating 変換を行う', () => {
    const input = toNewRecordInput({
      ...base(),
      title: ' 本 ',
      creator: ' ',
      publisher: ' 出版 ',
      isbn: '978',
      rating: '3.5',
      coverUrl: 'http://x/c.png',
    });
    expect(input).toMatchObject({
      title: '本',
      creator: null,
      publisher: '出版',
      isbn: '978',
      rating: 3.5,
      startDate: null,
      coverUrl: 'http://x/c.png',
      photoUri: null,
    });
  });
  it('レーティング未入力・不正は null', () => {
    expect(toNewRecordInput(base()).rating).toBeNull();
    expect(toNewRecordInput({ ...base(), rating: 'x' }).rating).toBeNull();
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
    expect(createFormValues()).toMatchObject({ status: 'planned', rating: '' });
    expect(createFormValues()).not.toHaveProperty('kind');
    expect(createFormValues({ rating: 4 })).toMatchObject({ rating: '4.0' });
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
      starters: [],
      quotes: [],
      memos: [],
      freeTexts: [],
      favorite: false,
      shelfIds: [],
      spineColor: 'spine-1',
    };
    expect(recordToFormValues(record)).toMatchObject({
      title: 'T',
      creator: 'C',
      publisher: '',
      startDate: '2024-01-01',
      rating: '2.5',
      coverUrl: 'u',
      photoUri: 'p',
    });
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

describe('ratingFromPosition', () => {
  it('位置を 0.1 刻みの評価に変換し 1.0〜5.0 にクランプする', () => {
    expect(ratingFromPosition(148, 200)).toBe(3.7);
    expect(ratingFromPosition(0, 200)).toBe(1);
    expect(ratingFromPosition(200, 200)).toBe(5);
    expect(ratingFromPosition(-10, 200)).toBe(1);
    expect(ratingFromPosition(260, 200)).toBe(5);
  });
  it('幅が 0 以下なら null', () => {
    expect(ratingFromPosition(10, 0)).toBeNull();
    expect(ratingFromPosition(10, -5)).toBeNull();
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

describe('crossesInteger', () => {
  it('整数の境目をまたぐときだけ true', () => {
    expect(crossesInteger(2.9, 3.0)).toBe(true);
    expect(crossesInteger(3.0, 2.9)).toBe(true);
    expect(crossesInteger(3.1, 2.9)).toBe(true);
    expect(crossesInteger(3.0, 3.1)).toBe(false);
    expect(crossesInteger(2.8, 2.9)).toBe(false);
    expect(crossesInteger(3.0, 3.0)).toBe(false);
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
