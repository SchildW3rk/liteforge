/**
 * LiteForge createApp
 *
 * Central app bootstrap: mounts root component, initializes stores,
 * sets up context, router, plugins, and debug utilities.
 *
 * Returns an AppBuilder that supports chained .use(plugin).mount().
 * The AppBuilder is also a Thenable, so `await createApp(...)` works
 * without an explicit .mount() call (backward compat).
 */

import type {
  AppConfig,
  AppInstance,
  AppBuilder,
  LiteForgePlugin,
  ComponentInstance,
  ComponentFactoryInternal,
  AnyStore,
} from './types.js';

import { initAppContext, clearContext, use } from './context.js';
import { isComponentFactory } from './component.js';
import { getHMRHandler } from './hmr.js';
import { createPluginContext } from './plugin-registry.js';

// ============================================================================
// Debug Utilities Type
// ============================================================================

interface DebugUtilities {
  router: AppConfig['router'];
  stores: Record<string, AnyStore>;
  snapshot: () => Record<string, Record<string, unknown>>;
  unmount: () => void;
  context: Record<string, unknown>;
}

// ============================================================================
// createApp — returns AppBuilder
// ============================================================================

/**
 * Create and bootstrap a LiteForge application.
 *
 * Returns an AppBuilder with:
 * - `.use(plugin)` — register a new-style LiteForgePlugin (chainable)
 * - `.mount()` — async, performs full bootstrap
 * - `.then()` — Thenable for `await createApp(...)` backward compat
 *
 * @example
 * ```ts
 * // New pattern:
 * const app = await createApp({ root: App, target: '#app' })
 *   .use(routerPlugin(options))
 *   .use(modalPlugin())
 *   .mount();
 *
 * // Old pattern (still works):
 * const app = await createApp({ root: App, target: '#app', plugins: [devtoolsPlugin()] });
 * ```
 */
export function createApp(config: AppConfig): AppBuilder {
  const newStylePlugins: LiteForgePlugin[] = [];
  const pendingDevPlugins: Array<Promise<LiteForgePlugin>> = [];
  let mountCalled = false;

  const builder: AppBuilder = {
    use(plugin: LiteForgePlugin): AppBuilder {
      if (mountCalled) {
        throw new Error(
          `[LiteForge] Cannot call .use() after .mount() — plugin "${plugin.name}" added too late.`,
        );
      }
      newStylePlugins.push(plugin);
      return builder;
    },

    useDev(factory: () => Promise<LiteForgePlugin>): AppBuilder {
      if (mountCalled) {
        throw new Error('[LiteForge] Cannot call .useDev() after .mount().');
      }
      // import.meta.env.DEV is statically replaced by Vite to `true`/`false`.
      // The optional chain guards against non-Vite environments (Node, Vitest).
      const isDev = (import.meta.env as { DEV?: boolean } | undefined)?.DEV !== false;
      if (isDev) {
        pendingDevPlugins.push(factory());
      }
      return builder;
    },

    mount(): Promise<AppInstance> {
      if (mountCalled) {
        throw new Error('[LiteForge] .mount() has already been called.');
      }
      mountCalled = true;
      return Promise.all(pendingDevPlugins).then(devPlugins => {
        return installAndMount(config, [...newStylePlugins, ...devPlugins]);
      });
    },

    then<TResult1 = AppInstance, TResult2 = never>(
      onfulfilled?: ((value: AppInstance) => TResult1 | PromiseLike<TResult1>) | null,
      onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
    ): Promise<TResult1 | TResult2> {
      return builder.mount().then(onfulfilled, onrejected);
    },

    catch<TResult = never>(
      onrejected?: ((reason: unknown) => TResult | PromiseLike<TResult>) | null,
    ): Promise<AppInstance | TResult> {
      return builder.mount().catch(onrejected);
    },
  };

  return builder;
}

// ============================================================================
// installAndMount — the full bootstrap logic
// ============================================================================

