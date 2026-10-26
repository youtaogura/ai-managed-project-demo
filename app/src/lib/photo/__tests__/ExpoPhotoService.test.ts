import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

import { expoPhotoService } from '../ExpoPhotoService';

const mockCreate = jest.fn();
const mockCopy = jest.fn();
const mockDelete = jest.fn();
let mockExists = true;

jest.mock('expo-file-system', () => {
  class Directory {
    uri: string;
    constructor(base: { uri: string } | string, name?: string) {
      const root = typeof base === 'string' ? base : base.uri;
      this.uri = name ? `${root}${name}/` : root;
    }
    create = (options: unknown) => mockCreate(options);
  }
  class File {
    uri: string;
    constructor(base: { uri: string } | string, name?: string) {
      this.uri = typeof base === 'string' ? base : `${base.uri}${name}`;
    }
    get exists() {
      return mockExists;
    }
    copy = (destination: unknown) => mockCopy(this.uri, destination);
    delete = () => mockDelete(this.uri);
  }
  return { Directory, File, Paths: { document: { uri: 'file:///documents/' } } };
});

jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));
const mockPicker = ImagePicker as unknown as Record<
  'requestCameraPermissionsAsync' | 'launchCameraAsync' | 'launchImageLibraryAsync',
  jest.Mock
>;

beforeEach(() => {
  jest.clearAllMocks();
  mockExists = true;
});

describe('ExpoPhotoService.pick', () => {
  it('カメラは権限がなければ denied と canAskAgain を返し、起動しない', async () => {
    mockPicker.requestCameraPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: false });
    await expect(expoPhotoService.pick('camera')).resolves.toEqual({
      status: 'denied',
      canAskAgain: false,
    });
    expect(mockPicker.launchCameraAsync).not.toHaveBeenCalled();
  });

  it('カメラで撮影した画像の URI を返す（編集なし・画像のみ）', async () => {
    mockPicker.requestCameraPermissionsAsync.mockResolvedValue({ granted: true, canAskAgain: true });
    mockPicker.launchCameraAsync.mockResolvedValue({ canceled: false, assets: [{ uri: 'file:///c.jpg' }] });
    await expect(expoPhotoService.pick('camera')).resolves.toEqual({
      status: 'picked',
      uri: 'file:///c.jpg',
    });
    expect(mockPicker.launchCameraAsync).toHaveBeenCalledWith(
      expect.objectContaining({ mediaTypes: ['images'], allowsEditing: false }),
    );
  });

  it('ライブラリは権限を要求せずに選択できる', async () => {
    mockPicker.launchImageLibraryAsync.mockResolvedValue({ canceled: false, assets: [{ uri: 'file:///l.png' }] });
    await expect(expoPhotoService.pick('library')).resolves.toEqual({
      status: 'picked',
      uri: 'file:///l.png',
    });
    expect(mockPicker.requestCameraPermissionsAsync).not.toHaveBeenCalled();
  });

  it('キャンセル・アセットなしは canceled', async () => {
    mockPicker.launchImageLibraryAsync.mockResolvedValueOnce({ canceled: true, assets: null });
    await expect(expoPhotoService.pick('library')).resolves.toEqual({ status: 'canceled' });
    mockPicker.launchImageLibraryAsync.mockResolvedValueOnce({ canceled: false, assets: [] });
    await expect(expoPhotoService.pick('library')).resolves.toEqual({ status: 'canceled' });
  });
});

describe('ExpoPhotoService.save', () => {
  it('photos ディレクトリへ拡張子を保ってコピーし、新しい URI を返す', async () => {
    mockCopy.mockResolvedValue(undefined);
    const uri = await expoPhotoService.save('file:///tmp/Photo.PNG?x=1');
    expect(uri).toMatch(/^file:\/\/\/documents\/photos\/\d+-[a-z0-9]+\.png$/);
    expect(mockCreate).toHaveBeenCalledWith({ idempotent: true, intermediates: true });
    expect(mockCopy).toHaveBeenCalledWith('file:///tmp/Photo.PNG?x=1', expect.objectContaining({ uri }));
  });

  it('拡張子がなければ jpg にする', async () => {
    mockCopy.mockResolvedValue(undefined);
    await expect(expoPhotoService.save('file:///tmp/pick')).resolves.toMatch(/\.jpg$/);
  });

  it('コピーの失敗は呼び出し元に伝える', async () => {
    mockCopy.mockRejectedValue(new Error('x'));
    await expect(expoPhotoService.save('file:///tmp/a.jpg')).rejects.toThrow('x');
  });
});

describe('ExpoPhotoService.remove', () => {
  it('photos 配下の存在するファイルを削除する', async () => {
    await expoPhotoService.remove('file:///documents/photos/a.jpg');
    expect(mockDelete).toHaveBeenCalledWith('file:///documents/photos/a.jpg');
  });

  it('photos 外（書影 URL・他のファイル）は削除しない', async () => {
    await expoPhotoService.remove('http://example.com/cover.jpg');
    await expoPhotoService.remove('file:///documents/other/a.jpg');
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('存在しない・削除に失敗しても例外を投げない', async () => {
    mockExists = false;
    await expoPhotoService.remove('file:///documents/photos/a.jpg');
    expect(mockDelete).not.toHaveBeenCalled();
    mockExists = true;
    mockDelete.mockImplementation(() => {
      throw new Error('x');
    });
    await expect(expoPhotoService.remove('file:///documents/photos/a.jpg')).resolves.toBeUndefined();
  });
});

describe('Web', () => {
  const originalOS = Platform.OS;
  beforeEach(() => {
    Platform.OS = 'web';
  });
  afterEach(() => {
    Platform.OS = originalOS;
  });

  it('カメラは起動せず canceled を返す', async () => {
    await expect(expoPhotoService.pick('camera')).resolves.toEqual({ status: 'canceled' });
    expect(mockPicker.launchCameraAsync).not.toHaveBeenCalled();
  });

  it('save は URI をそのまま返し、remove は何もしない', async () => {
    await expect(expoPhotoService.save('blob:x')).resolves.toBe('blob:x');
    await expoPhotoService.remove('blob:x');
    expect(mockCopy).not.toHaveBeenCalled();
    expect(mockDelete).not.toHaveBeenCalled();
  });
});
