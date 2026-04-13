/**
 * LiteForge DevTools Types
 */

import type { DebugEvent, DebugBus } from '@liteforge/core';

// ============================================================================
// Plugin Configuration
// ============================================================================

/**
 * Position of the DevTools panel.
 */
export type PanelPosition = 'right' | 'bottom' | 'bottom-right' | 'floating';

/**
 * Available tabs in the DevTools panel.
 */
export type TabId = 'signals' | 'stores' | 'router' | 'components' | 'performance';

/**
 * Minimal store interface required for DevTools time-travel.
 */
export interface DevToolsStore {
  readonly $name: string;
  $snapshot: () => Record<string, unknown>;
  $restore: (snapshot: Record<string, unknown>) => void;
}

export type DevToolsStoreMap = Record<string, DevToolsStore>;

/**
 * DevTools plugin configuration.
 */
export interface DevToolsConfig {
  /** Keyboard shortcut to toggle the panel (default: 'ctrl+shift+d') */
  shortcut?: string;
  /** Panel position (default: 'right') */
  position?: PanelPosition;
  /** Default tab to show (default: 'signals') */
  defaultTab?: TabId;
  /** Panel width in pixels for right position (default: 360) */
  width?: number;
  /** Panel height in pixels for bottom position (default: 300) */
  height?: number;
  /** Maximum events to keep in memory (default: 1000) */
  maxEvents?: number;
  /**
   * Additional stores to register for time-travel debugging.
   * Stores already registered via `createApp({ stores: [...] })` are discovered
   * automatically — use this only for stores created outside the app lifecycle.
   */
  stores?: DevToolsStoreMap;
}

/**
 * Resolved DevTools configuration with all defaults applied.
 */
export interface ResolvedDevToolsConfig {
  shortcut: string;
  position: PanelPosition;
  defaultTab: TabId;
  width: number;
  height: number;
  maxEvents: number;
}

// ============================================================================
// Event Buffer Types
// ============================================================================

/**
 * A stored debug event with additional metadata.
 */
export interface StoredEvent {
  /** Unique event ID */
  id: number;
  /** The debug event */
  event: DebugEvent;
}

/**
 * Circular buffer interface for storing debug events.
 */
export interface EventBuffer {
  /** Add an event to the buffer */
  push(event: DebugEvent): void;
  /** Get all stored events (oldest first) */
  getAll(): StoredEvent[];
  /** Get the last N events */
  getLast(count: number): StoredEvent[];
  /** Clear all events */
  clear(): void;
  /** Get current event count */
  size(): number;
  /** Subscribe to new events */
  subscribe(callback: (event: StoredEvent) => void): () => void;
}

// ============================================================================
// Panel State Types
// ============================================================================

/**
 * DevTools panel state.
 */
export interface PanelState {
  /** Whether the panel is open */
  isOpen: boolean;
  /** Current active tab */
  activeTab: TabId;
  /** Whether the panel is pinned (stays open across navigations) */
  isPinned: boolean;
  /** Current panel width (for resizing) */
  width: number;
  /** Current panel height (for bottom position) */
  height: number;
  /** Whether event feed is paused */
  isPaused: boolean;
  /** Search/filter query */
  filterQuery: string;
}

// ============================================================================
// Signal Inspector Types
// ============================================================================

/**
 * Signal info for the inspector.
 */
export interface SignalInfo {
  id: string;
  label: string | undefined;
  currentValue: unknown;
  updateCount: number;
  lastUpdate: number;
  subscribers: string[];
}

// ============================================================================
// Store Explorer Types
// ============================================================================

/**
 * A single history entry with full state snapshot for time-travel.
 */
export interface StoreHistoryEntry {
  timestamp: number;
  key: string;
  oldValue: unknown;
  newValue: unknown;
  /** Full state snapshot at this point in time for time-travel restore */
  snapshot: Record<string, unknown>;
}

/**
 * Store info for the explorer.
 */
export interface StoreInfo {
  name: string;
  state: Record<string, unknown>;
  getters: Record<string, unknown>;
  actions: string[];
  history: StoreHistoryEntry[];
}

// ============================================================================
// Router Inspector Types
// ============================================================================

/**
 * Navigation info for the router inspector.
 */
export interface NavigationInfo {
  timestamp: number;
  from: string;
  to: string;
  duration: number;
  guardResults: Array<{ name: string; allowed: boolean }>;
}

// ============================================================================
// Component Tree Types
// ============================================================================

/**
 * Component info for the tree view.
 */
export interface ComponentInfo {
  id: string;
  name: string;
  parent: string | undefined;
  mountTime: number;
  unmountTime: number | undefined;
  isActive: boolean;
}

// ============================================================================
// Performance Types
// ============================================================================

/**
 * Performance counters.
 */
export interface PerformanceCounters {
  totalSignals: number;
  activeEffects: number;
  mountedComponents: number;
  signalUpdatesPerSecond: number;
  effectExecutionsPerSecond: number;
}

// ============================================================================
// DevTools Public API (exposed via PluginRegistry)
// ============================================================================

/**
 * A getter function that reads a signal value.
 * Matches the call signature of Signal<T> for reading.
 */
export type SignalGetter<T> = () => T;

/**
 * Public DevTools API — accessible via use('devtools') or app.use('devtools').
 */
export interface DevToolsApi {
  /** Whether the panel is currently open */
  isOpen: SignalGetter<boolean>;
  /** Open the DevTools panel */
  open(): void;
  /** Close the DevTools panel */
  close(): void;
  /** Toggle the DevTools panel open/closed */
  toggle(): void;
  /** Switch to a specific tab */
  selectTab(tab: TabId): void;
}

// ============================================================================
// DevTools Instance
// ============================================================================

/**
 * DevTools instance returned by createDevTools() (standalone usage).
 */
export interface DevToolsInstance {
  /** The debug bus */
  bus: DebugBus;
  /** The event buffer */
  buffer: EventBuffer;
  /** Open the panel */
  open(): void;
  /** Close the panel */
  close(): void;
  /** Toggle the panel */
  toggle(): void;
  /** Destroy and clean up */
  destroy(): void;
}
