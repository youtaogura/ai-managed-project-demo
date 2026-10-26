export type SaveAndShareParams = {
  filename: string;
  mimeType: string;
  content: string;
};

export interface FileService {
  /** ファイルを作って共有メニューを開く（Web はダウンロード）。共有が使えない端末は例外を投げる。 */
  saveAndShare(params: SaveAndShareParams): Promise<'shared' | 'cancelled'>;
  /** テキストファイルを選んで UTF-8 として読む。キャンセルは null。 */
  pickTextFile(): Promise<{ name: string; text: string } | null>;
}
