/**
 * LiteForge createApp
 *
 * Central app bootstrap: mounts root component, initializes stores,
 * sets up context, router, plugins, and debug utilities.
 */

import type { 
  AppConfig, 
  AppInstance, 
  ComponentInstance, 
  ComponentFactory,
  AnyStore,
} from './types.js';
import { initAppContext, clearContext, use } from './context.js';
import { isComponentFactory } from './component.js';
import { getHMRHandler } from './hmr.js';

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
// createApp Implementation
// ============================================================================

/**
 * Create and bootstrap a LiteForge application.
 *
 * This is an async function that:
 * 1. Resolves the target element
 * 2. Builds the app context (custom context + router + stores)
 * 3. Runs plugin beforeInit hooks
 * 4. Initializes stores (calls initialize() if present)
 * 5. Starts the router (if present)
 * 6. Mounts the root component
 * 7. Runs plugin afterMount hooks
 * 8. Sets up debug utilities (if debug mode)
 * 9. Calls onReady callback
 *
 * @param config - Application configuration
 * @returns Promise resolving to the app instance
 *
 * @example
 * ```ts
 * const app = await createApp({
 *   root: App,
 *   target: '#app',
 *   router: createAppRouter(),
 *   stores: [authStore, uiStore],
 *   context: { api: createApiClient() },
 *   debug: true,
 * });
 * ```
 */
export async function createApp(config: AppConfig): Promise<AppInstance> {
  let rootInstance: ComponentInstance | null = null;
  let rootNode: Node | null = null;
  let targetElement: HTMLElement | null = null;
  let isMounted = false;
  const appContext: Record<string, unknown> = {};
  const storesMap: Record<string, AnyStore> = {};

  // Determine debug mode (auto-detect from Vite's import.meta.env.DEV)
  const isDebug = config.debug ?? 
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
      appContext.router = config.router;
    }

    // 2c. Stores - register under $name and with store: prefix
    if (config.stores) {
      for (const store of config.stores) {
        storesMap[store.$name] = store;
        appContext[`store:${store.$name}`] = store;
        // Also register directly by name for convenience
        appContext[store.$name] = store;
      }
    }

    // 2d. Plugin provide values
    if (config.plugins) {
      for (const plugin of config.plugins) {
        if (plugin.provide) {
          Object.assign(appContext, plugin.provide);
        }
      }
    }

    // ========================================
    // 3. Plugin beforeInit hooks
    // ========================================
    if (config.plugins) {
      for (const plugin of config.plugins) {
        if (plugin.beforeInit) {
          await plugin.beforeInit({ context: appContext });
        }
      }
    }

    // Initialize app-level context (makes use() work)
    initAppContext(appContext);

    // ========================================
    // 4. Initialize stores
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
    // 5. Start router
    // ========================================
    if (config.router && 'start' in config.router && typeof config.router.start === 'function') {
      if (isDebug) {
        console.log('[LiteForge] Starting router...');
      }
      await config.router.start();
    }

    // ========================================
    // 6. Mount root component
    // ========================================
    const rootConfig = config.root;
    
    if (isComponentFactory(rootConfig)) {
      // It's a ComponentFactory from createComponent()
      rootInstance = (rootConfig as ComponentFactory<Record<string, unknown>>)({});
      rootInstance.mount(targetElement);
    } else {
      // It's a simple render function () => Node
      rootNode = (rootConfig as () => Node)();
      targetElement.appendChild(rootNode);
    }

    isMounted = true;

    // ========================================
    // 7. Plugin afterMount hooks
    // ========================================
    // Create app instance first so plugins can use it
    // Note: We build the object conditionally to satisfy exactOptionalPropertyTypes
    const app: AppInstance = Object.assign(
      {
        unmount,
        use: createAppUse(appContext),
        stores: storesMap,
      },
      config.router ? { router: config.router } : {}
    );

    if (config.plugins) {
      for (const plugin of config.plugins) {
        if (plugin.afterMount) {
          await plugin.afterMount(app);
        }
      }
    }

    // ========================================
    // 8. Debug utilities
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
    // 8b. HMR support
    // ========================================
    const hmrHandler = getHMRHandler();
    if (hmrHandler) {
      // Set up full app re-render for HMR fallback
      hmrHandler.fullRerender = () => {
        console.log('[LiteForge HMR] Full app re-render');
        
        // Unmount current root
        if (rootInstance) {
          rootInstance.unmount();
          rootInstance = null;
        }
        if (rootNode && rootNode.parentNode) {
          rootNode.parentNode.removeChild(rootNode);
          rootNode = null;
        }
        
        // Re-mount root component
        if (targetElement) {
          if (isComponentFactory(config.root)) {
            rootInstance = (config.root as ComponentFactory<Record<string, unknown>>)({});
            rootInstance.mount(targetElement);
          } else {
            rootNode = (config.root as () => Node)();
            targetElement.appendChild(rootNode);
          }
        }
      };
    }

    // ========================================
    // 9. onReady callback
    // ========================================
    if (config.onReady) {
      config.onReady(app);
    }

    return app;

  } catch (error) {
    // Handle bootstrap errors
    const err = error instanceof Error ? error : new Error(String(error));
    
    if (config.onError) {
      config.onError(err);
    }
    
    // Re-throw so the promise rejects
    throw err;
  }

  // ========================================
  // Internal Functions
  // ========================================

  function unmount(): void {
    if (!isMounted) return;

    // Plugin beforeUnmount hooks
    if (config.plugins) {
      for (const plugin of config.plugins) {
        if (plugin.beforeUnmount) {
          const appForPlugin: AppInstance = Object.assign(
            {
              unmount,
              use: createAppUse(appContext),
              stores: storesMap,
            },
            config.router ? { router: config.router } : {}
          );
          plugin.beforeUnmount(appForPlugin);
        }
      }
    }

    // Unmount root component
    if (rootInstance) {
      rootInstance.unmount();
      rootInstance = null;
    }

    // Remove simple render function node
    if (rootNode && rootNode.parentNode) {
      rootNode.parentNode.removeChild(rootNode);
      rootNode = null;
    }

    // Clear target element
    if (targetElement) {
      targetElement.innerHTML = '';
    }

    // Stop router
    if (config.router && 'stop' in config.router && typeof config.router.stop === 'function') {
      config.router.stop();
    }

    // Remove debug utilities from window
    if (typeof window !== 'undefined' && '$lf' in window) {
      delete (window as unknown as Record<string, unknown>).$lf;
    }

    // Clear context
    clearContext();

    isMounted = false;
  }
}

/**
 * Create a bound use() function for the app instance.
 * This allows accessing context from outside components.
 */
function createAppUse(appContext: Record<string, unknown>) {
  return function appUse<T = unknown>(key: string): T {
    if (key in appContext) {
      return appContext[key] as T;
    }
    // Fall back to global use() which checks the context stack
    return use<T>(key);
  };
}
