import type { Signal } from '@liteforge/core';
import type { ComponentFactory, ErrorComponent } from '@liteforge/runtime';

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
      /** Whether to replace the current history entry instead of pushing. Defaults to `true` for guard redirects. */
      replace?: boolean;
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
  | ComponentFactory<object, object>;

/**
 * Lazy component loader - a function returning a Promise of a module
 */
export type LazyComponent =
  | (() => Promise<{ default: RouteComponent } | RouteComponent>)
  | (() => Promise<{ default: ComponentFactory<object, object> }>);

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
  /**
   * Lazy-loaded child routes — loaded on first match of this route's prefix.
   * Useful for code-splitting large route subtrees (e.g. admin panels).
   * Children are resolved once and cached.
   * @example
   * { path: '/admin', lazyChildren: () => import('./admin-routes.js').then(m => m.adminRoutes) }
   */
  lazyChildren?: () => Promise<RouteDefinition[]>;
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

  /**
   * Per-route error fallback UI.
   * Takes priority over the global AppConfig.errorComponent.
   * Receives the raw error and its context.
   */
  errorComponent?: ErrorComponent;
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

  // === lazyChildren ===

  /** Lazy children loader function (stored from RouteDefinition) */
  lazyChildrenFn?: () => Promise<RouteDefinition[]>;

  // === Error handling ===

  /** Per-route error fallback UI component */
  routeErrorComponent?: ErrorComponent;
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
  /** Wrap DOM updates in document.startViewTransition() when available (default: false) */
  useViewTransitions?: boolean;
  /** Scroll behavior on navigation */
  scrollBehavior?: ScrollBehavior;
  /** Error handler for navigation failures */
  onError?: (error: Error) => void;
  /** Global lazy loading defaults for all routes */
  lazyDefaults?: LazyDefaults;
  /** Automatically set document.title on every navigation */
  titleTemplate?: (title: string | undefined) => string;
  /**
   * Run the full guard + middleware pipeline on the initial page load.
   * When true (the default), the router performs a real navigation for the
   * current URL at startup so guards can redirect before any component renders.
   * Set to false to skip guards on the first load (not recommended for auth flows).
   * @default true
   */
  initialNavigation?: boolean;
}

/**
 * Scroll behavior configuration
 *
 * - `'top'`  — scroll to top on every push navigation; anchor-scroll if hash
 *              present; restore position on back/forward. **Default.**
 * - `'none'` — no automatic scrolling (app manages scroll manually).
 * - `(to, from) => void` — fully custom scroll handler.
 */
export type ScrollBehavior =
  | 'top'
  | 'none'
  | ((to: Location, from: Location | null) => void);

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
 *
 * @typeParam T - The literal routes array type (inferred by createRouter<T>).
 *   Defaults to `readonly RouteDefinition[]` so existing code that references
 *   `Router` without a type parameter continues to compile unchanged.
 */
export interface Router<T extends readonly RouteDefinition[] = readonly RouteDefinition[]> {
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

  /**
   * Navigate to a parametric route by path pattern with typed params.
   * TypeScript infers the required params from the path pattern.
   *
   * Known limitation: optional params (:param?) are treated as required.
   * Full optional param support is planned for Phase 3.
   *
   * @example
   * router.navigate('/users/:id', { id: '42' })
   * router.navigate('/posts/:year/:month', { year: '2024', month: '03' })
   */
  navigate<P extends ExtractParamPaths<T>>(
    path: P,
    params: TypedParams<P>,
    options?: NavigateOptions
  ): Promise<boolean>;

  /**
   * Navigate to a typed path. TypeScript will error if the path string doesn't
   * match any known route pattern. Param segments (:id) accept any string value.
   *
   * To get typed navigation, pass `routes` with `as const` to createRouter:
   *   createRouter({ routes: [...] as const })
   */
  navigate(path: TypedNavigationTarget<T>, options?: NavigateOptions): Promise<boolean>;

  /**
   * Navigate with a full location object (always allowed, untyped).
   *
   * @example
   * router.navigate({ path: '/users/42', query: { tab: 'profile' } })
   */
  navigate(target: { path: string; query?: QueryParams; hash?: string; state?: unknown }, options?: NavigateOptions): Promise<boolean>;

