import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

import type { PhotoService, PhotoSource, PickResult } from './PhotoService';

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  allowsEditing: false,
  quality: 0.8,
};

const DEFAULT_EXTENSION = 'jpg';

function photosDirectory(): Directory {
  return new Directory(Paths.document, 'photos');
}

function extensionOf(uri: string): string {
  const match = /\.([A-Za-z0-9]{1,5})(?:[?#].*)?$/.exec(uri);
  return match?.[1]?.toLowerCase() ?? DEFAULT_EXTENSION;
}

async function pick(source: PhotoSource): Promise<PickResult> {
  // Web にはカメラ起動がないため、何もせず終える
  if (Platform.OS === 'web' && source === 'camera') return { status: 'canceled' };
  if (source === 'camera') {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return { status: 'denied', canAskAgain: permission.canAskAgain };
  }
  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync(PICKER_OPTIONS)
      : await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
  const asset = result.assets?.[0];
  if (result.canceled || !asset) return { status: 'canceled' };
  return { status: 'picked', uri: asset.uri };
}

async function save(sourceUri: string): Promise<string> {
  // Web ではファイルシステムを使えないため、選択された URI をそのまま使う
  if (Platform.OS === 'web') return sourceUri;
  const directory = photosDirectory();
  directory.create({ idempotent: true, intermediates: true });
  const name = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${extensionOf(sourceUri)}`;
  const destination = new File(directory, name);
  await new File(sourceUri).copy(destination);
  return destination.uri;
}

async function remove(uri: string): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    if (!uri.startsWith(photosDirectory().uri)) return;
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // 削除に失敗しても記録の整合性には影響しない
  }
}

export const expoPhotoService: PhotoService = { pick, save, remove };
