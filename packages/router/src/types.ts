import type { Signal } from '@liteforge/core';
import type { ComponentFactory } from '@liteforge/runtime';

// =============================================================================
// Core Location Types
// =============================================================================

/**
 * Parsed query string as key-value pairs
 */
export type QueryParams = Record<string, string | string[]>;

/**
 * Route parameters extracted from path (e.g., /users/:id → { id: '42' })
 */
export type RouteParams = Record<string, string>;

/**
 * Represents the current location state
 */
export interface Location {
  /** Full path including query string (e.g., /users/42?tab=profile) */
  readonly href: string;
  /** Path without query string (e.g., /users/42) */
  readonly path: string;
  /** Query string without leading ? (e.g., tab=profile) */
  readonly search: string;
  /** Parsed query parameters */
  readonly query: QueryParams;
  /** Hash without leading # */
  readonly hash: string;
  /** Optional state object passed during navigation */
  readonly state: unknown;
}

/**
 * Navigation target - can be a path string or a location-like object
 */
export type NavigationTarget =
  | string
  | {
      path: string;
      query?: QueryParams;
      hash?: string;
      state?: unknown;
    };

// =============================================================================
// Route Definition Types
// =============================================================================

/**
 * Component type - either a sync component, ComponentFactory, or lazy-loaded
 */
export type RouteComponent = 
  | (() => HTMLElement | DocumentFragment | Node)
  | { (): HTMLElement | DocumentFragment | Node; displayName?: string }
  | ComponentFactory<Record<string, unknown>, Record<string, unknown>>;

/**
 * Lazy component loader - a function returning a Promise of a module
 */
export type LazyComponent = 
  | (() => Promise<{ default: RouteComponent } | RouteComponent>)
  | (() => Promise<{ default: ComponentFactory<Record<string, unknown>, Record<string, unknown>> }>);

/**
 * Inline lazy import function - returns a Promise of a module with exports
 * This is what `() => import('./Component.js')` returns
 */
export type LazyImportFn = () => Promise<Record<string, unknown>>;

/**
 * Per-route lazy loading configuration
 */
export interface RouteLazyConfig {
  /** Delay in ms before showing loading state (default: 200) */
  delay?: number;
  /** Timeout in ms before showing error (default: 10000) */
  timeout?: number;
  /** Minimum time to show loading state to prevent flash */
  minLoadTime?: number;
}

/**
 * Route meta information for custom data
 */
export type RouteMeta = Record<string, unknown>;

/**
 * Route definition as provided by the user
 */
export interface RouteDefinition {
  /** Path pattern (e.g., /users/:id, /admin/*, /) */
  path: string;
  /** 
   * Component to render for this route.
   * Can be:
   * - Static component: `HomePage`
   * - Lazy import: `() => import('./pages/Home.js')`
   * - Pre-wrapped lazy: `lazy(() => import('./pages/Home.js'))`
   */
  component?: RouteComponent | LazyComponent | LazyImportFn;
  /** Redirect target if this route matches */
  redirect?: NavigationTarget;
  /** Guard names or guard references */
  guard?: string | string[] | RouteGuard | RouteGuard[];
  /** Child routes for nested routing */
  children?: RouteDefinition[];
  /** Route name for programmatic navigation */
  name?: string;
  /** Meta information */
  meta?: RouteMeta;
  /** Preload function to fetch data before rendering */
  preload?: PreloadFunction;
  
  // === NEW: Inline lazy loading support ===
  
  /** 
   * Named export to use from lazy-loaded module.
   * Default: 'default'
   * @example { path: '/admin', component: () => import('./Admin.js'), export: 'AdminDashboard' }
   */
  export?: string;
  
  /**
   * Loading component shown while lazy component loads.
   * Overrides the global lazyDefaults.loading for this route.
   */
  loading?: RouteComponent;
  
  /**
   * Per-route lazy loading configuration.
   * Overrides global lazyDefaults for this route.
   */
  lazy?: RouteLazyConfig;
}

/**
 * Compiled/normalized route with additional internal data
 */
export interface CompiledRoute {
  /** Original path pattern */
  path: string;
  /** Full path including parent paths */
  fullPath: string;
  /** Compiled regex for matching */
  regex: RegExp;
  /** Parameter names in order */
  paramNames: string[];
  /** Component to render */
  component?: RouteComponent | LazyComponent;
  /** Redirect target */
  redirect?: NavigationTarget;
  /** Resolved guards (from inline guard objects) */
  guards: RouteGuard[];
  /** Original guard specification (for dynamic resolution) */
  guardSpec?: string | string[] | RouteGuard | RouteGuard[];
  /** Child routes (compiled) */
  children: CompiledRoute[];
  /** Parent route reference */
  parent: CompiledRoute | null;
  /** Route name */
  name?: string;
  /** Meta information */
  meta: RouteMeta;
  /** Preload function */
  preload?: PreloadFunction;
  /** Whether this is a catch-all route */
  isCatchAll: boolean;
  
  // === Lazy loading metadata ===
  
