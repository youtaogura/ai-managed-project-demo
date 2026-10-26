import { createContext, useContext, useMemo, type ReactNode } from 'react';

import { createDefaultBookSearchProvider } from '../lib/bookSearch';
import type { BookSearchProvider } from '../lib/bookSearch/BookSearchProvider';

const BookSearchContext = createContext<BookSearchProvider | null>(null);

type ProviderProps = {
  provider?: BookSearchProvider;
  children: ReactNode;
};

export function BookSearchContextProvider({ provider, children }: ProviderProps) {
  const value = useMemo(() => provider ?? createDefaultBookSearchProvider(), [provider]);
  return <BookSearchContext.Provider value={value}>{children}</BookSearchContext.Provider>;
}

export function useBookSearch(): BookSearchProvider {
  const provider = useContext(BookSearchContext);
  if (!provider) throw new Error('BookSearchContextProvider が必要です');
  return provider;
}
