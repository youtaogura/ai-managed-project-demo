import type { FileService, SaveAndShareParams } from './FileService';

async function saveAndShare({ filename, mimeType, content }: SaveAndShareParams) {
  const url = URL.createObjectURL(new Blob([content], { type: `${mimeType};charset=utf-8` }));
  try {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
  return 'shared' as const;
}

function pickTextFile(): Promise<{ name: string; text: string } | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json,text/plain';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      file.text().then((text) => resolve({ name: file.name, text }), reject);
    };
    input.oncancel = () => resolve(null);
    input.click();
  });
}

export const webFileService: FileService = { saveAndShare, pickTextFile };
