/**
 * LiteForge DevTools Plugin
 *
 * Plugin that integrates DevTools with a LiteForge app.
 */

import { enableDebug, disableDebug } from '@liteforge/core';
import type { DebugBus } from '@liteforge/core';
import { storeRegistry } from '@liteforge/store';
import { signal, effect } from './internals.js';
import { createEventBuffer } from './buffer.js';
import { createPanel } from './panel/Panel.js';
import type {
  DevToolsConfig,
  ResolvedDevToolsConfig,
  DevToolsInstance,
  EventBuffer,
  PanelState,
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
// Plugin Factory
// ============================================================================

/**
 * Create the DevTools plugin.
 *
 * @param config - Plugin configuration
 * @returns A plugin object for use with createApp
 *
 * @example
 * ```ts
 * import { devtoolsPlugin } from '@liteforge/devtools';
 *
 * await createApp({
 *   root: App,
 *   target: '#app',
 *   plugins: [
 *     devtoolsPlugin({
 *       shortcut: 'ctrl+shift+d',
 *       position: 'right',
 *     }),
 *   ],
 * });
 * ```
 */
/**
 * Store map type for time-travel functionality.
 * Each store must support $snapshot() and $restore().
 */
export interface DevToolsStore {
  readonly $name: string;
  $snapshot: () => Record<string, unknown>;
  $restore: (snapshot: Record<string, unknown>) => void;
}

export type DevToolsStoreMap = Record<string, DevToolsStore>;

export function devtoolsPlugin(config: DevToolsConfig = {}): {
  name: string;
  beforeInit: () => void;
  afterMount: (app: { stores: DevToolsStoreMap }) => void;
  beforeUnmount: () => void;
} {
  // Resolve configuration with defaults
  const resolvedConfig: ResolvedDevToolsConfig = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  // DevTools state
  let bus: DebugBus | undefined;
  let buffer: EventBuffer | undefined;
  let panelState: ReturnType<typeof signal<PanelState>> | undefined;
  let panelElement: HTMLElement | undefined;
  let keyboardCleanup: (() => void) | undefined;
  let effectCleanup: (() => void) | undefined;

  return {
    name: 'devtools',

    beforeInit(): void {
      // Enable debug mode and get the bus
      bus = enableDebug();

      // Create event buffer
      buffer = createEventBuffer(resolvedConfig.maxEvents);

      // Subscribe to all debug events
      subscribeToAllEvents(bus, buffer);

      // Discover already-registered stores (created before devtools was initialized)
      discoverExistingStores(buffer);

      // Create panel state
      panelState = signal<PanelState>({
        isOpen: false,
        activeTab: resolvedConfig.defaultTab,
        isPinned: false,
        width: resolvedConfig.width,
        height: resolvedConfig.height,
        isPaused: false,
        filterQuery: '',
      });
    },

    afterMount(app: { stores: DevToolsStoreMap }): void {
      if (!bus || !buffer || !panelState) return;

      // Create and inject the panel with access to stores for time-travel
      panelElement = createPanel(
        resolvedConfig,
        panelState,
        buffer,
        app.stores
      );
      document.body.appendChild(panelElement);

      // Set up keyboard shortcut
      keyboardCleanup = setupKeyboardShortcut(
        resolvedConfig.shortcut,
        () => {
          panelState?.update(state => ({
            ...state,
            isOpen: !state.isOpen,
          }));
        }
      );

      // Set up effect to update panel visibility
      effectCleanup = effect(() => {
        const state = panelState?.();
        if (panelElement && state) {
          panelElement.style.transform = getTransform(
            resolvedConfig.position,
            state.isOpen
          );
        }
      });
    },

    beforeUnmount(): void {
      // Clean up keyboard shortcut
      if (keyboardCleanup) {
        keyboardCleanup();
        keyboardCleanup = undefined;
      }

      // Clean up effect
      if (effectCleanup) {
        effectCleanup();
        effectCleanup = undefined;
      }

      // Remove panel from DOM
      if (panelElement && panelElement.parentNode) {
        panelElement.parentNode.removeChild(panelElement);
        panelElement = undefined;
      }

      // Disable debug mode
      disableDebug();
      bus = undefined;
      buffer = undefined;
      panelState = undefined;
    },
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Subscribe to all debug events and add them to the buffer.
 *
 * We use individual subscriptions for each event type to maintain
 * proper type narrowing without any type assertions.
 */
function subscribeToAllEvents(bus: DebugBus, buffer: EventBuffer): void {
  // Subscribe to each event type individually to maintain type safety
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
      // Emit synthetic store:create event
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
  callback: () => void
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
function getTransform(position: 'right' | 'bottom' | 'floating', isOpen: boolean): string {
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
// Standalone DevTools (for manual usage)
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

  // Subscribe to all events
  subscribeToAllEvents(bus, buffer);

  // Create panel state
  const panelState = signal<PanelState>({
    isOpen: false,
    activeTab: resolvedConfig.defaultTab,
    isPinned: false,
    width: resolvedConfig.width,
    height: resolvedConfig.height,
    isPaused: false,
    filterQuery: '',
  });

  // Create panel element with stores (empty object if not provided)
  const stores = config.stores ?? {};
  const panelElement = createPanel(resolvedConfig, panelState, buffer, stores);
  document.body.appendChild(panelElement);

  // Set up keyboard shortcut
  const keyboardCleanup = setupKeyboardShortcut(
    resolvedConfig.shortcut,
    () => {
      panelState.update(state => ({ ...state, isOpen: !state.isOpen }));
    }
  );

  // Set up visibility effect
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
      panelState.update(state => ({ ...state, isOpen: true }));
    },
    close(): void {
      panelState.update(state => ({ ...state, isOpen: false }));
    },
    toggle(): void {
      panelState.update(state => ({ ...state, isOpen: !state.isOpen }));
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
