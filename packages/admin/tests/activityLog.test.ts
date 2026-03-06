import { describe, it, expect, vi, beforeEach } from 'vitest';
import { activityLog, logActivity, clearActivityLog, configureActivityLog } from '../src/core/activityLog.js';

beforeEach(() => {
  clearActivityLog();
  configureActivityLog({ logEndpoint: undefined });
});

describe('activityLog', () => {
  it('starts empty', () => {
    expect(activityLog()).toHaveLength(0);
  });

  it('logActivity adds an entry', () => {
    logActivity({ resourceName: 'posts', resourceLabel: 'Posts', action: 'create', recordId: '1' });
    expect(activityLog()).toHaveLength(1);
  });

  it('entry has id (string), timestamp (Date), correct fields', () => {
    logActivity({ resourceName: 'posts', resourceLabel: 'Posts', action: 'update', recordId: 42 });
    const entry = activityLog()[0]!;
    expect(typeof entry.id).toBe('string');
    expect(entry.id.length).toBeGreaterThan(0);
    expect(entry.timestamp).toBeInstanceOf(Date);
    expect(entry.resourceName).toBe('posts');
    expect(entry.resourceLabel).toBe('Posts');
    expect(entry.action).toBe('update');
    expect(entry.recordId).toBe(42);
  });

  it('prepends newest entry first', () => {
    logActivity({ resourceName: 'posts', resourceLabel: 'Posts', action: 'create', recordId: '1' });
    logActivity({ resourceName: 'posts', resourceLabel: 'Posts', action: 'delete', recordId: '2' });
    expect(activityLog()[0]!.recordId).toBe('2');
    expect(activityLog()[1]!.recordId).toBe('1');
  });

  it('caps at 200 entries, discarding oldest', () => {
    for (let i = 0; i < 201; i++) {
      logActivity({ resourceName: 'r', resourceLabel: 'R', action: 'create', recordId: i });
    }
    expect(activityLog()).toHaveLength(200);
    // Newest (200) is first, oldest (1) is last (0 was evicted)
    expect(activityLog()[0]!.recordId).toBe(200);
  });

  it('clearActivityLog empties the log', () => {
    logActivity({ resourceName: 'posts', resourceLabel: 'Posts', action: 'create', recordId: '1' });
    clearActivityLog();
    expect(activityLog()).toHaveLength(0);
  });

  it('optional data field is stored', () => {
    logActivity({ resourceName: 'users', resourceLabel: 'Users', action: 'update', recordId: '5', data: { name: 'Alice' } });
    expect(activityLog()[0]!.data).toEqual({ name: 'Alice' });
  });

  it('entry without data has undefined data', () => {
    logActivity({ resourceName: 'users', resourceLabel: 'Users', action: 'delete', recordId: '5' });
    expect(activityLog()[0]!.data).toBeUndefined();
  });

  it('each entry has a unique id', () => {
    logActivity({ resourceName: 'r', resourceLabel: 'R', action: 'create', recordId: '1' });
    logActivity({ resourceName: 'r', resourceLabel: 'R', action: 'create', recordId: '2' });
    const ids = activityLog().map(e => e.id);
    expect(new Set(ids).size).toBe(2);
  });

  it('configureActivityLog: POSTs to logEndpoint', async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', mockFetch);

    configureActivityLog({ logEndpoint: 'http://example.com/log' });
    logActivity({ resourceName: 'posts', resourceLabel: 'Posts', action: 'create', recordId: '1' });

    await new Promise(r => setTimeout(r, 10));

    expect(mockFetch).toHaveBeenCalledWith(
      'http://example.com/log',
      expect.objectContaining({ method: 'POST' }),
    );

    vi.unstubAllGlobals();
  });

  it('configureActivityLog: does not POST when no logEndpoint', async () => {
    const mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);

    configureActivityLog({ logEndpoint: undefined });
    logActivity({ resourceName: 'posts', resourceLabel: 'Posts', action: 'create', recordId: '1' });

    await new Promise(r => setTimeout(r, 10));
    expect(mockFetch).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });
});
