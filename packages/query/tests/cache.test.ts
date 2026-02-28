/**
 * Query Cache Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { queryCache, serializeKey } from '../src/cache.js';

describe('queryCache', () => {
  beforeEach(() => {
    queryCache.clear();
    vi.clearAllMocks();
  });

  describe('get/set', () => {
    it('returns undefined for non-existent key', () => {
      expect(queryCache.get('nonexistent')).toBeUndefined();
    });

    it('stores and retrieves data', () => {
      queryCache.set('users', [{ id: 1, name: 'Alice' }]);
      expect(queryCache.get('users')).toEqual([{ id: 1, name: 'Alice' }]);
    });

    it('overwrites existing data', () => {
      queryCache.set('count', 1);
      queryCache.set('count', 2);
      expect(queryCache.get('count')).toBe(2);
    });

    it('stores different types', () => {
      queryCache.set('string', 'hello');
      queryCache.set('number', 42);
      queryCache.set('boolean', true);
      queryCache.set('null', null);
      queryCache.set('object', { nested: { value: 1 } });
      queryCache.set('array', [1, 2, 3]);

      expect(queryCache.get('string')).toBe('hello');
      expect(queryCache.get('number')).toBe(42);
      expect(queryCache.get('boolean')).toBe(true);
      expect(queryCache.get('null')).toBeNull();
      expect(queryCache.get('object')).toEqual({ nested: { value: 1 } });
      expect(queryCache.get('array')).toEqual([1, 2, 3]);
    });
  });

  describe('invalidate', () => {
    it('invalidates a single key', () => {
      queryCache.set('users', []);
      const entry = queryCache.getEntry('users');
      expect(entry?.fetchedAt).toBeGreaterThan(0);

      queryCache.invalidate('users');
      
      const invalidatedEntry = queryCache.getEntry('users');
      expect(invalidatedEntry?.fetchedAt).toBe(0);
    });

    it('invalidates pattern with wildcard', () => {
      queryCache.set('user:1', { id: 1 });
      queryCache.set('user:2', { id: 2 });
      queryCache.set('user:3', { id: 3 });
      queryCache.set('posts', []);

      queryCache.invalidate('user:*');

      expect(queryCache.getEntry('user:1')?.fetchedAt).toBe(0);
      expect(queryCache.getEntry('user:2')?.fetchedAt).toBe(0);
      expect(queryCache.getEntry('user:3')?.fetchedAt).toBe(0);
      // posts should not be affected
      expect(queryCache.getEntry('posts')?.fetchedAt).toBeGreaterThan(0);
    });

    it('calls registered refetch functions on invalidation', async () => {
      const refetch = vi.fn().mockResolvedValue(undefined);
      queryCache.set('users', []);
      queryCache.registerQuery('users', refetch);

      queryCache.invalidate('users');

      // Give the async refetch a tick to be called
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(refetch).toHaveBeenCalledTimes(1);
    });

    it('calls refetch for pattern invalidation', async () => {
      const refetch1 = vi.fn().mockResolvedValue(undefined);
      const refetch2 = vi.fn().mockResolvedValue(undefined);
      
      queryCache.set('user:1', {});
      queryCache.set('user:2', {});
      queryCache.registerQuery('user:1', refetch1);
      queryCache.registerQuery('user:2', refetch2);

      queryCache.invalidate('user:*');

      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(refetch1).toHaveBeenCalledTimes(1);
      expect(refetch2).toHaveBeenCalledTimes(1);
    });
  });

  describe('clear', () => {
    it('removes all entries', () => {
      queryCache.set('a', 1);
      queryCache.set('b', 2);
      queryCache.set('c', 3);

      queryCache.clear();

      expect(queryCache.get('a')).toBeUndefined();
      expect(queryCache.get('b')).toBeUndefined();
      expect(queryCache.get('c')).toBeUndefined();
      expect(queryCache.getAll().size).toBe(0);
    });
  });

  describe('getAll', () => {
    it('returns all cache entries', () => {
      queryCache.set('users', []);
      queryCache.set('posts', []);

      const all = queryCache.getAll();

      expect(all.size).toBe(2);
      expect(all.has('users')).toBe(true);
      expect(all.has('posts')).toBe(true);
    });

    it('returns a copy (not the internal map)', () => {
      queryCache.set('test', 1);
      const all = queryCache.getAll();
      all.delete('test');

      expect(queryCache.get('test')).toBe(1);
    });
  });

  describe('subscribe/unsubscribe', () => {
    it('tracks subscriber count', () => {
      queryCache.set('users', []);
      
      queryCache.subscribe('users');
      expect(queryCache.getEntry('users')?.subscribers).toBe(1);
      
      queryCache.subscribe('users');
      expect(queryCache.getEntry('users')?.subscribers).toBe(2);
      
      queryCache.unsubscribe('users', 5000);
      expect(queryCache.getEntry('users')?.subscribers).toBe(1);
    });

    it('creates placeholder entry on subscribe to non-existent key', () => {
      queryCache.subscribe('new-key');
      
      const entry = queryCache.getEntry('new-key');
      expect(entry).toBeDefined();
      expect(entry?.subscribers).toBe(1);
      expect(entry?.data).toBeUndefined();
    });

    it('schedules garbage collection on last unsubscribe', () => {
      vi.useFakeTimers();
      
      queryCache.set('temp', 'data');
      queryCache.subscribe('temp');
      queryCache.unsubscribe('temp', 1000);

      // Entry should still exist
      expect(queryCache.get('temp')).toBe('data');

      // Advance time past cacheTime
      vi.advanceTimersByTime(1001);

      // Entry should be garbage collected
      expect(queryCache.get('temp')).toBeUndefined();

      vi.useRealTimers();
    });

    it('cancels garbage collection on re-subscribe', () => {
      vi.useFakeTimers();
      
      queryCache.set('temp', 'data');
      queryCache.subscribe('temp');
      queryCache.unsubscribe('temp', 1000);

      // Re-subscribe before GC
      vi.advanceTimersByTime(500);
      queryCache.subscribe('temp');

      // Advance past original GC time
      vi.advanceTimersByTime(600);

      // Entry should still exist
      expect(queryCache.get('temp')).toBe('data');

      vi.useRealTimers();
    });

    it('immediately cleans up with cacheTime 0', () => {
      queryCache.set('temp', 'data');
      queryCache.subscribe('temp');
      queryCache.unsubscribe('temp', 0);

      expect(queryCache.get('temp')).toBeUndefined();
    });
  });

  describe('registerQuery', () => {
    it('registers and unregisters query', async () => {
      const refetch = vi.fn().mockResolvedValue(undefined);
      
      const unregister = queryCache.registerQuery('users', refetch);
      queryCache.set('users', []);
      
      queryCache.invalidate('users');
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(refetch).toHaveBeenCalledTimes(1);

      unregister();
      
      queryCache.invalidate('users');
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(refetch).toHaveBeenCalledTimes(1); // Still 1, not 2
    });

    it('supports multiple queries for same key', async () => {
      const refetch1 = vi.fn().mockResolvedValue(undefined);
      const refetch2 = vi.fn().mockResolvedValue(undefined);
      
      queryCache.registerQuery('users', refetch1);
      queryCache.registerQuery('users', refetch2);
      queryCache.set('users', []);
      
      queryCache.invalidate('users');
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(refetch1).toHaveBeenCalledTimes(1);
      expect(refetch2).toHaveBeenCalledTimes(1);
    });
  });
});

describe('serializeKey', () => {
  it('returns string key as-is', () => {
    expect(serializeKey('users')).toBe('users');
  });

  it('joins array elements with colon', () => {
    expect(serializeKey(['user', 1])).toBe('user:1');
    expect(serializeKey(['users', 'list', 'page', 2])).toBe('users:list:page:2');
  });

  it('handles various types', () => {
    expect(serializeKey(['key', true])).toBe('key:true');
    expect(serializeKey(['key', false])).toBe('key:false');
    expect(serializeKey(['key', null])).toBe('key:null');
    expect(serializeKey(['key', undefined])).toBe('key:undefined');
  });
});
