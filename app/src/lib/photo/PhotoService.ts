export type PhotoSource = 'camera' | 'library';

export type PickResult =
  | { status: 'picked'; uri: string }
  | { status: 'canceled' }
  | { status: 'denied'; canAskAgain: boolean };

export type PhotoService = {
  /** 画像を選ぶ（権限確認を含む）。コピーはしない */
  pick(source: PhotoSource): Promise<PickResult>;
  /** アプリ専用領域へコピーし、新しい URI を返す */
  save(sourceUri: string): Promise<string>;
  /** 存在すれば削除する。失敗・不在は握りつぶす */
  remove(uri: string): Promise<void>;
};
