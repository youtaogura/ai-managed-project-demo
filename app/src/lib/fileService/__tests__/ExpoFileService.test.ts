import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';

import { expoFileService } from '../ExpoFileService';

const mockWrite = jest.fn();
const mockDelete = jest.fn();
const mockCreate = jest.fn();
let mockExists = false;

jest.mock('expo-file-system', () => ({
  Paths: { cache: 'cache' },
  File: class {
    uri: string;
    constructor(...parts: unknown[]) {
      this.uri = parts.join('/');
    }
    get exists() {
      return mockExists;
    }
    create = mockCreate;
    write = mockWrite;
    delete = mockDelete;
    text = async () => `text of ${this.uri}`;
  },
}));
jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn(), shareAsync: jest.fn() }));
jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn() }));

const params = { filename: 'a.json', mimeType: 'application/json', content: '{}' };

describe('ExpoFileService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockExists = false;
  });

  it('キャッシュに書いて共有メニューを開く', async () => {
    jest.mocked(Sharing.isAvailableAsync).mockResolvedValue(true);
    expect(await expoFileService.saveAndShare(params)).toBe('shared');
    expect(mockWrite).toHaveBeenCalledWith('{}');
    expect(Sharing.shareAsync).toHaveBeenCalledWith('cache/a.json', expect.objectContaining({ mimeType: 'application/json' }));
  });

  it('同名のファイルがあれば消してから書く', async () => {
    jest.mocked(Sharing.isAvailableAsync).mockResolvedValue(true);
    mockExists = true;
    await expoFileService.saveAndShare(params);
    expect(mockDelete).toHaveBeenCalled();
  });

  it('共有が使えない端末は例外を投げる', async () => {
    jest.mocked(Sharing.isAvailableAsync).mockResolvedValue(false);
    await expect(expoFileService.saveAndShare(params)).rejects.toThrow();
    expect(Sharing.shareAsync).not.toHaveBeenCalled();
  });

  it('選んだファイルを UTF-8 として読む', async () => {
    jest.mocked(DocumentPicker.getDocumentAsync).mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///x.json', name: 'x.json' }],
    } as DocumentPicker.DocumentPickerResult);
    expect(await expoFileService.pickTextFile()).toEqual({
      name: 'x.json',
      text: 'text of file:///x.json',
    });
  });

  it('キャンセルは null', async () => {
    jest.mocked(DocumentPicker.getDocumentAsync).mockResolvedValue({
      canceled: true,
      assets: null,
    } as DocumentPicker.DocumentPickerResult);
    expect(await expoFileService.pickTextFile()).toBeNull();
  });
});
