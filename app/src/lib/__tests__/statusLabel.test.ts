import { RECORD_STATUSES } from '../../types/record';
import { getCreatorLabel, getDateHint, getDateLabels, getStatusLabel } from '../statusLabel';

const READ = ['読みたい', '読んでる', '途中でやめた', '読み終わった'];

describe('getStatusLabel', () => {
  it.each(RECORD_STATUSES.map((status, i) => [status, READ[i]] as const))(
    '%s → %s',
    (status, label) => {
      expect(getStatusLabel(status)).toBe(label);
    },
  );
});

describe('日付・作者欄の見出し', () => {
  it('日付の見出しは「読」', () => {
    expect(getDateLabels()).toEqual({ start: '読み始めた日', end: '読み終えた日' });
  });

  it('作者欄の見出し', () => {
    expect(getCreatorLabel()).toBe('作者・著者');
  });

  it('日付のヒント', () => {
    expect(getDateHint('completed')).toBe('「読み終わった」を選ぶと、終えた日に今日が入ります');
    expect(getDateHint('dropped')).toBe('「読み終わった」を選ぶと、終えた日に今日が入ります');
    expect(getDateHint('in_progress')).toBe('「読んでる」を選ぶと、読み始めた日に今日が入ります');
    expect(getDateHint('planned')).toBeNull();
  });
});
