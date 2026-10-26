import { Platform } from 'react-native';

import { expoFileService } from './ExpoFileService';
import type { FileService } from './FileService';
import { webFileService } from './WebFileService';

export const defaultFileService: FileService = Platform.OS === 'web' ? webFileService : expoFileService;
export type { FileService, SaveAndShareParams } from './FileService';