  /** Named export to use from lazy module */
  exportName?: string;
  /** Route-specific loading component */
  loadingComponent?: RouteComponent;
  /** Route-specific lazy config */
  lazyConfig?: RouteLazyConfig;
}

/**
 * A matched route with extracted parameters
 */
export interface MatchedRoute {
  /** The compiled route that matched */
  route: CompiledRoute;
  /** Extracted route parameters */
  params: RouteParams;
}

/**
 * Result of route matching - array of matched routes (for nested routes)
 */
export type RouteMatch = MatchedRoute[];

// =============================================================================
// Guard Types
// =============================================================================

/**
 * Context passed to guard functions
 */
export interface GuardContext {
  /** Target location */
  to: Location;
  /** Current location (null on initial navigation) */
  from: Location | null;
  /** Route parameters */
  params: RouteParams;
  /** The matched route */
  route: CompiledRoute;
  /** Context accessor function */
  use: <T>(key: string) => T;
  /** Guard parameter (for parameterized guards like 'role:admin') */
  param?: string;
}

/**
 * Guard function return type
 * - true: allow navigation
 * - false: block navigation (stay on current route)
 * - string: redirect to this path
 * - NavigationTarget: redirect to this location
 */
export type GuardResult = boolean | string | NavigationTarget;

/**
 * Guard function signature
 */
export type GuardFunction = (context: GuardContext) => GuardResult | Promise<GuardResult>;

/**
 * Named guard definition
 */
export interface RouteGuard {
  /** Guard name for referencing */
  name: string;
  /** Guard function */
  handler: GuardFunction;
}

// =============================================================================
// Middleware Types
// =============================================================================

/**
 * Context passed to middleware functions
 */
export interface MiddlewareContext {
  /** Target location */
  to: Location;
  /** Current location (null on initial navigation) */
  from: Location | null;
  /** Route parameters */
  params: RouteParams;
  /** The matched routes (all levels for nested routes) */
  matched: RouteMatch;
  /** Context accessor function */
  use: <T>(key: string) => T;
}

/**
 * Middleware function signature
 * Returns void to continue, or a redirect target to abort and redirect
 */
export type MiddlewareFunction = (
  context: MiddlewareContext,
  next: () => Promise<void>
) => void | Promise<void> | NavigationTarget | Promise<NavigationTarget | void>;

/**
 * Named middleware definition
 */
export interface RouteMiddleware {
  /** Middleware name */
  name: string;
  /** Middleware function */
  handler: MiddlewareFunction;
}

// =============================================================================
// Preload Types
// =============================================================================

/**
 * Context passed to preload functions
 */
export interface PreloadContext {
  /** Target location */
  to: Location;
  /** Route parameters */
  params: RouteParams;
  /** Context accessor function */
  use: <T>(key: string) => T;
}

/**
 * Preload function signature - fetches data before route renders
 */
export type PreloadFunction = (context: PreloadContext) => unknown | Promise<unknown>;

// =============================================================================
// Transition Types
// =============================================================================

/**
 * Transition hook context
 */
export interface TransitionContext {
  /** Target location */
  to: Location;
  /** Current location */
  from: Location | null;
  /** Direction of navigation */
  direction: 'forward' | 'back' | 'replace';
}

/**
 * Transition hooks for animations
 */
export interface TransitionHooks {
  /** Called before leaving current route */
  onBeforeLeave?: (el: HTMLElement, context: TransitionContext) => void | Promise<void>;
  /** Called after leaving current route */
  onAfterLeave?: (el: HTMLElement, context: TransitionContext) => void | Promise<void>;
  /** Called before entering new route */
  onBeforeEnter?: (el: HTMLElement, context: TransitionContext) => void | Promise<void>;
  /** Called after entering new route */
  onAfterEnter?: (el: HTMLElement, context: TransitionContext) => void | Promise<void>;
}

// =============================================================================
// History Types
// =============================================================================

/**
 * History entry for memory history
 */
export interface HistoryEntry {
  /** Location path */
  path: string;
  /** Query string */
  search: string;
  /** Hash */
  hash: string;
  /** Navigation state */
  state: unknown;
  /** Unique key for this entry */
  key: string;
}

/**
 * History state change listener
 */
export type HistoryListener = (location: Location, action: 'push' | 'replace' | 'pop') => void;

/**
 * History interface - abstracts browser vs memory history
 */
export interface History {
  /** Current location */
  readonly location: Location;
  /** Navigate to a new location */
  push(target: NavigationTarget): void;
  /** Replace current location */
  replace(target: NavigationTarget): void;
  /** Go back in history */
  back(): void;
  /** Go forward in history */
  forward(): void;
  /** Go to a specific position in history */
  go(delta: number): void;
  /** Listen for location changes */
  listen(listener: HistoryListener): () => void;
  /** Create href string from target */
  createHref(target: NavigationTarget): string;
  /** Destroy the history instance */
  destroy(): void;
}

// =============================================================================
// Router Configuration Types
// =============================================================================

