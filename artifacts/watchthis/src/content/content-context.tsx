import { createContext, useContext, type ReactNode } from 'react';
import { useGetContent, getGetContentQueryKey } from '@workspace/api-client-react';

/**
 * Site content system.
 *
 * Every editable piece of content has a string key. Defaults live in code
 * (content-defaults.ts); overrides can be stored in the database,
 * served by GET /api/content. `useContent(key)` merges override over default.
 *
 * Content value shape (all fields optional, page decides what it uses):
 *   { title, description, body (markdown), ...extra }
 */
export type ContentValue = Record<string, unknown>;

type ContentContextValue = {
  overrides: Record<string, ContentValue>;
  ready: boolean;
};

const ContentContext = createContext<ContentContextValue>({ overrides: {}, ready: false });

export function ContentProvider({ children }: { children: ReactNode }) {
  const { data, isSuccess, isError } = useGetContent({
    query: { queryKey: getGetContentQueryKey(), staleTime: 60_000, retry: 1 },
  });
  const overrides = (data as Record<string, ContentValue>) ?? {};
  const ready = isSuccess || isError;
  return (
    <ContentContext.Provider value={{ overrides, ready }}>{children}</ContentContext.Provider>
  );
}

export function useContentOverrides(): Record<string, ContentValue> {
  return useContext(ContentContext).overrides;
}

/** Whether the content map has finished loading (query settled). */
export function useContentReady(): boolean {
  return useContext(ContentContext).ready;
}

/** Returns the stored override for a key merged over the provided defaults. */
export function useContent<T extends ContentValue>(key: string, defaults: T): T {
  const { overrides } = useContext(ContentContext);
  const override = overrides[key];
  if (!override) return defaults;
  return { ...defaults, ...override } as T;
}
