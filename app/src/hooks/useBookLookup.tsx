import { createContext, useContext, useMemo, type ReactNode } from 'react';

import { createDefaultBookLookupProvider } from '../lib/bookLookup';
import type { BookLookupProvider } from '../lib/bookLookup/BookLookupProvider';

const BookLookupContext = createContext<BookLookupProvider | null>(null);

type ProviderProps = {
  provider?: BookLookupProvider;
  children: ReactNode;
};

export function BookLookupContextProvider({ provider, children }: ProviderProps) {
  const value = useMemo(() => provider ?? createDefaultBookLookupProvider(), [provider]);
  return <BookLookupContext.Provider value={value}>{children}</BookLookupContext.Provider>;
}

export function useBookLookup(): BookLookupProvider {
  const provider = useContext(BookLookupContext);
  if (!provider) throw new Error('BookLookupContextProvider が必要です');
  return provider;
}
