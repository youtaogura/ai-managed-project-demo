import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import type { FileService, SaveAndShareParams } from './FileService';

async function saveAndShare({ filename, mimeType, content }: SaveAndShareParams) {
  if (!(await Sharing.isAvailableAsync())) throw new Error('共有を開けません');
  const file = new File(Paths.cache, filename);
  if (file.exists) file.delete();
  file.create();
  file.write(content);
  await Sharing.shareAsync(file.uri, { mimeType, dialogTitle: filename });
  return 'shared' as const;
}

async function pickTextFile() {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/*', '*/*'],
    copyToCacheDirectory: true,
  });
  const asset = result.assets?.[0];
  if (result.canceled || !asset) return null;
  return { name: asset.name, text: await new File(asset.uri).text() };
}

export const expoFileService: FileService = { saveAndShare, pickTextFile };
