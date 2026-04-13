/**
 * @liteforge/router — routerPlugin
 *
 * Wraps a Router instance (or RouterOptions) as a formal LiteForgePlugin.
 * Registers the router under the 'router' key in the app context and
 * triggers initial navigation as part of the plugin lifecycle.
 */

import type { LiteForgePlugin, PluginContext } from '@liteforge/runtime';
import type { Router, RouterOptions } from './types.js';
import { createRouter } from './router.js';

function isRouter(input: RouterOptions | Router): input is Router {
  return 'navigate' in input && typeof (input as unknown as Record<string, unknown>).navigate === 'function';
}

/**
 * Create a router plugin from either:
 * - `RouterOptions` — the plugin creates a router internally
 * - An existing `Router` instance — for cases where the router is built externally
 *   (e.g. `createAppRouter()` factory that registers guards/middleware)
 */
export function routerPlugin(optionsOrRouter: RouterOptions | Router): LiteForgePlugin {
  const router = isRouter(optionsOrRouter)
    ? optionsOrRouter
    : createRouter(optionsOrRouter);

  return {
    name: 'router',
    async install(context: PluginContext): Promise<() => void> {
      context.provide('router', router);

      // Wait for the initial navigation (including guards) to complete before
      // the app mounts. This prevents authenticated routes from rendering
      // before the auth guard has a chance to redirect.
      await router.isReady;

      return () => {
        router.destroy();
      };
    },
  };
}

declare module '@liteforge/runtime' {
  interface PluginRegistry {
    router: Router;
  }
}
