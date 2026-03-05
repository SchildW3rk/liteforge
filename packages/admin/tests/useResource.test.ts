import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useResource } from '../src/hooks/useResource.js';
import { defineResource } from '../src/core/defineResource.js';
import type { Client } from '@liteforge/client';

function makeMockClient(overrides: Record<string, unknown> = {}): Client {
  const mockResource = {
    getList: vi.fn().mockResolvedValue({ data: [], meta: { total: 0, page: 1, pageSize: 20, totalPages: 0 } }),
    getOne: vi.fn().mockResolvedValue({ id: '1', name: 'Test' }),
    create: vi.fn().mockResolvedValue({ id: '2', name: 'New' }),
    update: vi.fn().mockResolvedValue({ id: '1', name: 'Updated' }),
    delete: vi.fn().mockResolvedValue(undefined),
    patch: vi.fn().mockResolvedValue({}),
    action: vi.fn().mockResolvedValue({}),
    custom: vi.fn().mockResolvedValue({}),
    ...overrides,
  };
  return {
    resource: vi.fn().mockReturnValue(mockResource),
  } as unknown as Client;
}

const testResource = defineResource({
  name: 'posts',
  endpoint: '/posts',
  list: { columns: [{ field: 'name', label: 'Name' }] },
});

describe('useResource', () => {
  it('create calls client.resource().create', async () => {
    const client = makeMockClient();
    const res = useResource({ resource: testResource, client });

    const result = await res.create({ name: 'New Post' });

    expect(client.resource).toHaveBeenCalledWith('/posts');
    const mockRes = (client.resource as ReturnType<typeof vi.fn>).mock.results[0].value;
    expect(mockRes.create).toHaveBeenCalledWith({ name: 'New Post' });
    expect(result).toEqual({ id: '2', name: 'New' });
  });

  it('update calls client.resource().update', async () => {
    const client = makeMockClient();
    const res = useResource({ resource: testResource, client });

    const result = await res.update('1', { name: 'Updated Post' });

    const mockRes = (client.resource as ReturnType<typeof vi.fn>).mock.results[0].value;
    expect(mockRes.update).toHaveBeenCalledWith('1', { name: 'Updated Post' });
    expect(result).toEqual({ id: '1', name: 'Updated' });
  });

  it('destroy calls client.resource().delete', async () => {
    const client = makeMockClient();
    const res = useResource({ resource: testResource, client });

    await res.destroy('1');

    const mockRes = (client.resource as ReturnType<typeof vi.fn>).mock.results[0].value;
    expect(mockRes.delete).toHaveBeenCalledWith('1');
  });

  it('beforeCreate hook is called before create', async () => {
    const beforeCreate = vi.fn().mockImplementation((data) => ({ ...data as object, processed: true }));
    const resource = defineResource({
      name: 'posts',
      endpoint: '/posts',
      list: { columns: [] },
      hooks: { beforeCreate },
    });
    const client = makeMockClient();
    const res = useResource({ resource, client });

    await res.create({ name: 'Test' });

    expect(beforeCreate).toHaveBeenCalledWith({ name: 'Test' });
    const mockRes = (client.resource as ReturnType<typeof vi.fn>).mock.results[0].value;
    expect(mockRes.create).toHaveBeenCalledWith({ name: 'Test', processed: true });
  });

  it('afterCreate hook is called after create', async () => {
    const afterCreate = vi.fn();
    const resource = defineResource({
      name: 'posts',
      endpoint: '/posts',
      list: { columns: [] },
      hooks: { afterCreate },
    });
    const client = makeMockClient();
    const res = useResource({ resource, client });

    await res.create({ name: 'Test' });

    expect(afterCreate).toHaveBeenCalledWith({ id: '2', name: 'New' });
  });

  it('beforeEdit hook is called before update', async () => {
    const beforeEdit = vi.fn().mockImplementation((data) => ({ ...data as object, edited: true }));
    const resource = defineResource({
      name: 'posts',
      endpoint: '/posts',
      list: { columns: [] },
      hooks: { beforeEdit },
    });
    const client = makeMockClient();
    const res = useResource({ resource, client });

    await res.update('1', { name: 'Updated' });

    expect(beforeEdit).toHaveBeenCalledWith({ name: 'Updated' });
    const mockRes = (client.resource as ReturnType<typeof vi.fn>).mock.results[0].value;
    expect(mockRes.update).toHaveBeenCalledWith('1', { name: 'Updated', edited: true });
  });

  it('afterEdit hook is called after update', async () => {
    const afterEdit = vi.fn();
    const resource = defineResource({
      name: 'posts',
      endpoint: '/posts',
      list: { columns: [] },
      hooks: { afterEdit },
    });
    const client = makeMockClient();
    const res = useResource({ resource, client });

    await res.update('1', { name: 'Updated' });

    expect(afterEdit).toHaveBeenCalledWith({ id: '1', name: 'Updated' });
  });

  it('beforeDestroy returning false cancels the operation', async () => {
    const beforeDestroy = vi.fn().mockResolvedValue(false);
    const resource = defineResource({
      name: 'posts',
      endpoint: '/posts',
      list: { columns: [] },
      hooks: { beforeDestroy },
    });
    const client = makeMockClient();
    const res = useResource({ resource, client });

    await res.destroy('1');

    const mockRes = (client.resource as ReturnType<typeof vi.fn>).mock.results[0].value;
    expect(mockRes.delete).not.toHaveBeenCalled();
  });

  it('beforeDestroy returning true allows the operation', async () => {
    const beforeDestroy = vi.fn().mockResolvedValue(true);
    const resource = defineResource({
      name: 'posts',
      endpoint: '/posts',
      list: { columns: [] },
      hooks: { beforeDestroy },
    });
    const client = makeMockClient();
    const res = useResource({ resource, client });

    await res.destroy('1');

    const mockRes = (client.resource as ReturnType<typeof vi.fn>).mock.results[0].value;
    expect(mockRes.delete).toHaveBeenCalledWith('1');
  });

  it('afterDestroy hook is called after destroy', async () => {
    const afterDestroy = vi.fn();
    const resource = defineResource({
      name: 'posts',
      endpoint: '/posts',
      list: { columns: [] },
      hooks: { afterDestroy },
    });
    const client = makeMockClient();
    const res = useResource({ resource, client });

    await res.destroy('42');

    expect(afterDestroy).toHaveBeenCalledWith('42');
  });

  it('sets error signal on create failure', async () => {
    const client = makeMockClient({
      create: vi.fn().mockRejectedValue(new Error('Server error')),
    });
    const res = useResource({ resource: testResource, client });

    await expect(res.create({})).rejects.toThrow('Server error');
    expect(res.error()?.message).toBe('Server error');
  });

  it('sets loading to true during async operation', async () => {
    let resolveCreate!: (v: unknown) => void;
    const client = makeMockClient({
      create: vi.fn().mockReturnValue(new Promise(r => { resolveCreate = r; })),
    });
    const res = useResource({ resource: testResource, client });

    expect(res.loading()).toBe(false);
    const createPromise = res.create({});
    expect(res.loading()).toBe(true);
    resolveCreate({ id: '1' });
    await createPromise;
    expect(res.loading()).toBe(false);
  });
});
