import type { LiteForgePlugin, PluginContext } from '@liteforge/runtime';
import type { Client } from '@liteforge/client';
import type { AdminApi, AdminPluginOptions } from './types.js';
import { resourceRegistry } from './core/registry.js';
import { injectAdminStyles } from './styles.js';
import { configureActivityLog } from './core/activityLog.js';

export function adminPlugin(options?: AdminPluginOptions): LiteForgePlugin {
  return {
    name: 'admin',
    install(context: PluginContext): () => void {
      // Client is optional — resolve gracefully
      let client: Client | undefined;
      try {
        client = context.resolve<Client>('client');
      } catch {
        // no-op: client is optional
      }

      const basePath = options?.basePath ?? '/admin';

      // NOTE: @liteforge/router does NOT support addRoutes() — routes are static.
      // Users must include buildAdminRoutes() output in their createRouter() config.
      // See buildAdminRoutes() export from @liteforge/admin for the routes array.
      //
      // Example setup:
      //   import { buildAdminRoutes } from '@liteforge/admin'
      //   const router = createRouter({
      //     routes: [
      //       ...buildAdminRoutes({ resources, basePath: '/admin', client }),
      //       // your other routes...
      //     ]
      //   })

      if (!options?.unstyled) {
        injectAdminStyles();
      }

      if (options?.logEndpoint) {
        configureActivityLog({ logEndpoint: options.logEndpoint });
      }

      const adminApi: AdminApi = {
        navigate: (path: string) => {
          // Will be a no-op without router; documented pattern uses router plugin
          const router = context.resolve<{ navigate: (p: string) => void }>('router');
          if (router) {
            void router.navigate(path);
          } else {
            console.warn('[admin] navigate() called but no router found in context');
          }
        },
        registry: resourceRegistry,
      };

      context.provide('admin', adminApi);

      // Warn if no resources registered
      if (resourceRegistry.size === 0) {
        console.warn(
          '[liteforge/admin] No resources registered. Call registerResource() or use defineResource() + registerResource() before mounting the app.',
        );
      }

      void basePath;
      void client;

      return () => {};
    },
  };
}

declare module '@liteforge/runtime' {
  interface PluginRegistry {
    admin: AdminApi;
  }
}
