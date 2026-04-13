/**
 * LiteForge DevTools Plugin
 *
 * Integrates DevTools with a LiteForge app via the formal LiteForgePlugin interface.
 * Mount via .use(devtoolsPlugin({...})) — registers the panel, keyboard shortcut,
 * and exposes the DevTools API under the 'devtools' key in the plugin registry.
 */

import { enableDebug, disableDebug } from '@liteforge/core';
import type { DebugBus } from '@liteforge/core';
import { storeRegistry } from '@liteforge/store';
import type { LiteForgePlugin, PluginContext } from '@liteforge/runtime';
import { signal, effect } from './internals.js';
import { createEventBuffer } from './buffer.js';
import { createPanel } from './panel/Panel.js';
import type {
  DevToolsConfig,
  DevToolsStore,
  DevToolsStoreMap,
  ResolvedDevToolsConfig,
  DevToolsInstance,
  DevToolsApi,
  EventBuffer,
  PanelState,
  TabId,
} from './types.js';

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: ResolvedDevToolsConfig = {
  shortcut: 'ctrl+shift+d',
  position: 'right',
  defaultTab: 'signals',
  width: 360,
  height: 300,
  maxEvents: 1000,
};

// ============================================================================
// Store types for time-travel functionality
// ============================================================================

/**
 * Store map type for time-travel functionality.
 * Each store must support $snapshot() and $restore().
 */
// ============================================================================
// Plugin Factory
// ============================================================================

/**
 * Create the DevTools plugin for use with the formal plugin system.
 *
 * @param config - Plugin configuration
 * @returns A LiteForgePlugin for use with .use()
 *
 * @example
 * ```ts
 * import { devtoolsPlugin } from '@liteforge/devtools';
 *
 * const app = await createApp({ root: App, target: '#app' })
 *   .use(routerPlugin(createAppRouter()))
 *   .use(modalPlugin())
 *   .use(devtoolsPlugin({ shortcut: 'ctrl+shift+d', position: 'right' }))
 *   .mount();
 * ```
 */
