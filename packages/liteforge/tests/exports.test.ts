import { describe, it, expect } from 'vitest';

describe('liteforge/index — core + runtime exports', () => {
  it('exports signal, computed, effect from core', async () => {
    const mod = await import('../src/index.ts');
    expect(typeof mod.signal).toBe('function');
    expect(typeof mod.computed).toBe('function');
    expect(typeof mod.effect).toBe('function');
  });

  it('exports createApp, createComponent from runtime', async () => {
    const mod = await import('../src/index.ts');
    expect(typeof mod.createApp).toBe('function');
    expect(typeof mod.createComponent).toBe('function');
  });

  it('exports Show, For, Switch from runtime', async () => {
    const mod = await import('../src/index.ts');
    expect(typeof mod.Show).toBe('function');
    expect(typeof mod.For).toBe('function');
    expect(typeof mod.Switch).toBe('function');
  });
});

describe('liteforge/router exports', () => {
  it('exports routerPlugin and createRouter', async () => {
    const mod = await import('../src/router.ts');
    expect(typeof mod.routerPlugin).toBe('function');
    expect(typeof mod.createRouter).toBe('function');
  });
});

describe('liteforge/store exports', () => {
  it('exports defineStore', async () => {
    const mod = await import('../src/store.ts');
    expect(typeof mod.defineStore).toBe('function');
  });
});

describe('liteforge/query exports', () => {
  it('exports queryPlugin, createQuery, createMutation', async () => {
    const mod = await import('../src/query.ts');
    expect(typeof mod.queryPlugin).toBe('function');
    expect(typeof mod.createQuery).toBe('function');
    expect(typeof mod.createMutation).toBe('function');
  });
});

describe('liteforge/client exports', () => {
  it('exports clientPlugin, createClient', async () => {
    const mod = await import('../src/client.ts');
    expect(typeof mod.clientPlugin).toBe('function');
    expect(typeof mod.createClient).toBe('function');
  });
});

describe('liteforge/modal exports', () => {
  it('exports modalPlugin, createModal, confirm', async () => {
    const mod = await import('../src/modal.ts');
    expect(typeof mod.modalPlugin).toBe('function');
    expect(typeof mod.createModal).toBe('function');
    expect(typeof mod.confirm).toBe('function');
  });
});

describe('liteforge/form exports', () => {
  it('exports createForm', async () => {
    const mod = await import('../src/form.ts');
    expect(typeof mod.createForm).toBe('function');
  });
});

describe('liteforge/table exports', () => {
  it('exports createTable', async () => {
    const mod = await import('../src/table.ts');
    expect(typeof mod.createTable).toBe('function');
  });
});

describe('liteforge/calendar exports', () => {
  it('exports createCalendar', async () => {
    const mod = await import('../src/calendar.ts');
    expect(typeof mod.createCalendar).toBe('function');
  });
});

describe('liteforge/devtools exports', () => {
  it('exports devtoolsPlugin', async () => {
    const mod = await import('../src/devtools.ts');
    expect(typeof mod.devtoolsPlugin).toBe('function');
  });
});

describe('liteforge/vite-plugin exports', () => {
  it('exports default (plugin factory)', async () => {
    const mod = await import('../src/vite-plugin.ts');
    expect(typeof mod.default).toBe('function');
  });
});

describe('liteforge/i18n exports', () => {
  it('exports i18nPlugin, createI18n', async () => {
    const mod = await import('../src/i18n.ts');
    expect(typeof mod.i18nPlugin).toBe('function');
    expect(typeof mod.createI18n).toBe('function');
  });
});

describe('liteforge/admin exports', () => {
  it('exports adminPlugin, defineResource', async () => {
    const mod = await import('../src/admin.ts');
    expect(typeof mod.adminPlugin).toBe('function');
    expect(typeof mod.defineResource).toBe('function');
  });
});
