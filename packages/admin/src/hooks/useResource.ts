import { signal } from '@liteforge/core';
import type { ResourceDefinition, UseResourceResult } from '../types.js';
import type { Client } from '@liteforge/client';

export interface UseResourceOptions<T> {
  resource: ResourceDefinition<T>;
  client: Client;
}

export function useResource<T>(options: UseResourceOptions<T>): UseResourceResult<T> {
  const { resource, client } = options;
  const loading = signal<boolean>(false);
  const error = signal<Error | null>(null);

  const r = client.resource<T>(resource.endpoint);

  async function create(data: unknown): Promise<T> {
    loading.set(true);
    error.set(null);
    try {
      let payload: Partial<T> = data as Partial<T>;
      if (resource.hooks?.beforeCreate) {
        payload = await resource.hooks.beforeCreate(payload);
      }
      const result = await r.create(payload);
      if (resource.hooks?.afterCreate) {
        resource.hooks.afterCreate(result);
      }
      return result;
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      error.set(e);
      throw e;
    } finally {
      loading.set(false);
    }
  }

  async function update(id: string | number, data: unknown): Promise<T> {
    loading.set(true);
    error.set(null);
    try {
      let payload: Partial<T> = data as Partial<T>;
      if (resource.hooks?.beforeEdit) {
        payload = await resource.hooks.beforeEdit(payload);
      }
      const result = await r.update(id, payload);
      if (resource.hooks?.afterEdit) {
        resource.hooks.afterEdit(result);
      }
      return result;
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      error.set(e);
      throw e;
    } finally {
      loading.set(false);
    }
  }

  async function destroy(id: string | number): Promise<void> {
    loading.set(true);
    error.set(null);
    try {
      if (resource.hooks?.beforeDestroy) {
        const proceed = await resource.hooks.beforeDestroy(id);
        if (!proceed) return;
      }
      await r.delete(id);
      if (resource.hooks?.afterDestroy) {
        resource.hooks.afterDestroy(id);
      }
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      error.set(e);
      throw e;
    } finally {
      loading.set(false);
    }
  }

  return { create, update, destroy, loading, error };
}
