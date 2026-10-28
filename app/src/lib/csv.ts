import type { MediaRecord } from '../types/record';
import { listPostReadMemos } from './reread';
import { getStatusLabel } from './statusLabel';

const BOM = '﻿';
const EOL = '\r\n';
const HEADERS = [
  'タイトル',
  '作者',
  '出版社',
  'ISBN',
  'ステータス',
  '始めた日',
  '終えた日',
  'どうだった？',
  'ひとこと',
  '読後メモ',
  '登録日時',
  '更新日時',
];

// 表計算ソフトが数式として実行しないよう、先頭が = + - @ の文字列には ' を付ける
function neutralize(value: string): string {
  return /^[=+\-@]/.test(value) ? `'${value}` : value;
}

function escapeCell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function textCell(value: string | null): string {
  return value === null ? '' : escapeCell(neutralize(value));
}

/** 読後メモを書いた順に、空行で区切って 1 つのセルにまとめる。なければ null。 */
function postReadMemosCell(record: MediaRecord): string | null {
  const memos = listPostReadMemos(record);
  return memos.length === 0 ? null : memos.map((memo) => memo.text.trim()).join('\n\n');
}

function row(record: MediaRecord): string {
  return [
    textCell(record.title),
    textCell(record.creator),
    textCell(record.publisher),
    textCell(record.isbn),
    textCell(getStatusLabel(record.status)),
    textCell(record.startDate),
    textCell(record.endDate),
    record.rating === null ? '' : String(record.rating),
    textCell(record.oneLiner),
    textCell(postReadMemosCell(record)),
    textCell(record.createdAt),
    textCell(record.updatedAt),
  ].join(',');
}

export function recordsToCsv(records: readonly MediaRecord[]): string {
  const lines = [HEADERS.join(','), ...records.map(row)];
  return BOM + lines.join(EOL) + EOL;
}
