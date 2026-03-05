import { signal, effect } from '@liteforge/core';
import type { ListParams, UseListResult, ListResponse } from '../types.js';

export interface UseListOptions<T> {
  fetchFn: (params: ListParams) => Promise<ListResponse<T>>;
  defaultSort?: { field: string; direction: 'asc' | 'desc' };
  pageSize?: number;
  searchable?: string[];
}

export function useList<T>(options: UseListOptions<T>): UseListResult<T> {
  const { fetchFn, defaultSort, pageSize = 20 } = options;

  const data = signal<T[]>([]);
  const total = signal<number>(0);
  const loading = signal<boolean>(false);
  const error = signal<Error | null>(null);
  const page = signal<number>(1);
  const sort = signal<{ field: string; direction: 'asc' | 'desc' } | null>(
    defaultSort ?? null,
  );
  const search = signal<string>('');
  const filters = signal<Record<string, string>>({});

  let abortController: AbortController | null = null;

  function buildParams(): ListParams {
    const s = sort();
    const f = filters();
    const q = search();
    const params: ListParams = {
      page: page(),
      pageSize,
    };
    if (q) params['search'] = q;
    if (s) {
      params['sort'] = s.field;
      params['order'] = s.direction;
    }
    for (const [k, v] of Object.entries(f) as Array<[string, string]>) {
      if (v !== '') params[k] = v;
    }
    return params;
  }

  async function fetch(): Promise<void> {
    if (abortController) abortController.abort();
    abortController = new AbortController();

    loading.set(true);
    error.set(null);

    try {
      const result = await fetchFn(buildParams());
      data.set(result.data);
      total.set(result.meta.total);
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        error.set(err);
      }
    } finally {
      loading.set(false);
    }
  }

  // Auto-fetch when reactive state changes
  effect(() => {
    // Access signals to create subscriptions
    page();
    sort();
    search();
    filters();
    void fetch();
  });

  function setPage(p: number): void {
    page.set(p);
  }

  function setSort(field: string): void {
    const current = sort();
    if (current?.field === field) {
      sort.set({ field, direction: current.direction === 'asc' ? 'desc' : 'asc' });
    } else {
      sort.set({ field, direction: 'asc' });
    }
    page.set(1);
  }

  function setSearch(q: string): void {
    search.set(q);
    page.set(1);
  }

  function setFilter(field: string, value: string): void {
    filters.update(f => ({ ...f, [field]: value }));
    page.set(1);
  }

  function refresh(): void {
    void fetch();
  }

  return { data, total, loading, error, page, setPage, sort, setSort, search, setSearch, filters, setFilter, refresh };
}
