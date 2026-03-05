import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useList } from '../src/hooks/useList.js';
import type { ListResponse } from '../src/types.js';

function makeResponse<T>(data: T[], total = data.length): ListResponse<T> {
  return {
    data,
    meta: {
      total,
      page: 1,
      pageSize: 20,
      totalPages: Math.ceil(total / 20),
    },
  };
}

describe('useList', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('initializes with default state', () => {
    const fetchFn = vi.fn().mockResolvedValue(makeResponse([]));
    const list = useList({ fetchFn });

    expect(list.data()).toEqual([]);
    expect(list.total()).toBe(0);
    expect(list.page()).toBe(1);
    expect(list.search()).toBe('');
    expect(list.sort()).toBeNull();
    expect(list.filters()).toEqual({});
  });

  it('calls fetchFn with default params on creation', async () => {
    const fetchFn = vi.fn().mockResolvedValue(makeResponse(['a', 'b']));
    useList({ fetchFn, pageSize: 10 });

    await vi.runAllTimersAsync();

    expect(fetchFn).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, pageSize: 10 }),
    );
  });

  it('updates data after fetch', async () => {
    const items = [{ id: 1, name: 'Post 1' }];
    const fetchFn = vi.fn().mockResolvedValue(makeResponse(items, 1));
    const list = useList({ fetchFn });

    await vi.runAllTimersAsync();

    expect(list.data()).toEqual(items);
    expect(list.total()).toBe(1);
  });

  it('setPage updates page signal and re-fetches', async () => {
    const fetchFn = vi.fn().mockResolvedValue(makeResponse([], 100));
    const list = useList({ fetchFn, pageSize: 10 });

    await vi.runAllTimersAsync();
    fetchFn.mockClear();

    list.setPage(3);
    await vi.runAllTimersAsync();

    expect(list.page()).toBe(3);
    expect(fetchFn).toHaveBeenCalledWith(expect.objectContaining({ page: 3 }));
  });

  it('setSort toggles direction on same field', async () => {
    const fetchFn = vi.fn().mockResolvedValue(makeResponse([]));
    const list = useList({ fetchFn });

    await vi.runAllTimersAsync();

    list.setSort('name');
    expect(list.sort()).toEqual({ field: 'name', direction: 'asc' });

    list.setSort('name');
    expect(list.sort()).toEqual({ field: 'name', direction: 'desc' });
  });

  it('setSort resets page to 1', async () => {
    const fetchFn = vi.fn().mockResolvedValue(makeResponse([], 100));
    const list = useList({ fetchFn, pageSize: 10 });

    await vi.runAllTimersAsync();
    list.setPage(3);
    await vi.runAllTimersAsync();
    expect(list.page()).toBe(3);

    list.setSort('name');
    expect(list.page()).toBe(1);
  });

  it('setSearch updates search signal and resets page', async () => {
    const fetchFn = vi.fn().mockResolvedValue(makeResponse([], 100));
    const list = useList({ fetchFn });

    await vi.runAllTimersAsync();
    list.setPage(2);
    await vi.runAllTimersAsync();

    list.setSearch('hello');
    expect(list.search()).toBe('hello');
    expect(list.page()).toBe(1);
  });

  it('calls fetchFn with search param', async () => {
    const fetchFn = vi.fn().mockResolvedValue(makeResponse([]));
    const list = useList({ fetchFn });

    await vi.runAllTimersAsync();
    fetchFn.mockClear();

    list.setSearch('test query');
    await vi.runAllTimersAsync();

    expect(fetchFn).toHaveBeenCalledWith(
      expect.objectContaining({ search: 'test query' }),
    );
  });

  it('setFilter updates filters and resets page', async () => {
    const fetchFn = vi.fn().mockResolvedValue(makeResponse([]));
    const list = useList({ fetchFn });

    await vi.runAllTimersAsync();
    list.setPage(3);
    await vi.runAllTimersAsync();

    list.setFilter('status', 'published');
    expect(list.filters()).toEqual({ status: 'published' });
    expect(list.page()).toBe(1);
  });

  it('calls fetchFn with filter params', async () => {
    const fetchFn = vi.fn().mockResolvedValue(makeResponse([]));
    const list = useList({ fetchFn });

    await vi.runAllTimersAsync();
    fetchFn.mockClear();

    list.setFilter('category', 'tech');
    await vi.runAllTimersAsync();

    expect(fetchFn).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'tech' }),
    );
  });

  it('applies defaultSort on initialization', () => {
    const fetchFn = vi.fn().mockResolvedValue(makeResponse([]));
    const list = useList({
      fetchFn,
      defaultSort: { field: 'createdAt', direction: 'desc' },
    });

    expect(list.sort()).toEqual({ field: 'createdAt', direction: 'desc' });
  });

  it('sets loading to false after fetch completes', async () => {
    const fetchFn = vi.fn().mockResolvedValue(makeResponse([]));
    const list = useList({ fetchFn });

    await vi.runAllTimersAsync();

    expect(list.loading()).toBe(false);
  });

  it('sets error on fetch failure', async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error('Network error'));
    const list = useList({ fetchFn });

    await vi.runAllTimersAsync();

    expect(list.error()).toBeInstanceOf(Error);
    expect(list.error()?.message).toBe('Network error');
  });

  it('refresh re-calls fetchFn', async () => {
    const fetchFn = vi.fn().mockResolvedValue(makeResponse([]));
    const list = useList({ fetchFn });

    await vi.runAllTimersAsync();
    const callCount = fetchFn.mock.calls.length;

    list.refresh();
    await vi.runAllTimersAsync();

    expect(fetchFn.mock.calls.length).toBeGreaterThan(callCount);
  });
});
