/**
 * LiteForge HMR Runtime Support
 * 
 * Provides Hot Module Replacement support for LiteForge components.
 * This module sets up the global __LITEFORGE_HMR__ handler that the
 * vite-plugin's injected code communicates with.
 * 
 * Strategy:
 * - Track mounted component instances by module ID
 * - When a module updates, re-render affected components
 * - Signals and stores survive because they're in separate modules
 */

// Vite's import.meta.env type
declare global {
  interface ImportMeta {
    env?: {
      DEV?: boolean;
      PROD?: boolean;
      MODE?: string;
    };
  }
}

// =============================================================================
// Types
// =============================================================================

export interface HMRInstance {
  /** The module ID this instance came from */
  __hmrId: string;
  /** The root DOM element */
  __el: Node;
  /** Current props */
  __props: Record<string, unknown>;
  /** Setup result (signals, etc.) */
  __setup: Record<string, unknown>;
  /** Loaded data */
  __data: Record<string, unknown>;
  /** The render function */
  __renderFn: (args: {
    props: Record<string, unknown>;
    setup: Record<string, unknown>;
    data: Record<string, unknown>;
  }) => Node;
  /** Update handler */
  __hmrUpdate: (newModule: Record<string, unknown>) => void;
}

export interface HMRHandler {
  /** Map of module URL → mounted instances */
  registry: Map<string, Set<HMRInstance>>;
  /** Register a component instance */
  register: (moduleUrl: string, instance: HMRInstance) => void;
  /** Unregister a component instance */
  unregister: (moduleUrl: string, instance: HMRInstance) => void;
  /** Handle a module update */
  update: (moduleUrl: string, newModule: Record<string, unknown> | null) => void;
  /** Full app re-render function (set by createApp) */
  fullRerender: (() => void) | null;
}

// =============================================================================
// Global HMR Handler
// =============================================================================

declare global {
  interface Window {
    __LITEFORGE_HMR__?: HMRHandler;
  }
}

/**
 * Initialize the HMR handler.
 * Called automatically when this module loads in development.
 */
export function initHMR(): HMRHandler {
  if (typeof window === 'undefined') {
    // SSR environment - return dummy handler
    return {
      registry: new Map(),
      register: () => {},
      unregister: () => {},
      update: () => {},
      fullRerender: null,
    };
  }

  // Return existing handler if already initialized
  if (window.__LITEFORGE_HMR__) {
    return window.__LITEFORGE_HMR__;
  }

  const handler: HMRHandler = {
    registry: new Map(),

    register(moduleUrl: string, instance: HMRInstance): void {
      if (!this.registry.has(moduleUrl)) {
        this.registry.set(moduleUrl, new Set());
      }
      this.registry.get(moduleUrl)!.add(instance);
      
      if (import.meta.env?.DEV) {
        console.log('[LiteForge HMR] Registered instance for:', moduleUrl);
      }
    },

    unregister(moduleUrl: string, instance: HMRInstance): void {
      const instances = this.registry.get(moduleUrl);
      if (instances) {
        instances.delete(instance);
        if (instances.size === 0) {
          this.registry.delete(moduleUrl);
        }
      }
    },

    update(moduleUrl: string, newModule: Record<string, unknown> | null): void {
      console.log('[LiteForge HMR] Module updated:', moduleUrl);
      
      if (!newModule) {
        console.warn('[LiteForge HMR] No new module received, triggering full reload');
        window.location.reload();
        return;
      }

      const instances = this.registry.get(moduleUrl);
      
      if (instances && instances.size > 0) {
        console.log('[LiteForge HMR] Updating', instances.size, 'instance(s)');
        
        for (const instance of instances) {
          try {
            instance.__hmrUpdate(newModule);
          } catch (err) {
            console.error('[LiteForge HMR] Error updating instance:', err);
            // Fall back to full reload on error
            window.location.reload();
            return;
          }
        }
      } else {
        // No tracked instances for this module
        // Level 1 HMR: just reload the page
        // Component-level HMR (Level 2) would need instance registration
        console.log('[LiteForge HMR] No instances registered, triggering page reload');
        window.location.reload();
      }
    },

    fullRerender: null,
  };

  window.__LITEFORGE_HMR__ = handler;
  console.log('[LiteForge HMR] Handler initialized');
  
  return handler;
}

/**
 * Get the HMR handler (creates if needed)
 */
export function getHMRHandler(): HMRHandler | null {
  if (typeof window === 'undefined') return null;
  return window.__LITEFORGE_HMR__ ?? initHMR();
}

// Auto-initialize in development
if (typeof window !== 'undefined' && import.meta.env?.DEV) {
  initHMR();
}
