import {
  signal,
  batch,
  emitNavigationStart,
  emitNavigationEnd,
} from '@liteforge/core';
import type { Signal } from '@liteforge/core';
import type {
  Router,
  RouterOptions,
  CompiledRoute,
  Location,
  RouteParams,
  QueryParams,
  RouteMatch,
  NavigationTarget,
  NavigateOptions,
  RouteGuard,
  MiddlewareContext,
  GuardResult,
  History,
} from './types.js';
import {
  compileRoutes,
  matchRoutes,
  findRouteByName,
  createLocation,
} from './route-matcher.js';
import { createMemoryHistory } from './history.js';
import { GuardRegistry, runGuards, collectRouteGuards, normalizeGuardResult } from './guards.js';
import { runMiddleware } from './middleware.js';
import { createScrollHandlers, initScrollRestoration } from './scroll.js';
import { setupTitleEffect } from './title.js';

// =============================================================================
// Router Creation
// =============================================================================

/**
 * Create a router instance
 */
export function createRouter(options: RouterOptions): Router {
  const {
    routes: routeDefinitions,
    middleware = [],
    guards = [],
    history = createMemoryHistory(),
    // base = '', // Reserved for future use
    onError,
    lazyDefaults,
    scrollBehavior = 'top',
    titleTemplate,
  } = options;

  // Set up scroll handlers and disable browser-managed scroll restoration
  initScrollRestoration();
  const scrollHandlers = createScrollHandlers(scrollBehavior);

  // Initialize guard registry
  const guardRegistry = new GuardRegistry();
  guardRegistry.registerAll(guards);

  // Compile routes with guard registry and lazy defaults
  const compiledRoutes = compileRoutes(routeDefinitions, guardRegistry.getMap(), lazyDefaults);

  // Context accessor - will be set when router is attached to app
  let contextAccessor: <T>(key: string) => T = () => {
    throw new Error('Router not attached to an app context');
  };

  // Reactive state signals
  const pathSignal = signal<string>(history.location.path);
  const paramsSignal = signal<RouteParams>({});
  const querySignal = signal<QueryParams>(history.location.query);
  const hashSignal = signal<string>(history.location.hash);
  const matchedSignal = signal<RouteMatch>([]);
  const locationSignal = signal<Location>(history.location);
  const isNavigatingSignal = signal<boolean>(false);
  const preloadedDataSignal = signal<unknown>(null);

  // Navigation hooks
  const beforeEachCallbacks = new Set<(context: MiddlewareContext) => GuardResult | Promise<GuardResult>>();
  const afterEachCallbacks = new Set<(context: { to: Location; from: Location | null }) => void>();

  // Track current location for from reference
  let currentLocation: Location | null = null;

  // Navigation lock to prevent concurrent navigations
  let navigationLock = false;
  let pendingNavigation: NavigationTarget | null = null;

  /**
   * Update reactive state from location
   */
  function updateState(location: Location, matched: RouteMatch, preloadedData: unknown = null) {
    batch(() => {
      pathSignal.set(location.path);
      querySignal.set(location.query);
      hashSignal.set(location.hash);
      locationSignal.set(location);
      matchedSignal.set(matched);
      preloadedDataSignal.set(preloadedData);

      // Extract params from all matched routes
      const combinedParams: RouteParams = {};
      for (const m of matched) {
        Object.assign(combinedParams, m.params);
      }
      paramsSignal.set(combinedParams);
    });
  }

  /**
   * Result type for internal navigation attempt
   */
  type NavigationAttemptResult = 
    | { type: 'success'; preloadedData: unknown }
    | { type: 'redirect'; target: NavigationTarget }
    | { type: 'blocked' }
    | { type: 'error'; error: Error };

  /**
   * Attempt a single navigation step (may result in redirect)
   */
  async function attemptNavigation(
    target: NavigationTarget,
    state?: unknown
  ): Promise<NavigationAttemptResult> {
    // Create target location
    const targetLocation = createLocation(target, state);

    // Match routes
    const matched = matchRoutes(targetLocation.path, compiledRoutes);

    if (!matched || matched.length === 0) {
      // No route matched - update location anyway for 404 handling
      return { type: 'success', preloadedData: null };
    }

    // Get the deepest matched route
    const leafMatch = matched[matched.length - 1]!;

    // Check for redirect
    if (leafMatch.route.redirect) {
      return { type: 'redirect', target: leafMatch.route.redirect };
    }

    // Build middleware context
    const middlewareContext: MiddlewareContext = {
      to: targetLocation,
      from: currentLocation,
      params: leafMatch.params,
      matched,
      use: contextAccessor,
    };

    // Run beforeEach hooks (treated as guards)
    for (const callback of beforeEachCallbacks) {
      const result = await callback(middlewareContext);
      const normalized = normalizeGuardResult(result);
      if (!normalized.allowed) {
        if (normalized.redirect) {
          return { type: 'redirect', target: normalized.redirect };
        }
        return { type: 'blocked' };
      }
    }

    // Run global middleware
    const middlewareResult = await runMiddleware(middleware, middlewareContext);
    if (!middlewareResult.completed) {
      if (middlewareResult.redirect) {
        return { type: 'redirect', target: middlewareResult.redirect };
      }
      return { type: 'blocked' };
    }

      // Collect and run route guards (pass registry for dynamic guard resolution)
      const routeGuards = collectRouteGuards(leafMatch.route, guardRegistry);
      if (routeGuards.length > 0) {
      const guardContext = {
        to: targetLocation,
        from: currentLocation,
        params: leafMatch.params,
        route: leafMatch.route,
        use: contextAccessor,
      };
      const guardResult = await runGuards(routeGuards, guardContext);
      if (!guardResult.allowed) {
        if (guardResult.redirect) {
          return { type: 'redirect', target: guardResult.redirect };
        }
        return { type: 'blocked' };
      }
    }

    // Run preload if defined
    let preloadedData: unknown = null;
    if (leafMatch.route.preload) {
      try {
        preloadedData = await leafMatch.route.preload({
          to: targetLocation,
          params: leafMatch.params,
          use: contextAccessor,
        });
      } catch (error) {
        return { type: 'error', error: error instanceof Error ? error : new Error(String(error)) };
      }
    }

    return { type: 'success', preloadedData };
  }

  /**
   * Core navigation logic
   */
  async function performNavigation(
    target: NavigationTarget,
    options: NavigateOptions = {}
  ): Promise<boolean> {
    const { replace = false, state } = options;

    // Prevent concurrent navigations
    if (navigationLock) {
      pendingNavigation = target;
      return false;
    }

    navigationLock = true;
    isNavigatingSignal.set(true);

    // Capture from path for debug events
    const fromPath = currentLocation?.path ?? '';
    // Compute toPath from target (string or object)
    // Extract path without query string and hash
    const toPath: string = typeof target === 'string' 
      ? (target.split('?')[0]?.split('#')[0] ?? '/')
      : target.path;
    
    // Emit navigation start (zero cost if debug not enabled)
    const navStartTime = performance.now();
    emitNavigationStart(fromPath, toPath);
    
    // Note: Individual guard results are emitted by executeGuard in guards.ts
    // The NavigationEnd event receives an empty array since guards emit separately
    const guardResults: Array<{ name: string; allowed: boolean }> = [];

    try {
      let currentTarget = target;
      let currentState = state;
      let redirectCount = 0;
      const maxRedirects = 10;

      // Follow redirects until we reach a final destination
      while (redirectCount < maxRedirects) {
        const result = await attemptNavigation(currentTarget, currentState);

        if (result.type === 'redirect') {
          currentTarget = result.target;
          currentState = undefined; // Clear state on redirect
          redirectCount++;
          continue;
        }

        if (result.type === 'blocked') {
          // Emit navigation end with blocked status
          const duration = performance.now() - navStartTime;
          emitNavigationEnd(fromPath, toPath, duration, guardResults);
          return false;
        }

        if (result.type === 'error') {
          // Emit navigation end with error status
          const duration = performance.now() - navStartTime;
          emitNavigationEnd(fromPath, toPath, duration, guardResults);
          if (onError) {
            onError(result.error);
          }
          return false;
        }

        // Success - finalize navigation
        const finalTargetLocation = createLocation(currentTarget, currentState);
        const matched = matchRoutes(finalTargetLocation.path, compiledRoutes) ?? [];

        // Capture scroll position BEFORE history.push changes window.history.state
        if (typeof window !== 'undefined') {
          scrollHandlers.beforePush(currentLocation);
        }

        // Update history (use replace for redirects or if explicitly requested)
        if (replace || redirectCount > 0) {
          history.replace(currentTarget);
        } else {
          history.push(currentTarget);
        }

        // Update reactive state
        const previousLocation = currentLocation;
        currentLocation = finalTargetLocation;
        updateState(finalTargetLocation, matched, result.preloadedData);

        // Scroll after navigation (runs in browser environment only)
        if (typeof window !== 'undefined') {
          scrollHandlers.onPush(finalTargetLocation);
        }

        // Run afterEach hooks
        for (const callback of afterEachCallbacks) {
          try {
            callback({ to: finalTargetLocation, from: previousLocation });
          } catch (error) {
            console.error('afterEach hook error:', error);
          }
        }

        // Emit navigation end with success
        const duration = performance.now() - navStartTime;
        emitNavigationEnd(fromPath, finalTargetLocation.path, duration, guardResults);

        return true;
      }

      // Too many redirects
      const duration = performance.now() - navStartTime;
      emitNavigationEnd(fromPath, toPath, duration, guardResults);
      if (onError) {
        onError(new Error(`Too many redirects (max ${maxRedirects})`));
      }
      return false;
    } catch (error) {
      // Emit navigation end with error
      const duration = performance.now() - navStartTime;
      emitNavigationEnd(fromPath, toPath, duration, guardResults);
      if (onError) {
        onError(error instanceof Error ? error : new Error(String(error)));
      }
      return false;
    } finally {
      navigationLock = false;
      isNavigatingSignal.set(false);

      // Process pending navigation if any
      if (pendingNavigation) {
        const pending = pendingNavigation;
        pendingNavigation = null;
        // Use setTimeout to avoid stack overflow
        setTimeout(() => navigate(pending), 0);
      }
    }
  }

  /**
   * Navigate to a path or location
   */
  async function navigate(
    target: NavigationTarget,
    options: NavigateOptions = {}
  ): Promise<boolean> {
    return performNavigation(target, options);
  }

  /**
   * Listen to history changes (back/forward)
   */
  const unlistenHistory = history.listen((location, action) => {
    if (action === 'pop') {
      // User pressed back/forward - sync state
      const matched = matchRoutes(location.path, compiledRoutes);
      currentLocation = location;
      updateState(location, matched ?? []);

      // Restore scroll position for back/forward navigation
      if (typeof window !== 'undefined') {
        scrollHandlers.onPop(location);
      }
    }
  });

  // Initialize with current location
  const initialMatched = matchRoutes(history.location.path, compiledRoutes);
  currentLocation = history.location;
  updateState(history.location, initialMatched ?? []);

  // Router instance
  const router: Router = {
    // Reactive signals (read-only access)
    get path() {
      return pathSignal as Signal<string>;
    },
    get params() {
      return paramsSignal as Signal<RouteParams>;
    },
    get query() {
      return querySignal as Signal<QueryParams>;
    },
    get hash() {
      return hashSignal as Signal<string>;
    },
    get matched() {
      return matchedSignal as Signal<RouteMatch>;
    },
    get location() {
      return locationSignal as Signal<Location>;
    },
    get isNavigating() {
      return isNavigatingSignal as Signal<boolean>;
    },
    get preloadedData() {
      return preloadedDataSignal as Signal<unknown>;
    },

    // Navigation methods
    navigate,

    replace(target, options = {}) {
      return navigate(target, { ...options, replace: true });
    },

    back() {
      history.back();
    },

    forward() {
      history.forward();
    },

    go(delta) {
      history.go(delta);
    },

    // Guard management
    registerGuard(guard: RouteGuard) {
      guardRegistry.register(guard);
    },

    unregisterGuard(name: string) {
      guardRegistry.unregister(name);
    },

    // Navigation hooks
    beforeEach(callback) {
      beforeEachCallbacks.add(callback);
      return () => {
        beforeEachCallbacks.delete(callback);
      };
    },

    afterEach(callback) {
      afterEachCallbacks.add(callback);
      return () => {
        afterEachCallbacks.delete(callback);
      };
    },

    // Route utilities
    getRoute(name: string) {
      return findRouteByName(name, compiledRoutes);
    },

    resolve(target) {
      const location = createLocation(target);
      const matched = matchRoutes(location.path, compiledRoutes);
      const route = matched?.[matched.length - 1]?.route;
      const params = matched?.[matched.length - 1]?.params ?? {};

      return {
        href: history.createHref(target),
        route,
        params,
      };
    },

    // Cleanup
    destroy() {
      disposeTitleEffect?.();
      unlistenHistory();
      history.destroy();
      beforeEachCallbacks.clear();
      afterEachCallbacks.clear();
      guardRegistry.clear();
    },
  };

  // Setup title effect AFTER router object creation (needs router.matched signal)
  let disposeTitleEffect: (() => void) | undefined;
  if (titleTemplate !== undefined) {
    disposeTitleEffect = setupTitleEffect(titleTemplate, router);
  }

  // Attach method to set context accessor (called by createApp)
  (router as RouterInternal)._setContextAccessor = (accessor: <T>(key: string) => T) => {
    contextAccessor = accessor;
  };

  // Expose compiled routes for RouterOutlet
  (router as RouterInternal)._compiledRoutes = compiledRoutes;

  // Expose history for testing
  (router as RouterInternal)._history = history;

  return router;
}

// =============================================================================
// Internal Router Interface
// =============================================================================

/**
 * Internal router interface with private methods
 */
export interface RouterInternal extends Router {
  _setContextAccessor: (accessor: <T>(key: string) => T) => void;
  _compiledRoutes: CompiledRoute[];
  _history: History;
}

// =============================================================================
// Router Context
// =============================================================================

// Global router reference for components
let activeRouter: Router | null = null;

/**
 * Set the active router (called by createApp)
 */
export function setActiveRouter(router: Router | null): void {
  activeRouter = router;
}

/**
 * Get the active router
 */
export function getActiveRouter(): Router {
  if (!activeRouter) {
    throw new Error('No active router. Make sure to create a router and attach it to the app.');
  }
  return activeRouter;
}

/**
 * Get the active router or null
 */
export function getActiveRouterOrNull(): Router | null {
  return activeRouter;
}