async function installAndMount(
  config: AppConfig,
  newStylePlugins: LiteForgePlugin[],
): Promise<AppInstance> {
  let rootInstance: ComponentInstance | null = null;
  let rootNode: Node | null = null;
  let targetElement: HTMLElement | null = null;
  let isMounted = false;
  const appContext: Record<string, unknown> = {};
  const storesMap: Record<string, AnyStore> = {};
  const pluginCleanups: Array<() => void> = [];

  // Determine debug mode
  const isDebug =
    config.debug ??
    (typeof globalThis !== 'undefined' &&
      (globalThis as { __DEV__?: boolean }).__DEV__ === true);

  try {
    // ========================================
    // 1. Resolve target element
    // ========================================
    if (typeof config.target === 'string') {
      targetElement = document.querySelector(config.target);
      if (!targetElement) {
        throw new Error(`Target element "${config.target}" not found`);
      }
    } else {
      targetElement = config.target;
    }

    // ========================================
    // 2. Build app context
    // ========================================

    // 2a. Custom context values
    if (config.context) {
      Object.assign(appContext, config.context);
    }

    // 2b. Router
    if (config.router) {
      appContext['router'] = config.router;
    }

    // 2c. Stores
    if (config.stores) {
      for (const store of config.stores) {
        storesMap[store.$name] = store;
        appContext[`store:${store.$name}`] = store;
        appContext[store.$name] = store;
      }
    }

    // ========================================
    // 3. Duplicate-check all plugin names BEFORE any install()
    // ========================================
    const seenNames = new Set<string>();
    for (const plugin of newStylePlugins) {
      if (seenNames.has(plugin.name)) {
        throw new Error(
          `[LiteForge] Duplicate plugin name: "${plugin.name}". Each plugin must have a unique name.`,
        );
      }
      seenNames.add(plugin.name);
    }

    // ========================================
    // 4. LiteForgePlugin install()
    //    On failure: run collected cleanups in reverse, then re-throw.
    // ========================================
    const pluginCtx = createPluginContext(targetElement, appContext);

    for (const plugin of newStylePlugins) {
      try {
        const result = await plugin.install(pluginCtx);
        if (typeof result === 'function') {
          pluginCleanups.push(result);
        }
      } catch (err) {
        // Run cleanups for already-installed plugins in reverse
        for (let i = pluginCleanups.length - 1; i >= 0; i--) {
          try { pluginCleanups[i]!(); } catch { /* ignore cleanup errors */ }
        }
        throw err;
      }
    }

    // ========================================
    // 6. Initialize app-level context
    // ========================================
    initAppContext(appContext);

    // ========================================
    // 7. Initialize stores
    // ========================================
    if (config.stores) {
      for (const store of config.stores) {
        if ('initialize' in store && typeof store.initialize === 'function') {
          if (isDebug) {
            console.log(`[LiteForge] Initializing store: ${store.$name}`);
          }
          await store.initialize();
        }
      }
    }

    // ========================================
    // 8. Start router
    // ========================================
    if (
      config.router &&
      'start' in config.router &&
      typeof config.router.start === 'function'
    ) {
      if (isDebug) {
        console.log('[LiteForge] Starting router...');
      }
      await config.router.start();
    }

    // ========================================
    // 9. Mount root component
    // ========================================
    const rootConfig = config.root;

    if (isComponentFactory(rootConfig)) {
      rootInstance = (rootConfig as unknown as ComponentFactoryInternal)({});
      rootInstance.mount(targetElement);
    } else {
      rootNode = (rootConfig as () => Node)();
      targetElement.appendChild(rootNode);
    }

    isMounted = true;

    // ========================================
    // 10. Build app instance
    // ========================================
    const app: AppInstance = Object.assign(
      {
        unmount,
        use: createAppUse(appContext),
        stores: storesMap,
      },
      config.router ? { router: config.router } : {},
    );

    // ========================================
    // 11. Debug utilities
    // ========================================
    if (isDebug && typeof window !== 'undefined') {
      const debugUtils: DebugUtilities = {
        router: config.router,
        stores: storesMap,
        snapshot: () => {
          const result: Record<string, Record<string, unknown>> = {};
          for (const [name, store] of Object.entries(storesMap)) {
            result[name] = store.$snapshot();
          }
          return result;
        },
        unmount: () => app.unmount(),
        context: appContext,
      };

      Object.defineProperty(window, '$lf', {
        value: debugUtils,
        configurable: true,
        writable: false,
      });

      console.log('='.repeat(50));
      console.log('[LiteForge] Application started in debug mode');
      console.log('  $lf.stores    — Store instances');
      console.log('  $lf.router    — Router instance');
      console.log('  $lf.snapshot()— Full state snapshot');
      console.log('  $lf.context   — App context');
      console.log('  $lf.unmount() — Unmount app');
      console.log('='.repeat(50));
    }

    // ========================================
    // 12b. HMR support
    // ========================================
    const hmrHandler = getHMRHandler();
    if (hmrHandler) {
      hmrHandler.fullRerender = () => {
        console.log('[LiteForge HMR] 🔄 Full app re-render (stores + router preserved)');
        if (typeof window !== 'undefined') {
          if (window.__LITEFORGE_HMR_COOLDOWN__ !== undefined) {
            clearTimeout(window.__LITEFORGE_HMR_COOLDOWN__);
          }
          window.__LITEFORGE_HMR_COOLDOWN__ = setTimeout(() => {
            delete window.__LITEFORGE_HMR_COOLDOWN__;
          }, 200);
        }

        const scrollX = window.scrollX;
        const scrollY = window.scrollY;

        if (rootInstance) {
          rootInstance.unmount();
          rootInstance = null;
        }
        if (rootNode && rootNode.parentNode) {
          rootNode.parentNode.removeChild(rootNode);
          rootNode = null;
        }

        if (targetElement) {
          if (isComponentFactory(config.root)) {
            rootInstance = (config.root as unknown as ComponentFactoryInternal)({});
            rootInstance.mount(targetElement);
          } else {
            rootNode = (config.root as () => Node)();
            targetElement.appendChild(rootNode);
          }
        }

        requestAnimationFrame(() => { window.scrollTo(scrollX, scrollY); });
      };
    }

    // ========================================
    // 13. onReady callback
    // ========================================
    if (config.onReady) {
      config.onReady(app);
    }

    return app;
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));

    if (config.onError) {
      config.onError(err);
    }

    throw err;
  }

  // ============================================================================
  // Internal Functions
  // ============================================================================

  function unmount(): void {
    if (!isMounted) return;

    // Plugin cleanups in REVERSE order
    for (let i = pluginCleanups.length - 1; i >= 0; i--) {
      try { pluginCleanups[i]!(); } catch { /* ignore cleanup errors */ }
    }

    // Unmount root component
    if (rootInstance) {
      rootInstance.unmount();
      rootInstance = null;
    }

    if (rootNode && rootNode.parentNode) {
      rootNode.parentNode.removeChild(rootNode);
      rootNode = null;
    }

    if (targetElement) {
      targetElement.innerHTML = '';
    }

    // Stop router
    if (
      config.router &&
      'stop' in config.router &&
      typeof config.router.stop === 'function'
    ) {
      config.router.stop();
    }

    // Remove debug utilities from window
    if (typeof window !== 'undefined' && '$lf' in window) {
      delete (window as unknown as Record<string, unknown>).$lf;
    }

    clearContext();
    isMounted = false;
  }
}

// ============================================================================
// Helpers
// ============================================================================

function createAppUse(appContext: Record<string, unknown>) {
  return function appUse<T = unknown>(key: string): T {
    if (key in appContext) {
      return appContext[key] as T;
    }
    return use<T>(key);
  };
}
