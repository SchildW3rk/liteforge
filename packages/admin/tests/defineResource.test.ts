import { describe, it, expect } from 'vitest';
import { defineResource } from '../src/core/defineResource.js';
import type { AdminAction } from '../src/types.js';

describe('defineResource', () => {
  it('capitalizes name as default label', () => {
    const resource = defineResource({
      name: 'posts',
      endpoint: '/posts',
      list: { columns: [] },
    });
    expect(resource.label).toBe('Posts');
  });

  it('respects custom label', () => {
    const resource = defineResource({
      name: 'posts',
      label: 'Blog Posts',
      endpoint: '/posts',
      list: { columns: [] },
    });
    expect(resource.label).toBe('Blog Posts');
  });

  it('applies all default actions', () => {
    const resource = defineResource({
      name: 'posts',
      endpoint: '/posts',
      list: { columns: [] },
    });
    expect(resource.actions).toEqual(['index', 'show', 'create', 'edit', 'destroy']);
  });

  it('respects custom actions array', () => {
    const actions: AdminAction[] = ['index', 'show'];
    const resource = defineResource({
      name: 'posts',
      endpoint: '/posts',
      actions,
      list: { columns: [] },
    });
    expect(resource.actions).toEqual(['index', 'show']);
  });

  it('freezes the returned object', () => {
    const resource = defineResource({
      name: 'posts',
      endpoint: '/posts',
      list: { columns: [] },
    });
    expect(Object.isFrozen(resource)).toBe(true);
  });

  it('preserves endpoint', () => {
    const resource = defineResource({
      name: 'users',
      endpoint: '/api/v1/users',
      list: { columns: [] },
    });
    expect(resource.endpoint).toBe('/api/v1/users');
  });

  it('preserves list config', () => {
    const columns = [{ field: 'name', label: 'Name' }];
    const resource = defineResource({
      name: 'posts',
      endpoint: '/posts',
      list: { columns, pageSize: 10, searchable: ['name'] },
    });
    expect(resource.list.columns).toBe(columns);
    expect(resource.list.pageSize).toBe(10);
    expect(resource.list.searchable).toEqual(['name']);
  });

  it('preserves hooks', () => {
    const beforeCreate = (data: unknown) => data;
    const resource = defineResource({
      name: 'posts',
      endpoint: '/posts',
      list: { columns: [] },
      hooks: { beforeCreate },
    });
    expect(resource.hooks?.beforeCreate).toBe(beforeCreate);
  });

  it('handles empty string name with capitalize', () => {
    const resource = defineResource({
      name: '',
      endpoint: '/empty',
      list: { columns: [] },
    });
    expect(resource.label).toBe('');
  });

  it('preserves rowActions', () => {
    const rowAction = { label: 'Approve', action: () => {} };
    const resource = defineResource({
      name: 'posts',
      endpoint: '/posts',
      list: { columns: [] },
      rowActions: [rowAction],
    });
    expect(resource.rowActions).toHaveLength(1);
    expect(resource.rowActions![0]).toBe(rowAction);
  });
});
