import { render } from '@testing-library/react-native';
import { renderRouter, screen } from 'expo-router/testing-library';
import type { ReactElement } from 'react';

import { FileServiceContextProvider } from '../hooks/useFileService';
import type { FileService } from '../lib/fileService/FileService';
import { AboutScreen } from '../screens/AboutScreen';
import { DataScreen } from '../screens/DataScreen';
import { ReadingScreen } from '../screens/ReadingScreen';
import { RecordsScreen } from '../screens/RecordsScreen';
import { ReviewScreen } from '../screens/ReviewScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { DeleteAllSheet } from '../components/DeleteAllSheet';
import { DeleteConfirmSheet } from '../components/DeleteConfirmSheet';
import { ExportSheet } from '../components/ExportSheet';
import { RatingStars } from '../components/RatingStars';
import { SortSheet } from '../components/SortSheet';
import { SORT_ORDER_LABELS as LIST_LABELS } from '../lib/sortOrderLabel';
import { SORT_ORDER_LABELS as SHEET_LABELS } from '../lib/sortRecords';
import { SORT_ORDERS } from '../types/sort';
import { createRecordRepository, RECORDS_STORAGE_KEY } from '../lib/recordRepository';
import { createSettingsStore } from '../lib/settingsStore';
import { createSortOrderStore } from '../lib/sortOrderStore';
import { createExportStore } from '../lib/exportStore';
import { createStarterSettingsStore } from '../lib/starterSettingsStore';
import { createShelfRepository } from '../lib/shelfRepository';
import { withRepository, withSettings, withShelfRepository, withStarterSettings } from '../testProviders';
import { createMemoryStorage, makeRecord } from '../testUtils';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const FORBIDDEN = /評価|レーティング|未評価|写真|書影/;

type Node = { type?: string; props?: { accessibilityLabel?: unknown }; children?: unknown };

/** 画面に出る文字（Text の中身）と accessibilityLabel をすべて集める */
function collectWords(node: unknown, out: string[] = []): string[] {
  if (typeof node === 'string') {
    out.push(node);
  } else if (Array.isArray(node)) {
    node.forEach((child) => collectWords(child, out));
  } else if (typeof node === 'object' && node !== null) {
    const n = node as Node;
    if (typeof n.props?.accessibilityLabel === 'string') out.push(n.props.accessibilityLabel);
    collectWords(n.children, out);
  }
  return out;
}

const expectNoForbidden = (label: string) => {
  const words = collectWords(screen.toJSON());
  expect(words.length).toBeGreaterThan(0);
  expect({ label, hits: words.filter((w) => FORBIDDEN.test(w)) }).toEqual({ label, hits: [] });
};

const rated = [
  makeRecord({ id: 'a', title: 'アルファ', status: 'completed', endDate: '2024-02-10', rating: 4.5 }),
  makeRecord({ id: 'b', title: 'ベータ', status: 'completed', endDate: '2024-03-10', rating: null }),
  makeRecord({ id: 'c', title: 'ガンマ', status: 'in_progress', photoUri: 'file:///p.jpg', coverUrl: 'http://c' }),
];

function seeded() {
  const memory = createMemoryStorage({ [RECORDS_STORAGE_KEY]: JSON.stringify(rated) });
  return { storage: memory.storage, repository: createRecordRepository(memory.storage) };
}

const noop = () => undefined;
const fileService: FileService = {
  saveAndShare: async () => 'shared',
  pickTextFile: async () => null,
};

describe('使わなくなった言葉が画面に出ない', () => {
  const screens: [string, () => ReactElement][] = [
    [
      '読んでる・読み終わった（一覧）',
      () => {
        const { storage, repository } = seeded();
        return withRepository(repository, <RecordsScreen sortOrderStore={createSortOrderStore(storage)} />);
      },
    ],
    [
      '記録の詳細',
      () => {
        const { storage, repository } = seeded();
        return withRepository(
          repository,
          <ReadingScreen recordId="c" />,
          createShelfRepository(storage),
        );
      },
    ],
    [
      '振り返り',
      () => withRepository(seeded().repository, <ReviewScreen onAdd={noop} onOpenRecord={noop} />),
    ],
    [
      '設定',
      () => {
        const { storage } = seeded();
        return withShelfRepository(
          createShelfRepository(storage),
          withSettings(createSettingsStore(storage), <SettingsScreen />),
        );
      },
    ],
    ['このアプリについて', () => <AboutScreen />],
    [
      'データ管理',
      () => {
        const { storage, repository } = seeded();
        const starter = createStarterSettingsStore(storage);
        const settings = createSettingsStore(storage);
        return withStarterSettings(
          starter,
          withShelfRepository(
            createShelfRepository(storage),
            withSettings(
              settings,
              withRepository(
                repository,
                <FileServiceContextProvider service={fileService}>
                  <DataScreen
                    exportStore={createExportStore(storage)}
                    settingsStore={settings}
                    starterSettingsStore={starter}
                  />
                </FileServiceContextProvider>,
              ),
            ),
          ),
        );
      },
    ],
    ['書き出しシート', () => <ExportSheet visible count={2} onClose={noop} onSelect={noop} />],
    ['削除の確認', () => <DeleteConfirmSheet visible title="吾輩" onConfirm={noop} onCancel={noop} />],
    ['全削除の確認', () => <DeleteAllSheet visible count={3} onExport={noop} onCancel={noop} onConfirm={noop} />],
    ['星（値あり）', () => <RatingStars rating={4.5} showValue />],
    ['星（値なし）', () => <RatingStars rating={null} showValue />],
  ];

  it.each(screens)('%s', async (label, build) => {
    await renderRouter({ index: build });
    expectNoForbidden(label);
  });

  it.each(SORT_ORDERS)('並び順シート（%s を選択中）', async (order) => {
    await render(<SortSheet visible value={order} onClose={noop} onChange={noop} />);
    expectNoForbidden(`SortSheet ${order}`);
    expect(FORBIDDEN.test(LIST_LABELS[order])).toBe(false);
    expect(FORBIDDEN.test(SHEET_LABELS[order])).toBe(false);
  });
});
