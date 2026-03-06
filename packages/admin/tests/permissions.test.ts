import { describe, it, expect } from 'vitest';
import { defineResource } from '../src/core/defineResource.js';
import type { ResourcePermissions } from '../src/types.js';

describe('permissions in defineResource', () => {
  it('permissions field is undefined when not provided', () => {
    const r = defineResource({ name: 'posts', endpoint: '/posts', list: { columns: [] } });
    expect(r.permissions).toBeUndefined();
  });

  it('permissions field is passed through correctly', () => {
    const permissions: ResourcePermissions<{ id: string; status: string }> = {
      canCreate: false,
      canEdit: (record) => record.status === 'draft',
      canDestroy: (record) => record.status === 'draft',
    };
    const r = defineResource({ name: 'posts', endpoint: '/posts', list: { columns: [] }, permissions });
    expect(r.permissions).toBeDefined();
    expect(r.permissions?.canCreate).toBe(false);
    expect(typeof r.permissions?.canEdit).toBe('function');
    expect(typeof r.permissions?.canDestroy).toBe('function');
  });

  it('canCreate: false evaluates to false', () => {
    const r = defineResource({ name: 'users', endpoint: '/users', list: { columns: [] }, permissions: { canCreate: false } });
    const perm = r.permissions?.canCreate;
    const result = typeof perm === 'function' ? perm() : perm;
    expect(result).toBe(false);
  });

  it('canCreate: true evaluates to true', () => {
    const r = defineResource({ name: 'posts', endpoint: '/posts', list: { columns: [] }, permissions: { canCreate: true } });
    const perm = r.permissions?.canCreate;
    const result = typeof perm === 'function' ? perm() : perm;
    expect(result).toBe(true);
  });

  it('canEdit row-level callback: returns true for matching record', () => {
    const r = defineResource<{ id: string; status: string }>({
      name: 'posts',
      endpoint: '/posts',
      list: { columns: [] },
      permissions: { canEdit: (rec) => rec.status === 'draft' },
    });
    const fn = r.permissions?.canEdit;
    expect(typeof fn).toBe('function');
    if (typeof fn === 'function') {
      expect(fn({ id: '1', status: 'draft' })).toBe(true);
      expect(fn({ id: '1', status: 'published' })).toBe(false);
    }
  });

  it('canView: undefined = allowed by default', () => {
    const r = defineResource({ name: 'posts', endpoint: '/posts', list: { columns: [] }, permissions: {} });
    expect(r.permissions?.canView).toBeUndefined();
  });

  it('all permissions are frozen with the resource object', () => {
    const r = defineResource({ name: 'posts', endpoint: '/posts', list: { columns: [] }, permissions: { canCreate: true } });
    expect(Object.isFrozen(r)).toBe(true);
  });

  it('canDestroy: false prevents deletion for all records', () => {
    const r = defineResource<{ id: string }>({
      name: 'posts',
      endpoint: '/posts',
      list: { columns: [] },
      permissions: { canDestroy: false },
    });
    const fn = r.permissions?.canDestroy;
    expect(fn).toBe(false);
  });

  it('canCreate: () => boolean is preserved as function', () => {
    const fn = () => true;
    const r = defineResource({ name: 'posts', endpoint: '/posts', list: { columns: [] }, permissions: { canCreate: fn } });
    expect(r.permissions?.canCreate).toBe(fn);
    expect((r.permissions?.canCreate as () => boolean)()).toBe(true);
  });
});