/**
 * Global defaults for lazy loading configuration
 */
export interface LazyDefaults {
  /** Delay in ms before showing loading state (default: 200) */
  delay?: number;
  /** Timeout in ms before showing error (default: 10000) */
  timeout?: number;
  /** Minimum time to show loading state to prevent flash */
  minLoadTime?: number;
  /** Default loading component for all lazy routes - must be zero-argument function */
  loading?: () => Node;
  /** Default error component for all lazy routes */
  error?: (error: Error, retry: () => void) => Node;
}

/**
 * Router configuration options
 */
export interface RouterOptions {
  /** Route definitions */
  routes: RouteDefinition[];
  /** Global middleware (runs on every navigation) */
  middleware?: RouteMiddleware[];
  /** Global guards registry */
  guards?: RouteGuard[];
  /** History instance (defaults to browser history) */
  history?: History;
  /** Base path for all routes */
  base?: string;
  /** Transition hooks */
  transitions?: TransitionHooks;
  /** Scroll behavior on navigation */
  scrollBehavior?: ScrollBehavior;
  /** Error handler for navigation failures */
  onError?: (error: Error) => void;
  /** Global lazy loading defaults for all routes */
  lazyDefaults?: LazyDefaults;
}

/**
 * Scroll behavior configuration
 */
export type ScrollBehavior = 
  | 'auto'
  | 'smooth'
  | ((to: Location, from: Location | null) => ScrollToOptions | false);

// =============================================================================
// Router Instance Types
// =============================================================================

/**
 * Navigation options
 */
export interface NavigateOptions {
  /** Replace current history entry instead of pushing */
  replace?: boolean;
  /** State to pass with navigation */
  state?: unknown;
}

/**
 * Router instance - the main router API
 */
export interface Router {
  /** Current path as a signal */
  readonly path: Signal<string>;
  /** Current route parameters as a signal */
  readonly params: Signal<RouteParams>;
  /** Current query parameters as a signal */
  readonly query: Signal<QueryParams>;
  /** Current hash as a signal */
  readonly hash: Signal<string>;
  /** Current matched routes as a signal */
  readonly matched: Signal<RouteMatch>;
  /** Current location as a signal */
  readonly location: Signal<Location>;
  /** Whether a navigation is in progress */
  readonly isNavigating: Signal<boolean>;
  /** Preloaded data for current route */
  readonly preloadedData: Signal<unknown>;
  
  /** Navigate to a path or location */
  navigate(target: NavigationTarget, options?: NavigateOptions): Promise<boolean>;
  /** Alias for navigate with replace: true */
  replace(target: NavigationTarget, options?: Omit<NavigateOptions, 'replace'>): Promise<boolean>;
  /** Go back in history */
  back(): void;
  /** Go forward in history */
  forward(): void;
  /** Go to a specific position in history */
  go(delta: number): void;
  
  /** Register a guard dynamically */
  registerGuard(guard: RouteGuard): void;
  /** Unregister a guard */
  unregisterGuard(name: string): void;
  
  /** Listen for before navigation events */
  beforeEach(callback: (context: MiddlewareContext) => GuardResult | Promise<GuardResult>): () => void;
  /** Listen for after navigation events */
  afterEach(callback: (context: { to: Location; from: Location | null }) => void): () => void;
  
  /** Get route by name */
  getRoute(name: string): CompiledRoute | undefined;
  /** Resolve a route without navigating */
  resolve(target: NavigationTarget): { href: string; route: CompiledRoute | undefined; params: RouteParams };
  
  /** Destroy the router instance */
  destroy(): void;
}

// =============================================================================
// Component Types
// =============================================================================

/**
 * Link component props
 */
export interface LinkProps {
  /** Target path or location */
  href: NavigationTarget;
  /** Class to apply when link is active (exact match) */
  activeClass?: string;
  /** Class to apply when link is active (partial match) */
  partialActiveClass?: string;
  /** Replace history instead of push */
  replace?: boolean;
  /** Additional CSS class */
  class?: string;
  /** Accessible label */
  'aria-label'?: string;
  /** Children */
  children?: HTMLElement | HTMLElement[] | string;
}

/**
 * RouterOutlet component props
 */
export interface RouterOutletProps {
  /** Depth level for nested routes (0 = top level) */
  depth?: number;
  /** Fallback component when no route matches */
  fallback?: RouteComponent;
  /** Transition hooks for this outlet */
  transitions?: TransitionHooks;
}

// =============================================================================
// Utility Types
// =============================================================================

/**
 * Extract param names from a path pattern
 * e.g., '/users/:id/posts/:postId' → 'id' | 'postId'
 */
export type ExtractParams<T extends string> = 
  T extends `${string}:${infer Param}/${infer Rest}`
    ? Param | ExtractParams<`/${Rest}`>
    : T extends `${string}:${infer Param}`
      ? Param
      : never;

/**
 * Type-safe params object from path pattern
 */
export type TypedParams<T extends string> = {
  [K in ExtractParams<T>]: string;
};
