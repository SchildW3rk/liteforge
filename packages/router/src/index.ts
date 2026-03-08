// =============================================================================
// Types
// =============================================================================

export type {
  // Location types
  Location,
  QueryParams,
  RouteParams,
  NavigationTarget,

  // Route definition types
  RouteDefinition,
  RouteComponent,
  LazyComponent,
  LazyImportFn,
  RouteLazyConfig,
  RouteMeta,
  CompiledRoute,
  MatchedRoute,
  RouteMatch,

  // Guard types
  GuardContext,
  GuardResult,
  GuardFunction,
  RouteGuard,

  // Middleware types
  MiddlewareContext,
  MiddlewareFunction,
  RouteMiddleware,

  // Preload types
  PreloadContext,
  PreloadFunction,

  // Transition types
  TransitionContext,
  TransitionHooks,

  // History types
  History,
  HistoryEntry,
  HistoryListener,

  // Router types
  RouterOptions,
  NavigateOptions,
  Router,
  ScrollBehavior,
  LazyDefaults,

  // Component types
  LinkProps,
  RouterOutletProps,

  // Utility types
  ExtractParams,
  TypedParams,
  FillParams,
  ExtractRoutePaths,
  TypedNavigationTarget,
} from './types.js';

// =============================================================================
// Route Matching
// =============================================================================

export {
  // Path parsing utilities
  parsePath,
  parseQuery,
  stringifyQuery,
  createLocation,
  normalizePath,
  joinPaths,

  // Route compilation
  compilePath,
  compileRoute,
  compileRoutes,

  // Route matching
  matchRoute,
  matchRoutes,
  matchRoutesSync,
  findRouteByName,
  generatePath,
  isPathActive,
  flattenRoutes,
} from './route-matcher.js';

// =============================================================================
// History
// =============================================================================

export {
  createMemoryHistory,
  createBrowserHistory,
  createHashHistory,
  targetToHref,
} from './history.js';

export type {
  MemoryHistoryOptions,
  BrowserHistoryOptions,
  HashHistoryOptions,
} from './history.js';

// =============================================================================
// Guards
// =============================================================================

export {
  defineGuard,
  GuardRegistry,
  runGuards,
  collectRouteGuards,
  normalizeGuardResult,

  // Built-in guards
  createAuthGuard,
  createRoleGuard,
  createConfirmGuard,
  createGuestGuard,
} from './guards.js';

// =============================================================================
// Middleware
// =============================================================================

export {
  defineMiddleware,
  composeMiddleware,
  runMiddleware,

  // Built-in middleware
  createLoggerMiddleware,
  createScrollMiddleware,
  createTitleMiddleware,
  createAnalyticsMiddleware,
  createLoadingMiddleware,
} from './middleware.js';

// =============================================================================
// Router
// =============================================================================

export {
  createRouter,
  setActiveRouter,
  getActiveRouter,
  getActiveRouterOrNull,
} from './router.js';

export { useTitle, hasTitleOverride } from './title.js';

export type { RouterInternal } from './router.js';

// =============================================================================
// Components
// =============================================================================

export { RouterOutlet, Link, NavLink } from './components.js';

export type { RouterOutletConfig, LinkConfig } from './components.js';

// =============================================================================
// Lazy Loading
// =============================================================================

export {
  lazy,
  prefetchAll,
  isLazyComponent,
  getLazyDelay,
  getLazyLoading,
  getLazyError,
  createPreloadOnHover,
  createPreloadOnVisible,
  // Inline lazy support
  resolveModuleExport,
  isWrappedLazyComponent,
  detectInlineLazyImport,
  wrapInlineLazy,
  processRouteComponent,
} from './lazy.js';

export type { LazyOptions, LazyComponentWithMethods } from './lazy.js';

export type { CompileRouteOptions } from './route-matcher.js';

// =============================================================================
// Scroll
// =============================================================================

export {
  createScrollHandlers,
  initScrollRestoration,
  saveScrollPosition,
  getHistoryKey,
  embedScrollKey,
} from './scroll.js';

// =============================================================================
// Plugin
// =============================================================================

export { routerPlugin } from './plugin.js';
export { useParam } from './helpers.js';

// Declaration Merging — augments @liteforge/runtime's PluginRegistry so that
// use('router') returns Router without a cast whenever @liteforge/router is imported.
import type { Router } from './types.js';
declare module '@liteforge/runtime' {
  interface PluginRegistry {
    router: Router;
  }
}
