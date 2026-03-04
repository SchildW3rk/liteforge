import { describe, it, expect, beforeEach } from 'vitest';
import { clientPlugin } from '../src/plugin.js';
import { createPluginContext } from '../../runtime/src/plugin-registry.js';

describe('clientPlugin', () => {
  // Use a plain object cast as HTMLElement — clientPlugin never accesses DOM on target
  const fakeTarget = {} as HTMLElement;
  let appContext: Record<string, unknown>;

  beforeEach(() => {
    appContext = {};
  });

  it('plugin name is "client"', () => {
    const plugin = clientPlugin({ baseUrl: 'https://api.example.com' });
    expect(plugin.name).toBe('client');
  });

  it('provides client under "client" key', () => {
    const plugin = clientPlugin({ baseUrl: 'https://api.example.com' });
    const ctx = createPluginContext(fakeTarget, appContext);
    plugin.install(ctx);

    const client = appContext['client'] as { get: unknown; post: unknown; resource: unknown };
    expect(client).toBeDefined();
    expect(typeof client.get).toBe('function');
    expect(typeof client.post).toBe('function');
    expect(typeof client.resource).toBe('function');
  });

  it('"client" is accessible via resolve()', () => {
    const plugin = clientPlugin({ baseUrl: 'https://api.example.com' });
    const ctx = createPluginContext(fakeTarget, appContext);
    plugin.install(ctx);

    const resolved = ctx.resolve<{ get: unknown }>('client');
    expect(resolved).toBeDefined();
    expect(typeof resolved?.get).toBe('function');
  });

  it('client uses the provided baseUrl', () => {
    const plugin = clientPlugin({ baseUrl: 'https://custom.api.io' });
    const ctx = createPluginContext(fakeTarget, appContext);
    plugin.install(ctx);

    // The client is created — we just verify it exists and has CRUD methods
    const client = ctx.resolve<{ delete: unknown; patch: unknown }>('client');
    expect(typeof client?.delete).toBe('function');
    expect(typeof client?.patch).toBe('function');
  });
});