  /**
   * Replace current history entry using a parametric route by path pattern with typed params.
   * TypeScript infers the required params from the path pattern.
   *
   * Known limitation: optional params (:param?) are treated as required.
   * Full optional param support is planned for Phase 3.
   *
   * @example
   * router.replace('/users/:id', { id: '42' })
   */
  replace<P extends ExtractParamPaths<T>>(
    path: P,
    params: TypedParams<P>,
    options?: Omit<NavigateOptions, 'replace'>
  ): Promise<boolean>;

  /**
   * Replace current history entry with a typed path.
   * Same path-safety semantics as navigate().
   */
  replace(path: TypedNavigationTarget<T>, options?: Omit<NavigateOptions, 'replace'>): Promise<boolean>;

  /** Replace with a full location object (always allowed, untyped) */
  replace(target: { path: string; query?: QueryParams; hash?: string; state?: unknown }, options?: Omit<NavigateOptions, 'replace'>): Promise<boolean>;
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

  /**
   * Promise that resolves after the initial navigation (including guards) completes.
   * Resolves to `true` when navigation succeeded (direct render or after a guard redirect).
   * Resolves to `false` only when navigation was fully blocked with no redirect target.
   * Always resolves — never rejects.
   *
   * When using `routerPlugin`, `createApp().mount()` already awaits `isReady` internally,
   * so the app never mounts before the initial guard run completes.
   *
   * @example
   * ```ts
   * // Manual await (without routerPlugin):
   * await router.isReady
   * createApp({ root: App, target: '#app' }).mount()
   * ```
   */
  readonly isReady: Promise<boolean>;

  /**
   * Read, decode, and validate the `?redirect=` query param from the current URL.
   *
   * Returns the decoded path if it is a safe relative path (starts with `/`, no `//`,
   * no protocol). Returns `null` when the param is absent or fails the safety check.
   *
   * Use this in a Login component after `createAuthGuard` redirected the user:
   *
   * @example
   * ```ts
   * const redirect = router.getRedirectParam() ?? '/'
   * await router.navigate(redirect)
   * ```
   */
  getRedirectParam(): string | null;
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

/**
 * Replace :param segments with ${string} for path-safety checking.
 * '/users/:id/posts/:postId' → '/users/${string}/posts/${string}'
 *
 * NOTE: This provides path-safety (catches typos) but not param-value-safety
 * (empty strings or invalid values still pass TypeScript). See navigate() overload
 * comments for Phase 2 full param-safety.
 */
export type FillParams<P extends string> =
  P extends `${infer Pre}:${infer _Param}/${infer Rest}`
    ? `${Pre}${string}/${FillParams<Rest>}`
    : P extends `${infer Pre}:${infer _Param}`
      ? `${Pre}${string}`
      : P;

/**
 * Extract all path patterns from a routes array (recursively includes children).
 * Used to constrain navigate() to only known route paths.
 */
export type ExtractRoutePaths<T extends readonly RouteDefinition[]> =
  T extends readonly (infer R)[]
    ? R extends RouteDefinition
      ? R['path'] | (R extends { children: readonly RouteDefinition[] } ? ExtractRoutePaths<R['children']> : never)
      : never
    : never;

/**
 * A navigation target constrained to known route paths (with params filled).
 * Provides path-safety: catches typos and wrong paths at compile time.
 *
 * @example
 * // With routes [{ path: '/users/:id' }, { path: '/home' }]
 * // TypedNavigationTarget<typeof routes> = '/home' | `/users/${string}`
 */
export type TypedNavigationTarget<T extends readonly RouteDefinition[]> =
  FillParams<ExtractRoutePaths<T>>;

/**
 * Extract only paths that contain at least one :param segment.
 * Used to constrain the navigate(pattern, params) overload to parametric routes only.
 *
 * @example
 * // routes: ['/core', '/router/:id', '/admin/:section']
 * // ExtractParamPaths<T> → '/router/:id' | '/admin/:section'
 */
export type ExtractParamPaths<T extends readonly RouteDefinition[]> =
  Extract<ExtractRoutePaths<T>, `${string}:${string}`>;
