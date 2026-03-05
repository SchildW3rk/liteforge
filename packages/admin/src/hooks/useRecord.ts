import { signal, effect } from '@liteforge/core';
import type { UseRecordResult } from '../types.js';

export function useRecord<T>(fetchFn: () => Promise<T>): UseRecordResult<T> {
  const record = signal<T | null>(null);
  const loading = signal<boolean>(false);
  const error = signal<Error | null>(null);

  async function fetch(): Promise<void> {
    loading.set(true);
    error.set(null);
    try {
      const result = await fetchFn();
      record.set(result);
    } catch (err) {
      error.set(err instanceof Error ? err : new Error(String(err)));
    } finally {
      loading.set(false);
    }
  }

  effect(() => {
    void fetch();
  });

  function refetch(): void {
    void fetch();
  }

  return { record, loading, error, refetch };
}
