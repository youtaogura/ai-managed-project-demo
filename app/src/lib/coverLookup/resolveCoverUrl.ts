import { toIsbn13 } from '../isbn';
import type { CoverProvider } from './CoverProvider';

export type CoverResolver = (isbn: string) => Promise<string | null>;

const DEFAULT_TIMEOUT_MS = 8000;

/** 取得元を順に試し、最初に見つかった書影 URL を返す。全体で timeoutMs の締め切りを持つ。 */
export function createCoverResolver(
  providers: readonly CoverProvider[],
  options: { timeoutMs?: number } = {},
): CoverResolver {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  return async (isbn) => {
    const isbn13 = toIsbn13(isbn);
    if (isbn13 === null) return null;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const aborted = new Promise<null>((resolve) => {
      controller.signal.addEventListener('abort', () => resolve(null));
    });
    const run = async (): Promise<string | null> => {
      for (const provider of providers) {
        if (controller.signal.aborted) return null;
        try {
          const url = await provider.findCoverUrl(isbn13, controller.signal);
          if (url !== null) return url;
        } catch {
          // 1 つの取得元の失敗は次の取得元へ進む
        }
      }
      return null;
    };
    try {
      return await Promise.race([run(), aborted]);
    } finally {
      clearTimeout(timer);
    }
  };
}
