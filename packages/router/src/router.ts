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
  RouteDefinition,
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
  TransitionHooks,
  TransitionContext,
} from './types.js';
import {
  compileRoutes,
  matchRoutes,
  matchRoutesSync,
  findRouteByName,
  createLocation,
  type CompileRouteOptions,
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
 * Create a router instance.
 *
 * @typeParam T - Inferred from the `routes` array literal. Pass `as const` on
 *   the routes array to get typed navigation:
 *   ```ts
 *   const router = createRouter({ routes: [{ path: '/home' }, { path: '/users/:id' }] as const })
 *   router.navigate('/home')         // OK
 *   router.navigate('/users/42')     // OK  (`:id` filled)
 *   router.navigate('/typo')         // TS error
 *   ```
 *   Without `as const`, TypeScript widens path strings to `string` and typed
 *   navigation degrades silently — all existing code continues to work.
 */
export function createRouter<T extends readonly RouteDefinition[]>(
  options: RouterOptions & { routes: T },
): Router<T> {
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
    transitions,
    useViewTransitions = false,
    initialNavigation = true,
  } = options;

  // Set up scroll handlers and disable browser-managed scroll restoration
  initScrollRestoration();
  const scrollHandlers = createScrollHandlers(scrollBehavior);

  // Initialize guard registry
  const guardRegistry = new GuardRegistry();
  guardRegistry.registerAll(guards);

  // Compile routes with guard registry and lazy defaults
  const compiledRoutes = compileRoutes(routeDefinitions, guardRegistry.getMap(), lazyDefaults);

  // Options passed to matchRoutes so lazyChildren can be compiled with the same config
  const matchOptions: CompileRouteOptions = { guardRegistry: guardRegistry.getMap(), lazyDefaults };

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
   * Get the router outlet element for transition hooks.
   * Falls back to document.body when no outlet is present in the DOM.
   */
  function getOutletElement(): HTMLElement {
    if (typeof document === 'undefined') return null as unknown as HTMLElement;
    // RouterOutlet inserts a comment node: <!--router-outlet:0-->
    // Walk the DOM to find the parent element of that comment node.
    const iterator = document.createNodeIterator(
      document.body,
      NodeFilter.SHOW_COMMENT,
    );
    let node: Comment | null;
    while ((node = iterator.nextNode() as Comment | null) !== null) {
      if (node.nodeValue?.startsWith('router-outlet:')) {
        return (node.parentElement ?? document.body) as HTMLElement;
      }
    }
    return document.body;
  }

  /**
   * Build a TransitionContext for the current navigation
   */
  function buildTransitionContext(
    to: Location,
    from: Location | null,
    isReplace: boolean,
  ): TransitionContext {
    return {
      to,
      from,
      direction: isReplace ? 'replace' : 'forward',
    };
  }

  // Augmented Document type for the View Transitions API (progressive enhancement)
  type DocumentWithVT = Document & {
    startViewTransition?: (cb: () => void) => { ready: Promise<void>; finished: Promise<void> };
  };

  /**
   * Commit the DOM update, optionally wrapping it in document.startViewTransition().
   * Falls back to a plain synchronous call when the API is unavailable.
   */
  async function commitWithViewTransition(commitDom: () => void): Promise<void> {
    const svt = (document as DocumentWithVT).startViewTransition;
    if (useViewTransitions && typeof document !== 'undefined' && typeof svt === 'function') {
      await new Promise<void>((resolve) => {
        svt(() => {
          commitDom();
          resolve();
        });
      });
    } else {
      commitDom();
    }
  }

  /**
   * Run transition hooks around a DOM commit callback.
   * Handles onBeforeLeave → DOM commit (optionally inside startViewTransition) → onAfterEnter.
   */
  async function runTransition(
    hooks: TransitionHooks,
    el: HTMLElement,
    context: TransitionContext,
    commitDom: () => void,
  ): Promise<void> {
    // Phase 1: before-leave
    if (hooks.onBeforeLeave) {
      await hooks.onBeforeLeave(el, context);
    }

    // Phase 2: DOM commit (optionally wrapped in View Transitions API)
    await commitWithViewTransition(commitDom);

    // Phase 3: after-enter (fire-and-forget to remain non-blocking)
    if (hooks.onAfterEnter) {
      void Promise.resolve(hooks.onAfterEnter(el, context));
    }
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
    const matched = await matchRoutes(targetLocation.path, compiledRoutes, matchOptions);

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
        const matched = await matchRoutes(finalTargetLocation.path, compiledRoutes, matchOptions) ?? [];

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

        // Update reactive state — optionally wrapped in transition hooks / View Transition API
        const previousLocation = currentLocation;
        currentLocation = finalTargetLocation;

        const isReplaceNav = replace || redirectCount > 0;
        const commitDom = () => updateState(finalTargetLocation, matched, result.preloadedData);

        if (transitions) {
          const el = getOutletElement();
          const context = buildTransitionContext(finalTargetLocation, previousLocation, isReplaceNav);
          await runTransition(transitions, el, context, commitDom);
        } else if (useViewTransitions) {
          await commitWithViewTransition(commitDom);
        } else {
          commitDom();
        }

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

  // ---------------------------------------------------------------------------
  // Phase 2 helpers — navigate(pattern, params) overload
  // ---------------------------------------------------------------------------

  /**
   * Fill :param segments in a path pattern with the provided values.
   * @throws if a required param is missing from the params object.
   */
  function fillPathParams(pattern: string, params: Record<string, string>): string {
    return pattern.replace(/:([^/]+)/g, (_, key: string) => {
      const value = params[key];
      if (value === undefined) throw new Error(`Missing param "${key}" for path "${pattern}"`);
      return encodeURIComponent(value);
    });
  }

  /**
   * Navigate to a path or location.
   * Supports three overloads:
   *   1. navigate(pattern, params, options?) — Phase 2: fill params into pattern
   *   2. navigate(path, options?)            — Phase 1: typed filled path
   *   3. navigate(locationObject, options?)  — untyped location object
   *
   * Dispatch is determined solely by the first argument: if `target` is a string
   * that still contains an unfilled :param segment, the second arg is always
   * treated as a params map — regardless of what keys it contains.
   */
  async function navigate(
    target: NavigationTarget,
    paramsOrOptions?: Record<string, string> | NavigateOptions,
    options?: NavigateOptions
  ): Promise<boolean> {
    // Primary discriminator: does the path still contain an unfilled :param segment?
    if (
      typeof target === 'string' &&
      /:\w+/.test(target) &&
      paramsOrOptions !== null &&
      paramsOrOptions !== undefined &&
      typeof paramsOrOptions === 'object'
    ) {
      const filled = fillPathParams(target, paramsOrOptions as Record<string, string>);
      return performNavigation(filled, options ?? {});
    }
    // Phase 1 / location object overload
    return performNavigation(
      target as NavigationTarget,
      (paramsOrOptions as NavigateOptions | undefined) ?? {}
    );
  }

  /**
   * Listen to history changes (back/forward)
   */
  const unlistenHistory = history.listen((location, action) => {
    if (action === 'pop') {
      // User pressed back/forward
      // Update path/query/hash synchronously so signals are immediately correct.
      // Use async matchRoutes for matched[] (lazyChildren may already be loaded from prior navigation)
      currentLocation = location;
      const syncMatched = matchRoutesSync(location.path, compiledRoutes);
      updateState(location, syncMatched ?? []);

      // If there are lazyChildren routes, an async pass may produce a richer match.
      // Fire-and-forget — the sync state above is already correct for normal routes.
      void matchRoutes(location.path, compiledRoutes, matchOptions).then(matched => {
        if (matched && matched.length > (syncMatched?.length ?? 0)) {
          updateState(location, matched);
        }
      });

      // Restore scroll position for back/forward navigation
      if (typeof window !== 'undefined') {
        scrollHandlers.onPop(location);
      }
    }
  });

  // Initial navigation — populate state immediately via sync match so signals
  // are never undefined, then run the full guard pipeline if initialNavigation is enabled.
  currentLocation = history.location;
  const initialMatched = matchRoutesSync(history.location.path, compiledRoutes);
  updateState(history.location, initialMatched ?? []);

  // isReady resolves after the initial navigation (including guards) completes.
  let _resolveReady!: (value: boolean) => void;
  const isReadyPromise = new Promise<boolean>((resolve) => {
    _resolveReady = resolve;
  });

  if (initialNavigation) {
    // Run the full guard + middleware pipeline for the initial URL without
    // touching the navigation lock or pushing a new history entry.
    // If a guard redirects, we do a replace() so the URL updates correctly.
    void runInitialNavigation()
      .then((result) => _resolveReady(result))
      .catch(() => _resolveReady(false));
  } else {
    _resolveReady(true);
  }

  /**
   * Run guards/middleware/preload for the initial page URL.
   * Does NOT acquire navigationLock (avoids blocking subsequent navigate() calls).
   * Commits a replace() if the result differs from the current location (redirect).
   */
  async function runInitialNavigation(): Promise<boolean> {
    const MAX_REDIRECTS = 10;
    const originalPath = history.location.path;
    let currentPath = originalPath;

    for (let i = 0; i <= MAX_REDIRECTS; i++) {
      const result = await attemptNavigation(currentPath);

      if (result.type === 'blocked') {
        return false;
      }

      if (result.type === 'redirect') {
        if (i === MAX_REDIRECTS) {
          if (onError) onError(new Error(`[LiteForge Router] Redirect loop detected during initial navigation (>${MAX_REDIRECTS} redirects)`));
          return false;
        }
        currentPath = typeof result.target === 'string' ? result.target : result.target.path;
        history.replace(currentPath);
        continue;
      }

      if (result.type === 'error') {
        if (onError) onError(result.error);
        return false;
      }

      // Success
      const wasRedirected = currentPath !== originalPath;
      const matched = await matchRoutes(currentPath, compiledRoutes, matchOptions) ?? [];
      const syncLen = matchedSignal().length;
      if (wasRedirected || matched.length > syncLen || result.preloadedData !== null) {
        updateState(history.location, matched, result.preloadedData);
      }
      return true;
    }

    return false;
  }


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

    get isReady() {
      return isReadyPromise;
    },

    // Navigation methods
    navigate,

    replace(
      target: NavigationTarget | string,
      paramsOrOptions?: Record<string, string> | Omit<NavigateOptions, 'replace'>,
      options?: Omit<NavigateOptions, 'replace'>
    ) {
      // Primary discriminator: does the path still contain an unfilled :param segment?
      if (
        typeof target === 'string' &&
        /:\w+/.test(target) &&
        paramsOrOptions !== null &&
        paramsOrOptions !== undefined &&
        typeof paramsOrOptions === 'object'
      ) {
        const filled = fillPathParams(target, paramsOrOptions as Record<string, string>);
        return navigate(filled, { ...(options ?? {}), replace: true });
      }
      // Phase 1 / location object overload
      const opts = (paramsOrOptions as Omit<NavigateOptions, 'replace'> | undefined) ?? {};
      return navigate(target as NavigationTarget, { ...opts, replace: true });
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
      // resolve() is synchronous — lazyChildren won't be expanded here.
      // Use matchRoutesSync which only checks already-compiled children.
      const matched = matchRoutesSync(location.path, compiledRoutes);
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

  // The internal router object satisfies Router (default generic = readonly RouteDefinition[]).
  // We cast to Router<T> at the boundary: the implementation already accepts any NavigationTarget
  // (superset of TypedNavigationTarget<T>), so this is safe — the narrowing is enforced on callers only.
  return router as Router<T>;
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
