import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { signal } from '@liteforge/core';
import { createApp, createComponent, clearContext } from '../src/index.js';
import type { Plugin, AnyStore } from '../src/index.js';

describe('createApp', () => {
  let container: HTMLElement;

  beforeEach(() => {
    clearContext();
    // Clean up $lf from previous tests
    if (typeof window !== 'undefined' && '$lf' in window) {
      delete (window as unknown as Record<string, unknown>).$lf;
    }
    container = document.createElement('div');
    container.id = 'app';
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (container.parentNode) {
      document.body.removeChild(container);
    }
  });

  describe('basic mounting', () => {
    it('should mount root component to target element', async () => {
      const App = createComponent({
        component: () => document.createTextNode('Hello App'),
      });

      const app = await createApp({
        root: App,
        target: '#app',
      });

      expect(container.textContent).toBe('Hello App');
      app.unmount();
    });

    it('should mount to element reference', async () => {
      const App = createComponent({
        component: () => document.createTextNode('Direct Mount'),
      });

      const app = await createApp({
        root: App,
        target: container,
      });

      expect(container.textContent).toBe('Direct Mount');
      app.unmount();
    });

    it('should accept simple render function as root', async () => {
      const app = await createApp({
        root: () => {
          const el = document.createElement('h1');
          el.textContent = 'Simple Function';
          return el;
        },
        target: '#app',
      });

      expect(container.innerHTML).toContain('Simple Function');
      app.unmount();
    });

    it('should throw if target not found', async () => {
      const App = createComponent({
        component: () => document.createTextNode('Test'),
      });

      await expect(createApp({
        root: App,
        target: '#nonexistent',
      })).rejects.toThrow('Target element "#nonexistent" not found');
    });
  });

  describe('unmount', () => {
    it('should remove content from DOM', async () => {
      const App = createComponent({
        component: () => document.createTextNode('Content'),
      });

      const app = await createApp({
        root: App,
        target: '#app',
      });

      expect(container.textContent).toBe('Content');

      app.unmount();
      expect(container.textContent).toBe('');
    });

    it('should call destroyed on root component', async () => {
      const destroyedSpy = vi.fn();

      const App = createComponent({
        component: () => document.createTextNode('Test'),
        destroyed: destroyedSpy,
      });

      const app = await createApp({
        root: App,
        target: '#app',
      });

      app.unmount();

      expect(destroyedSpy).toHaveBeenCalledTimes(1);
    });

    it('should be safe to call unmount multiple times', async () => {
      const destroyedSpy = vi.fn();

      const App = createComponent({
        component: () => document.createTextNode('Test'),
        destroyed: destroyedSpy,
      });

      const app = await createApp({
        root: App,
        target: '#app',
      });

      app.unmount();
      app.unmount();
      app.unmount();

      expect(destroyedSpy).toHaveBeenCalledTimes(1);
    });

    it('should clean up simple render function nodes', async () => {
      const app = await createApp({
        root: () => {
          const el = document.createElement('div');
          el.textContent = 'Render Function';
          return el;
        },
        target: '#app',
      });

      expect(container.innerHTML).toContain('Render Function');
      app.unmount();
      expect(container.innerHTML).toBe('');
    });
  });

  describe('context', () => {
    it('should provide app-level context', async () => {
      let capturedValue: string | undefined;

      const App = createComponent({
        component: ({ use }) => {
          capturedValue = use('apiUrl');
          return document.createTextNode('Test');
        },
      });

      const app = await createApp({
        root: App,
        target: '#app',
        context: {
          apiUrl: 'https://api.example.com',
        },
      });

      expect(capturedValue).toBe('https://api.example.com');
      app.unmount();
    });

    it('should provide use() method on app instance', async () => {
      const App = createComponent({
        component: () => document.createTextNode('Test'),
      });

      const app = await createApp({
        root: App,
        target: '#app',
        context: {
          theme: 'dark',
        },
      });

      expect(app.use('theme')).toBe('dark');
      app.unmount();
    });

    it('should support signal values in context', async () => {
      const theme = signal('light');

      const App = createComponent({
        component: ({ use }) => {
          const themeSignal = use<typeof theme>('theme');
          return document.createTextNode(themeSignal());
        },
      });

      const app = await createApp({
        root: App,
        target: '#app',
        context: { theme },
      });

      expect(container.textContent).toBe('light');
      app.unmount();
    });

    it('should make router available via use("router")', async () => {
      const mockRouter = { 
        navigate: () => {}, 
        path: () => '/',
      };

      const app = await createApp({
        root: () => document.createElement('div'),
        target: container,
        router: mockRouter,
      });

      expect(app.use('router')).toBe(mockRouter);
      expect(app.router).toBe(mockRouter);
      app.unmount();
    });
  });

  describe('stores', () => {
    it('should register stores in context', async () => {
      const testStore: AnyStore = {
        $name: 'test',
        $reset: () => {},
        $snapshot: () => ({}),
        $restore: () => {},
      };

      let capturedStore: unknown;

      const App = createComponent({
        component: ({ use }) => {
          capturedStore = use('store:test');
          return document.createTextNode('Test');
        },
      });

      const app = await createApp({
        root: App,
        target: '#app',
        stores: [testStore],
      });

      expect(capturedStore).toBe(testStore);
      expect(app.stores.test).toBe(testStore);
      app.unmount();
    });

    it('should also register stores directly by name', async () => {
      const testStore: AnyStore = {
        $name: 'myStore',
        $reset: () => {},
        $snapshot: () => ({}),
        $restore: () => {},
      };

      let capturedStore: unknown;

      const App = createComponent({
        component: ({ use }) => {
          capturedStore = use('myStore');
          return document.createTextNode('Test');
        },
      });

      const app = await createApp({
        root: App,
        target: '#app',
        stores: [testStore],
      });

      expect(capturedStore).toBe(testStore);
      app.unmount();
    });

    it('should call initialize() on stores that have it', async () => {
      let initialized = false;

      const testStore: AnyStore = {
        $name: 'init-test',
        $reset: () => {},
        $snapshot: () => ({ ready: initialized }),
        $restore: () => {},
        initialize: () => {
          initialized = true;
        },
      };

      const app = await createApp({
        root: () => document.createElement('div'),
        target: container,
        stores: [testStore],
      });

      expect(initialized).toBe(true);
      app.unmount();
    });

    it('should await async initialize()', async () => {
      let initOrder: string[] = [];

      const storeA: AnyStore = {
        $name: 'a',
        $reset: () => {},
        $snapshot: () => ({}),
        $restore: () => {},
        initialize: async () => {
          await new Promise(r => setTimeout(r, 10));
          initOrder.push('a');
        },
      };

      const storeB: AnyStore = {
        $name: 'b',
        $reset: () => {},
        $snapshot: () => ({}),
        $restore: () => {},
        initialize: () => {
          initOrder.push('b');
        },
      };

      const app = await createApp({
        root: () => document.createElement('div'),
        target: container,
        stores: [storeA, storeB],
      });

      // storeA should initialize first (async), then storeB
      expect(initOrder).toEqual(['a', 'b']);
      app.unmount();
    });

    it('should initialize stores in array order', async () => {
      const order: string[] = [];

      const storeA: AnyStore = {
        $name: 'order-a',
        $reset: () => {},
        $snapshot: () => ({}),
        $restore: () => {},
        initialize: () => { order.push('a'); },
      };

      const storeB: AnyStore = {
        $name: 'order-b',
        $reset: () => {},
        $snapshot: () => ({}),
        $restore: () => {},
        initialize: () => { order.push('b'); },
      };

      const app = await createApp({
        root: () => document.createElement('div'),
        target: container,
        stores: [storeA, storeB],
      });

      expect(order).toEqual(['a', 'b']);
      app.unmount();
    });
  });

  describe('plugins', () => {
    it('should call plugin beforeInit hook', async () => {
      let hookCalled = false;

      const plugin: Plugin = {
        name: 'test',
        beforeInit: () => { hookCalled = true; },
      };

      const app = await createApp({
        root: () => document.createElement('div'),
        target: container,
        plugins: [plugin],
      });

      expect(hookCalled).toBe(true);
      app.unmount();
    });

    it('should call plugin afterMount hook', async () => {
      let hookCalled = false;
      let receivedApp: unknown;

      const plugin: Plugin = {
        name: 'test',
        afterMount: (app) => {
          hookCalled = true;
          receivedApp = app;
        },
      };

      const app = await createApp({
        root: () => document.createElement('div'),
        target: container,
        plugins: [plugin],
      });

      expect(hookCalled).toBe(true);
      expect(receivedApp).toBe(app);
      app.unmount();
    });

    it('should call plugin beforeUnmount hook', async () => {
      let hookCalled = false;

      const plugin: Plugin = {
        name: 'test',
        beforeUnmount: () => { hookCalled = true; },
      };

      const app = await createApp({
        root: () => document.createElement('div'),
        target: container,
        plugins: [plugin],
      });

      expect(hookCalled).toBe(false);
      app.unmount();
      expect(hookCalled).toBe(true);
    });

    it('should merge plugin provide into context', async () => {
      const plugin: Plugin = {
        name: 'toast',
        provide: { toast: { show: () => {} } },
      };

      const app = await createApp({
        root: () => document.createElement('div'),
        target: container,
        plugins: [plugin],
      });

      expect(app.use('toast')).toBeDefined();
      app.unmount();
    });

    it('should await async plugin hooks', async () => {
      let initDone = false;
      let mountDone = false;

      const plugin: Plugin = {
        name: 'async-plugin',
        beforeInit: async () => {
          await new Promise(r => setTimeout(r, 10));
          initDone = true;
        },
        afterMount: async () => {
          await new Promise(r => setTimeout(r, 10));
          mountDone = true;
        },
      };

      const app = await createApp({
        root: () => document.createElement('div'),
        target: container,
        plugins: [plugin],
      });

      expect(initDone).toBe(true);
      expect(mountDone).toBe(true);
      app.unmount();
    });
  });

  describe('debug mode', () => {
    it('should set $lf on window when debug is true', async () => {
      const app = await createApp({
        root: () => document.createElement('div'),
        target: container,
        debug: true,
      });

      expect((window as unknown as { $lf: unknown }).$lf).toBeDefined();
      app.unmount();
    });

    it('should NOT set $lf on window when debug is false', async () => {
      // Clean up from previous tests
      delete (window as unknown as Record<string, unknown>).$lf;

      const app = await createApp({
        root: () => document.createElement('div'),
        target: container,
        debug: false,
      });

      expect((window as unknown as { $lf?: unknown }).$lf).toBeUndefined();
      app.unmount();
    });

    it('should remove $lf from window on unmount', async () => {
      const app = await createApp({
        root: () => document.createElement('div'),
        target: container,
        debug: true,
      });

      expect((window as unknown as { $lf?: unknown }).$lf).toBeDefined();
      app.unmount();
      expect((window as unknown as { $lf?: unknown }).$lf).toBeUndefined();
    });

    it('should provide snapshot function in debug utils', async () => {
      const testStore: AnyStore = {
        $name: 'debug-test',
        $reset: () => {},
        $snapshot: () => ({ count: 42 }),
        $restore: () => {},
      };

      const app = await createApp({
        root: () => document.createElement('div'),
        target: container,
        stores: [testStore],
        debug: true,
      });

      const $lf = (window as unknown as { $lf: { snapshot: () => unknown } }).$lf;
      expect($lf.snapshot()).toEqual({ 'debug-test': { count: 42 } });
      app.unmount();
    });
  });

  describe('callbacks', () => {
    it('should call onReady after mount', async () => {
      let ready = false;
      let receivedApp: unknown;

      const app = await createApp({
        root: () => document.createElement('div'),
        target: container,
        onReady: (a) => {
          ready = true;
          receivedApp = a;
        },
      });

      expect(ready).toBe(true);
      expect(receivedApp).toBe(app);
      app.unmount();
    });

    it('should call onError on bootstrap failure', async () => {
      let caughtError: Error | null = null;

      await createApp({
        root: () => { throw new Error('Component failed'); },
        target: '#nonexistent-target',
        onError: (err) => { caughtError = err; },
      }).catch(() => {});

      expect(caughtError).not.toBeNull();
    });
  });

  describe('router integration', () => {
    it('should call router.start() if present', async () => {
      let started = false;

      const mockRouter = {
        navigate: () => {},
        path: () => '/',
        start: () => { started = true; },
      };

      const app = await createApp({
        root: () => document.createElement('div'),
        target: container,
        router: mockRouter,
      });

      expect(started).toBe(true);
      app.unmount();
    });

    it('should call router.stop() on unmount if present', async () => {
      let stopped = false;

      const mockRouter = {
        navigate: () => {},
        path: () => '/',
        stop: () => { stopped = true; },
      };

      const app = await createApp({
        root: () => document.createElement('div'),
        target: container,
        router: mockRouter,
      });

      expect(stopped).toBe(false);
      app.unmount();
      expect(stopped).toBe(true);
    });
  });
});
