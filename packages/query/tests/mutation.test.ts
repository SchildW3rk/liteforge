/**
 * createMutation Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMutation } from '../src/mutation.js';
import { createQuery } from '../src/query.js';
import { queryCache } from '../src/cache.js';

describe('createMutation', () => {
  beforeEach(() => {
    queryCache.clear();
    vi.clearAllMocks();
  });

  describe('basic functionality', () => {
    it('executes mutation and returns data', async () => {
      const mutationFn = vi.fn().mockResolvedValue({ id: 1, name: 'Created' });
      const mutation = createMutation({ fn: mutationFn });

      expect(mutation.isLoading()).toBe(false);
      expect(mutation.data()).toBeUndefined();

      const result = await mutation.mutate({ name: 'Test' });

      expect(result).toEqual({ id: 1, name: 'Created' });
      expect(mutation.data()).toEqual({ id: 1, name: 'Created' });
      expect(mutation.isLoading()).toBe(false);
      expect(mutation.error()).toBeUndefined();
      expect(mutationFn).toHaveBeenCalledWith({ name: 'Test' });
    });

    it('sets loading state during mutation', async () => {
      let resolvePromise: (value: unknown) => void;
      const mutationFn = vi.fn().mockImplementation(() => 
        new Promise(resolve => { resolvePromise = resolve; })
      );

      const mutation = createMutation({ fn: mutationFn });

      const promise = mutation.mutate({});

      expect(mutation.isLoading()).toBe(true);

      resolvePromise!({ id: 1 });
      await promise;

      expect(mutation.isLoading()).toBe(false);
    });

    it('sets error on failure', async () => {
      const error = new Error('Mutation failed');
      const mutationFn = vi.fn().mockRejectedValue(error);
      const mutation = createMutation({ fn: mutationFn });

      await expect(mutation.mutate({})).rejects.toThrow('Mutation failed');

      expect(mutation.error()?.message).toBe('Mutation failed');
      expect(mutation.isLoading()).toBe(false);
      expect(mutation.data()).toBeUndefined();
    });

    it('converts non-Error throws to Error', async () => {
      const mutationFn = vi.fn().mockRejectedValue('string error');
      const mutation = createMutation({ fn: mutationFn });

      await expect(mutation.mutate({})).rejects.toThrow();

      expect(mutation.error()).toBeInstanceOf(Error);
      expect(mutation.error()?.message).toBe('string error');
    });
  });

  describe('reset', () => {
    it('resets all state to initial', async () => {
      const mutationFn = vi.fn().mockResolvedValue({ id: 1 });
      const mutation = createMutation({ fn: mutationFn });

      await mutation.mutate({});

      expect(mutation.data()).toEqual({ id: 1 });

      mutation.reset();

      expect(mutation.data()).toBeUndefined();
      expect(mutation.error()).toBeUndefined();
      expect(mutation.isLoading()).toBe(false);
    });

    it('clears error on reset', async () => {
      const mutationFn = vi.fn().mockRejectedValue(new Error('fail'));
      const mutation = createMutation({ fn: mutationFn });

      await expect(mutation.mutate({})).rejects.toThrow();
      expect(mutation.error()).toBeDefined();

      mutation.reset();

      expect(mutation.error()).toBeUndefined();
    });
  });

  describe('onSuccess callback', () => {
    it('calls onSuccess with data and variables', async () => {
      const onSuccess = vi.fn();
      const mutationFn = vi.fn().mockResolvedValue({ id: 1 });
      
      const mutation = createMutation({ fn: mutationFn, onSuccess });

      await mutation.mutate({ name: 'Test' });

      expect(onSuccess).toHaveBeenCalledWith(
        { id: 1 },
        { name: 'Test' }
      );
    });

    it('onSuccess error does not affect result', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const onSuccess = vi.fn().mockImplementation(() => {
        throw new Error('callback error');
      });
      const mutationFn = vi.fn().mockResolvedValue({ id: 1 });
      
      const mutation = createMutation({ fn: mutationFn, onSuccess });

      const result = await mutation.mutate({});

      expect(result).toEqual({ id: 1 });
      expect(mutation.data()).toEqual({ id: 1 });
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('onError callback', () => {
    it('calls onError with error and variables', async () => {
      const onError = vi.fn();
      const error = new Error('fail');
      const mutationFn = vi.fn().mockRejectedValue(error);
      
      const mutation = createMutation({ fn: mutationFn, onError });

      await expect(mutation.mutate({ name: 'Test' })).rejects.toThrow();

      expect(onError).toHaveBeenCalledWith(
        error,
        { name: 'Test' },
        undefined // no rollback data
      );
    });

    it('passes rollback data from onMutate to onError', async () => {
      const onMutate = vi.fn().mockReturnValue({ previousValue: 'old' });
      const onError = vi.fn();
      const mutationFn = vi.fn().mockRejectedValue(new Error('fail'));
      
      const mutation = createMutation({ fn: mutationFn, onMutate, onError });

      await expect(mutation.mutate({})).rejects.toThrow();

      expect(onError).toHaveBeenCalledWith(
        expect.any(Error),
        {},
        { previousValue: 'old' }
      );
    });

    it('onError error does not affect result', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const onError = vi.fn().mockImplementation(() => {
        throw new Error('callback error');
      });
      const mutationFn = vi.fn().mockRejectedValue(new Error('mutation error'));
      
      const mutation = createMutation({ fn: mutationFn, onError });

      await expect(mutation.mutate({})).rejects.toThrow('mutation error');
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('onMutate callback', () => {
    it('calls onMutate before mutation', async () => {
      const callOrder: string[] = [];
      const onMutate = vi.fn().mockImplementation(() => {
        callOrder.push('onMutate');
      });
      const mutationFn = vi.fn().mockImplementation(async () => {
        callOrder.push('mutationFn');
        return { id: 1 };
      });
      
      const mutation = createMutation({ fn: mutationFn, onMutate });

      await mutation.mutate({ name: 'Test' });

      expect(callOrder).toEqual(['onMutate', 'mutationFn']);
      expect(onMutate).toHaveBeenCalledWith(
        { name: 'Test' },
        expect.objectContaining({
          get: expect.any(Function),
          set: expect.any(Function),
        })
      );
    });

    it('provides cache access for optimistic updates', async () => {
      queryCache.set('items', [{ id: 1 }]);

      const onMutate = vi.fn().mockImplementation((vars, cache) => {
        const previous = cache.get('items');
        cache.set('items', [...(previous as unknown[]), { id: 2, ...vars }]);
        return { previous };
      });

      const mutationFn = vi.fn().mockResolvedValue({ id: 2 });
      const mutation = createMutation({ fn: mutationFn, onMutate });

      await mutation.mutate({ name: 'New' });

      // Cache should have optimistic update
      expect(queryCache.get('items')).toContainEqual({ id: 2, name: 'New' });
    });

    it('onMutate error does not stop mutation', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const onMutate = vi.fn().mockImplementation(() => {
        throw new Error('onMutate error');
      });
      const mutationFn = vi.fn().mockResolvedValue({ id: 1 });
      
      const mutation = createMutation({ fn: mutationFn, onMutate });

      const result = await mutation.mutate({});

      expect(result).toEqual({ id: 1 });
      expect(mutationFn).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('invalidate', () => {
    it('invalidates specified query keys on success', async () => {
      // Create a query
      const queryFetcher = vi.fn().mockResolvedValue([{ id: 1 }]);
      const query = createQuery({ key: 'items', fn: queryFetcher, staleTime: 60000 });

      await vi.waitFor(() => expect(query.data()).toBeDefined());
      expect(queryFetcher).toHaveBeenCalledTimes(1);

      // Create mutation that invalidates 'items'
      const mutationFn = vi.fn().mockResolvedValue({ id: 2 });
      const mutation = createMutation({
        fn: mutationFn,
        invalidate: ['items'],
      });

      await mutation.mutate({});

      // Query should refetch
      await vi.waitFor(() => expect(queryFetcher).toHaveBeenCalledTimes(2));

      query.dispose();
    });

    it('invalidates multiple keys', async () => {
      const fetcher1 = vi.fn().mockResolvedValue([]);
      const fetcher2 = vi.fn().mockResolvedValue([]);
      
      const query1 = createQuery({ key: 'items', fn: fetcher1, staleTime: 60000 });
      const query2 = createQuery({ key: 'users', fn: fetcher2, staleTime: 60000 });

      await vi.waitFor(() => {
        expect(query1.data()).toBeDefined();
        expect(query2.data()).toBeDefined();
      });

      const mutationFn = vi.fn().mockResolvedValue({});
      const mutation = createMutation({
        fn: mutationFn,
        invalidate: ['items', 'users'],
      });

      await mutation.mutate({});

      await vi.waitFor(() => {
        expect(fetcher1).toHaveBeenCalledTimes(2);
        expect(fetcher2).toHaveBeenCalledTimes(2);
      });

      query1.dispose();
      query2.dispose();
    });

    it('does not invalidate on error', async () => {
      const queryFetcher = vi.fn().mockResolvedValue([]);
      const query = createQuery({ key: 'items', fn: queryFetcher, staleTime: 60000 });

      await vi.waitFor(() => expect(query.data()).toBeDefined());

      const mutationFn = vi.fn().mockRejectedValue(new Error('fail'));
      const mutation = createMutation({
        fn: mutationFn,
        invalidate: ['items'],
      });

      await expect(mutation.mutate({})).rejects.toThrow();

      // Query should NOT refetch
      await new Promise(resolve => setTimeout(resolve, 50));
      expect(queryFetcher).toHaveBeenCalledTimes(1);

      query.dispose();
    });
  });

  describe('optimistic updates with rollback', () => {
    it('can implement optimistic update with rollback', async () => {
      // Setup initial data
      queryCache.set('todos', [{ id: 1, text: 'Old' }]);

      const onMutate = vi.fn().mockImplementation((vars, cache) => {
        const previous = cache.get<{ id: number; text: string }[]>('todos');
        // Optimistically add new todo
        cache.set('todos', [...(previous ?? []), { id: 2, text: vars.text }]);
        return { previous };
      });

      const onError = vi.fn().mockImplementation((error, vars, rollback) => {
        // Rollback on error
        if (rollback?.previous) {
          queryCache.set('todos', rollback.previous);
        }
      });

      const mutationFn = vi.fn().mockRejectedValue(new Error('Server error'));
      
      const mutation = createMutation({
        fn: mutationFn,
        onMutate,
        onError,
      });

      // Before mutation
      expect(queryCache.get('todos')).toEqual([{ id: 1, text: 'Old' }]);

      // Start mutation (will fail)
      const promise = mutation.mutate({ text: 'New' });

      // Optimistic update should be applied
      expect(queryCache.get('todos')).toContainEqual({ id: 2, text: 'New' });

      // Wait for failure
      await expect(promise).rejects.toThrow();

      // Should be rolled back
      expect(queryCache.get('todos')).toEqual([{ id: 1, text: 'Old' }]);
    });
  });

  describe('type safety', () => {
    it('infers types correctly', async () => {
      interface CreateUserInput {
        name: string;
        email: string;
      }

      interface User {
        id: number;
        name: string;
        email: string;
      }

      const mutationFn = vi.fn().mockImplementation(
        async (input: CreateUserInput): Promise<User> => ({
          id: 1,
          ...input,
        })
      );

      const mutation = createMutation<User, CreateUserInput>({ fn: mutationFn });

      const result = await mutation.mutate({ name: 'Alice', email: 'alice@test.com' });

      // TypeScript should infer these correctly
      const data: User | undefined = mutation.data();
      expect(result.id).toBe(1);
      expect(data?.name).toBe('Alice');
    });
  });
});
