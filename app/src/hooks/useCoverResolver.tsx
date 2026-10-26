import { createContext, useContext, useMemo, type ReactNode } from 'react';

import { createDefaultCoverResolver } from '../lib/coverLookup';
import type { CoverResolver } from '../lib/coverLookup/resolveCoverUrl';

const CoverResolverContext = createContext<CoverResolver | null>(null);

type ProviderProps = {
  resolver?: CoverResolver;
  children: ReactNode;
};

export function CoverResolverContextProvider({ resolver, children }: ProviderProps) {
  const value = useMemo(() => resolver ?? createDefaultCoverResolver(), [resolver]);
  return <CoverResolverContext.Provider value={value}>{children}</CoverResolverContext.Provider>;
}

export function useCoverResolver(): CoverResolver {
  const resolver = useContext(CoverResolverContext);
  if (!resolver) throw new Error('CoverResolverContextProvider が必要です');
  return resolver;
}