export function devtoolsPlugin(config: DevToolsConfig = {}): LiteForgePlugin {
  const resolvedConfig: ResolvedDevToolsConfig = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  return {
    name: 'devtools',

    install(context: PluginContext): () => void {
      // 1. Enable debug mode and get the bus
      const bus = enableDebug();

      // 2. Create event buffer and subscribe to all debug events
      const buffer = createEventBuffer(resolvedConfig.maxEvents);
      subscribeToAllEvents(bus, buffer);
      discoverExistingStores(buffer);

      // 3. Create panel state signal
      const panelState = signal<PanelState>({
        isOpen: false,
        activeTab: resolvedConfig.defaultTab,
        isPinned: false,
        width: resolvedConfig.width,
        height: resolvedConfig.height,
        isPaused: false,
        filterQuery: '',
      });

      // 4. Gather stores from app context for time-travel (resolve 'stores' context key)
      //    Falls back to empty object if no stores are registered via plugin context.
      const stores = resolveStoresFromContext(context);
      // Merge in any stores explicitly passed via config.stores
      if (config.stores) {
        Object.assign(stores, config.stores);
      }

      // 5. Create DOM container neben #app (nicht auf body)
      const container = document.createElement('div');
      container.id = 'liteforge-devtools-root';
      const parent = context.target.parentElement;
      const next = context.target.nextSibling;
      if (parent) {
        parent.insertBefore(container, next);
      }

      // 6. Create and mount the panel into the container
      const panelElement = createPanel(resolvedConfig, panelState, buffer, stores);
      container.appendChild(panelElement);

      // 7. Reactive visibility effect
      const effectCleanup = effect(() => {
        const state = panelState();
        panelElement.style.transform = getTransform(resolvedConfig.position, state.isOpen);
        panelElement.style.opacity = state.isOpen ? '1' : '0';
        panelElement.style.pointerEvents = state.isOpen ? 'auto' : 'none';
      });

      // 8. Keyboard shortcut
      const keyboardCleanup = setupKeyboardShortcut(
        resolvedConfig.shortcut,
        () => {
          panelState.update((state) => ({ ...state, isOpen: !state.isOpen }));
        },
      );

      // 9. Build and provide the DevTools API
      const api: DevToolsApi = {
        isOpen: () => panelState().isOpen,
        open(): void {
          panelState.update((state) => ({ ...state, isOpen: true }));
        },
        close(): void {
          panelState.update((state) => ({ ...state, isOpen: false }));
        },
        toggle(): void {
          panelState.update((state) => ({ ...state, isOpen: !state.isOpen }));
        },
        selectTab(tab: TabId): void {
          panelState.update((state) => ({ ...state, activeTab: tab }));
        },
      };
      context.provide('devtools', api);

      // 10. Cleanup — called by app.unmount() in reverse plugin order
      return () => {
        keyboardCleanup();
        effectCleanup();
        container.parentNode?.removeChild(container);
        disableDebug();
      };
    },
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Resolve stores from the plugin context for time-travel functionality.
 * The store plugin (if used) may have registered stores under their names.
 * Falls back to storeRegistry to discover all registered stores.
 */
function resolveStoresFromContext(context: PluginContext): DevToolsStoreMap {
  const stores: DevToolsStoreMap = {};

  // Try to discover stores from storeRegistry (always available)
  const storeNames = storeRegistry.list();
  for (const name of storeNames) {
    const inspection = storeRegistry.inspect(name);
    if (inspection && isDevToolsStore(inspection)) {
      stores[name] = inspection;
    }
  }

  // Also check if 'stores' was provided in context (app-level stores map)
  const contextStores = context.resolve<Record<string, unknown>>('stores');
  if (contextStores !== undefined) {
    for (const [key, value] of Object.entries(contextStores)) {
      if (isDevToolsStore(value)) {
        stores[key] = value;
      }
    }
  }

  return stores;
}

/**
 * Type guard: checks if a value satisfies the DevToolsStore interface.
 */
function isDevToolsStore(value: unknown): value is DevToolsStore {
  return (
    value !== null &&
    typeof value === 'object' &&
    typeof (value as Record<string, unknown>)['$name'] === 'string' &&
    typeof (value as Record<string, unknown>)['$snapshot'] === 'function' &&
    typeof (value as Record<string, unknown>)['$restore'] === 'function'
  );
}

/**
 * Subscribe to all debug events and add them to the buffer.
 *
 * We use individual subscriptions for each event type to maintain
 * proper type narrowing without any type assertions.
 */
function subscribeToAllEvents(bus: DebugBus, buffer: EventBuffer): void {
  bus.on('signal:create', (payload) => {
    buffer.push({ type: 'signal:create', payload });
  });
  bus.on('signal:update', (payload) => {
    buffer.push({ type: 'signal:update', payload });
  });
  bus.on('effect:run', (payload) => {
    buffer.push({ type: 'effect:run', payload });
  });
  bus.on('effect:dispose', (payload) => {
    buffer.push({ type: 'effect:dispose', payload });
  });
  bus.on('computed:recalc', (payload) => {
    buffer.push({ type: 'computed:recalc', payload });
  });
  bus.on('store:create', (payload) => {
    buffer.push({ type: 'store:create', payload });
  });
  bus.on('store:stateChange', (payload) => {
    buffer.push({ type: 'store:stateChange', payload });
  });
  bus.on('store:action', (payload) => {
    buffer.push({ type: 'store:action', payload });
  });
  bus.on('nav:start', (payload) => {
    buffer.push({ type: 'nav:start', payload });
  });
  bus.on('nav:end', (payload) => {
    buffer.push({ type: 'nav:end', payload });
  });
  bus.on('guard:run', (payload) => {
    buffer.push({ type: 'guard:run', payload });
  });
  bus.on('component:mount', (payload) => {
    buffer.push({ type: 'component:mount', payload });
  });
  bus.on('component:unmount', (payload) => {
    buffer.push({ type: 'component:unmount', payload });
  });
}

/**
 * Discover stores that were created before devtools was initialized.
 * Emits synthetic store:create events for each existing store.
 */
function discoverExistingStores(buffer: EventBuffer): void {
  const storeNames = storeRegistry.list();

  for (const name of storeNames) {
    const inspection = storeRegistry.inspect(name);
    if (inspection) {
      buffer.push({
        type: 'store:create',
        payload: {
          id: name,
          initialState: inspection.state,
          timestamp: performance.now(),
        },
      });
    }
  }
}

/**
 * Set up keyboard shortcut listener.
 */
function setupKeyboardShortcut(
  shortcut: string,
  callback: () => void,
): () => void {
  const parts = shortcut.toLowerCase().split('+');
  const key = parts[parts.length - 1];
  const ctrl = parts.includes('ctrl');
  const shift = parts.includes('shift');
  const alt = parts.includes('alt');
  const meta = parts.includes('meta') || parts.includes('cmd');

  function handleKeyDown(e: KeyboardEvent): void {
    if (
      e.key?.toLowerCase() === key &&
      e.ctrlKey === ctrl &&
      e.shiftKey === shift &&
      e.altKey === alt &&
      e.metaKey === meta
    ) {
      e.preventDefault();
      callback();
    }
  }

  window.addEventListener('keydown', handleKeyDown);

  return () => {
    window.removeEventListener('keydown', handleKeyDown);
  };
}

/**
 * Get the CSS transform for panel visibility.
 */
function getTransform(
  position: 'right' | 'bottom' | 'floating',
  isOpen: boolean,
): string {
  if (position === 'right') {
    return isOpen ? 'translateX(0)' : 'translateX(100%)';
  }
  if (position === 'bottom') {
    return isOpen ? 'translateY(0)' : 'translateY(100%)';
  }
  // Floating
  return isOpen
    ? 'translate(-50%, -50%) scale(1)'
    : 'translate(-50%, -50%) scale(0.9)';
}

// ============================================================================
// Standalone DevTools (for manual usage / testing)
// ============================================================================

/**
 * Extended config for standalone DevTools with optional stores.
 */
export interface StandaloneDevToolsConfig extends DevToolsConfig {
  /** Optional stores map for time-travel debugging */
  stores?: DevToolsStoreMap;
}

/**
 * Create standalone DevTools (without using the plugin system).
 * Useful for manual integration or testing.
 */
export function createDevTools(config: StandaloneDevToolsConfig = {}): DevToolsInstance {
  const resolvedConfig: ResolvedDevToolsConfig = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  const bus = enableDebug();
  const buffer = createEventBuffer(resolvedConfig.maxEvents);

  subscribeToAllEvents(bus, buffer);

  const panelState = signal<PanelState>({
    isOpen: false,
    activeTab: resolvedConfig.defaultTab,
    isPinned: false,
    width: resolvedConfig.width,
    height: resolvedConfig.height,
    isPaused: false,
    filterQuery: '',
  });

  const stores = config.stores ?? {};
  const panelElement = createPanel(resolvedConfig, panelState, buffer, stores);
  document.body.appendChild(panelElement);

  const keyboardCleanup = setupKeyboardShortcut(
    resolvedConfig.shortcut,
    () => {
      panelState.update((state) => ({ ...state, isOpen: !state.isOpen }));
    },
  );

  const effectCleanup = effect(() => {
    const state = panelState();
    panelElement.style.transform = getTransform(resolvedConfig.position, state.isOpen);
    panelElement.style.opacity = state.isOpen ? '1' : '0';
    panelElement.style.pointerEvents = state.isOpen ? 'auto' : 'none';
  });

  return {
    bus,
    buffer,
    open(): void {
      panelState.update((state) => ({ ...state, isOpen: true }));
    },
    close(): void {
      panelState.update((state) => ({ ...state, isOpen: false }));
    },
    toggle(): void {
      panelState.update((state) => ({ ...state, isOpen: !state.isOpen }));
    },
    destroy(): void {
      keyboardCleanup();
      effectCleanup();
      if (panelElement.parentNode) {
        panelElement.parentNode.removeChild(panelElement);
      }
      disableDebug();
    },
  };
}

// ============================================================================
// Declaration Merging
// ============================================================================

declare module '@liteforge/runtime' {
  interface PluginRegistry {
    devtools: DevToolsApi;
  }
}
