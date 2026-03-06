import { effect } from '@liteforge/core';
import { use, pushContext, popContext, isComponentFactory } from '@liteforge/runtime';
import type { ComponentInstance, ComponentFactoryInternal } from '@liteforge/runtime';
import type { ErrorInfo } from '@liteforge/runtime';
import type { ErrorBoundary } from '@liteforge/runtime';
import type { Router, RouteComponent, LazyComponent, CompiledRoute } from './types.js';
import { isPathActive } from './route-matcher.js';
import { isLazyComponent, getLazyDelay, getLazyLoading, getLazyError } from './lazy.js';
import type { LazyComponentWithMethods } from './lazy.js';

// =============================================================================
// RouterOutlet
// =============================================================================

/**
 * RouterOutlet configuration
 */
export interface RouterOutletConfig {
  /** Fallback component when no route matches */
  fallback?: () => Node;
}

/**
 * RouterOutlet renders the component for the current matched route.
 * 
 * For nested routes, each RouterOutlet tracks its depth and renders
 * the appropriate level of the route match chain.
 * 
 * @example
 * ```ts
 * // Basic usage
 * const outlet = RouterOutlet();
 * 
 * // With fallback for no match
 * const outlet = RouterOutlet({ fallback: () => document.createTextNode('Not Found') });
 * ```
 */
export function RouterOutlet(config: RouterOutletConfig = {}): Node {
  const { fallback } = config;

  // Get router from context
  let router: Router;
  try {
    router = use<Router>('router');
  } catch {
    throw new Error('RouterOutlet requires a router in context. Make sure to use createApp with a router.');
  }

  // Get current outlet depth (default 0 for top-level)
  let depth: number;
  try {
    depth = use<number>('router:outlet-depth') ?? 0;
  } catch {
    depth = 0;
  }

  // Optional error boundary from app context (may be absent in standalone router usage)
  let errorBoundary: ErrorBoundary | null = null;
  try {
    errorBoundary = use<ErrorBoundary>('app:errorBoundary');
  } catch {
    // No error boundary available — errors will be thrown to the console
  }

  // Create a container for the outlet
  const container = document.createDocumentFragment();
  
  // Placeholder comment node for positioning
  const placeholder = document.createComment(`router-outlet:${depth}`);
  container.appendChild(placeholder);

  // Track current mounted component/node
  let currentInstance: ComponentInstance | null = null;
  let currentNode: Node | null = null;
  let parentNode: Node | null = null;
  
  // Track current route to avoid remounting same component on child navigation
  // We compare routes (not components) because compiled routes are stable references
  let currentRoute: CompiledRoute | null = null;

  // Cleanup function for effect
  let cleanupEffect: (() => void) | null = null;

  // Navigation ID for race condition handling
  let navigationId = 0;

  // Delay timer ID
  let delayTimerId: ReturnType<typeof setTimeout> | null = null;

  /**
   * Report a render/lazy error.
   * Priority: per-route errorComponent (rendered in outlet) > global error boundary > console.error.
   * The onError hook is always fired first regardless of which UI handles display.
   */
  function handleOutletError(
    error: unknown,
    route: CompiledRoute | null,
    type: ErrorInfo['type'],
  ): void {
    const info: ErrorInfo = {
      type,
      originalError: error,
      ...(route?.fullPath !== undefined ? { route: route.fullPath } : {}),
    };

    const routeComp = route?.routeErrorComponent;

    if (routeComp) {
      // Fire hook first (Sentry etc.) — does NOT render global UI
      errorBoundary?.invokeHook(error, info);
      // Render per-route fallback inside the outlet
      try {
        const fallbackEl = routeComp(error, info);
        unmountCurrent();
        const parent = placeholder.parentNode;
        if (parent) {
          parent.insertBefore(fallbackEl, placeholder.nextSibling);
          currentNode = fallbackEl;
        }
      } catch {
        console.error('[LiteForge] Per-route errorComponent threw:', error);
      }
      return;
    }

    if (errorBoundary) {
      // No per-route component — let the global boundary handle everything (app-wide UI)
      errorBoundary.handle(error, info);
      return;
    }

    // No boundary configured — log and swallow to avoid crashing the app silently
    console.error(`[LiteForge] Unhandled ${type} error:`, error);
  }

  /**
   * Clear delay timer if active
   */
  function clearDelayTimer(): void {
    if (delayTimerId !== null) {
      clearTimeout(delayTimerId);
      delayTimerId = null;
    }
  }

  /**
   * Unmount current content
   * Note: Does NOT reset currentComponent - that's managed by renderComponent()
   */
  function unmountCurrent(): void {
    clearDelayTimer();
    if (currentInstance) {
      currentInstance.unmount();
      currentInstance = null;
    }
    if (currentNode && currentNode.parentNode) {
      currentNode.parentNode.removeChild(currentNode);
      currentNode = null;
    }
  }

  /**
   * Mount a node at the outlet position
   */
  function mountNode(node: Node): void {
    parentNode = placeholder.parentNode;
    if (!parentNode) return;
    
    // Remove current node if any (without full unmount)
    if (currentNode && currentNode.parentNode) {
      currentNode.parentNode.removeChild(currentNode);
    }
    
    parentNode.insertBefore(node, placeholder.nextSibling);
    currentNode = node;
  }

  /**
   * Render a sync route component
   */
  function renderSyncComponent(
    component: RouteComponent,
    props: Record<string, unknown>
  ): void {
    unmountCurrent();
    parentNode = placeholder.parentNode;
    if (!parentNode) return;

    // Check if it's a ComponentFactory
    if (isComponentFactory(component)) {
      pushContext({ 'router:outlet-depth': depth + 1 });

      try {
        currentInstance = (component as unknown as ComponentFactoryInternal)(props);
        // Mount directly into the real DOM after the placeholder.
        // Using a tempContainer would leave parentElement pointing at the temp div,
        // causing async load() → renderComponent() to insert into the invisible container.
        currentInstance.mount(parentNode as Element, placeholder.nextSibling);
        currentNode = currentInstance.getNode();
      } catch (error) {
        handleOutletError(error, currentRoute, 'render');
      } finally {
        popContext();
      }
    } else if (typeof component === 'function') {
      pushContext({ 'router:outlet-depth': depth + 1 });

      try {
        // Call with props - some components expect them
        const result = (component as (p: Record<string, unknown>) => Node)(props);
        currentNode = result;
        parentNode.insertBefore(currentNode, placeholder.nextSibling);
      } catch (error) {
        handleOutletError(error, currentRoute, 'render');
      } finally {
        popContext();
      }
    }
  }

  /**
   * Render a route component (sync or lazy)
   */
  function renderComponent(
    route: CompiledRoute,
    component: RouteComponent | LazyComponent,
    props: Record<string, unknown>
  ): void {
    // Same route as currently rendered → don't remount
    // This is critical for nested routes: when navigating /dashboard → /dashboard/users,
    // the parent layout (depth 0) stays mounted, only the child outlet (depth 1) updates
    // We compare routes (not components) because compiled routes are stable references
    if (route === currentRoute) {
      return;
    }
    currentRoute = route;

    // Increment navigation ID to invalidate any pending loads
    // This must happen AFTER the route check, so same-route calls don't invalidate
    navigationId++;
    const thisNavigationId = navigationId;

    // Check if it's a lazy component
    if (isLazyComponent(component)) {
      // Check if already loaded - use SYNCHRONOUS getLoaded() to avoid microtask race
      const loadedComponent = component.getLoaded();
      if (loadedComponent) {
        // Already loaded - render SYNCHRONOUSLY (no .then(), no microtask)
        renderSyncComponent(loadedComponent, props);
        return;
      }

      // Not loaded yet - handle lazy loading with delay
      handleLazyComponent(component, props, thisNavigationId);
      return;
    }

    // Check if it's a ComponentFactory (from createComponent)
    if (isComponentFactory(component)) {
      renderSyncComponent(component, props);
      return;
    }

    // It's a plain function (either sync or lazy loader without our wrapper)
    if (typeof component === 'function') {
      pushContext({ 'router:outlet-depth': depth + 1 });
      
      try {
        // Call with props - component may expect them
        const result = (component as (p: Record<string, unknown>) => Node | Promise<{ default: RouteComponent } | RouteComponent>)(props);
        
        if (result instanceof Promise) {
          popContext();
          // Plain lazy loader - handle without delay features
          handlePlainLazyComponent(result, props, thisNavigationId);
        } else {
          unmountCurrent();
          parentNode = placeholder.parentNode;
          if (parentNode) {
            currentNode = result;
            parentNode.insertBefore(currentNode, placeholder.nextSibling);
          }
          popContext();
        }
      } catch (error) {
        popContext();
        throw error;
      }
    }
  }

  /**
   * Handle lazy-loaded component with delay behavior
   */
  function handleLazyComponent(
    lazyComponent: LazyComponentWithMethods,
    props: Record<string, unknown>,
    navId: number
  ): void {
    const delay = getLazyDelay(lazyComponent);
    const loadingFn = getLazyLoading(lazyComponent);
    const errorFn = getLazyError(lazyComponent);

    // Set up delay timer for showing loading state
    if (delay > 0 && loadingFn) {
      clearDelayTimer();
      delayTimerId = setTimeout(() => {
        if (navigationId !== navId) return; // Stale navigation
        
        // Show loading state after delay
        const loadingNode = loadingFn();
        mountNode(loadingNode);
      }, delay);
    } else if (delay === 0 && loadingFn) {
      // Show loading immediately (delay = 0)
      unmountCurrent();
      parentNode = placeholder.parentNode;
      if (parentNode) {
        const loadingNode = loadingFn();
        parentNode.insertBefore(loadingNode, placeholder.nextSibling);
        currentNode = loadingNode;
      }
    }

    // Start loading the component
    lazyComponent().then(module => {
      clearDelayTimer();
      
      if (navigationId !== navId) return; // Stale navigation
      
      const loadedComponent = 'default' in module ? module.default : module;
      renderSyncComponent(loadedComponent, props);
    }).catch((error: unknown) => {
      clearDelayTimer();
      
      if (navigationId !== navId) return; // Stale navigation
      
      const err = error instanceof Error ? error : new Error(String(error));

      if (errorFn) {
        // Lazy component has its own error UI — fire hook only, render locally
        errorBoundary?.invokeHook(err, {
          type: 'lazy',
          originalError: err,
          ...(currentRoute?.fullPath !== undefined ? { route: currentRoute.fullPath } : {}),
        });
        const retry = () => {
          lazyComponent.reset();
          handleLazyComponent(lazyComponent, props, navigationId);
        };

        unmountCurrent();
        parentNode = placeholder.parentNode;
        if (parentNode) {
          const errorNode = errorFn(err, retry);
          parentNode.insertBefore(errorNode, placeholder.nextSibling);
          currentNode = errorNode;
        }
      } else {
        handleOutletError(err, currentRoute, 'lazy');
      }
    });
  }

  /**
   * Handle plain lazy component (without our wrapper)
   */
  async function handlePlainLazyComponent(
    promise: Promise<{ default: RouteComponent } | RouteComponent>,
    props: Record<string, unknown>,
    navId: number
  ): Promise<void> {
    try {
      const module = await promise;
      
      if (navigationId !== navId) return; // Stale navigation
      
      const component = 'default' in module ? module.default : module;
      renderSyncComponent(component, props);
    } catch (error) {
      if (navigationId !== navId) return; // Stale navigation
      handleOutletError(error, currentRoute, 'lazy');
    }
  }

  /**
   * Render fallback content
   */
  function renderFallback(): void {
    unmountCurrent();

    if (fallback) {
      parentNode = placeholder.parentNode;
      if (parentNode) {
        currentNode = fallback();
        parentNode.insertBefore(currentNode, placeholder.nextSibling);
      }
    }
  }

  // Set up effect to watch route changes
  // We need to defer this until the placeholder is in the DOM
  const originalPlaceholder = placeholder;

  function setupRouteWatcher(): void {
    // Dispose any previous effect before creating a new one (guards against double-call)
    if (cleanupEffect) {
      cleanupEffect();
      cleanupEffect = null;
    }
    cleanupEffect = effect(() => {
      const matched = router.matched();
      const preloadedData = router.preloadedData();
      const params = router.params();
      const query = router.query();

      // Get the match at our depth level
      const matchAtDepth = matched[depth];

      if (!matchAtDepth) {
        // No match at this depth
        renderFallback();
        return;
      }

      const { route } = matchAtDepth;
      const component = route.component;

      if (!component) {
        // Route has no component (might be redirect-only)
        renderFallback();
        return;
      }

      // Build props for the route component
      const componentProps = {
        params,
        query,
        preloaded: preloadedData,
      };

      renderComponent(route, component, componentProps);
    });
  }

  // Use MutationObserver to detect when placeholder is added to the DOM,
  // then start the route watcher. The observerFired flag prevents the
  // MutationObserver microtask queue from triggering setupRouteWatcher twice
  // (pending mutations can fire after disconnect() in the same microtask batch).
  if (typeof MutationObserver !== 'undefined') {
    if (originalPlaceholder.parentNode) {
      // Already in DOM — defer to next tick so context is fully set up
      setTimeout(setupRouteWatcher, 0);
    } else {
      let observerFired = false;
      const observer = new MutationObserver(() => {
        if (observerFired) return;
        if (originalPlaceholder.parentNode) {
          observerFired = true;
          observer.disconnect();
          setTimeout(setupRouteWatcher, 0);
        }
      });
      observer.observe(document, { childList: true, subtree: true });
    }
  } else {
    setTimeout(setupRouteWatcher, 0);
  }

  // Return a node that cleans up when removed
  // We wrap the placeholder in a custom behavior
  const result = placeholder;
  
  // Store cleanup function on the node for later access
  (result as Node & { __cleanup?: () => void }).__cleanup = () => {
    if (cleanupEffect) {
      cleanupEffect();
      cleanupEffect = null;
    }
    unmountCurrent();
  };

  return result;
}

// =============================================================================
// Link
// =============================================================================

/**
 * Link component configuration
 */
export interface LinkConfig {
  /** Target path or URL */
  href: string;
  /** Link content - string or Node */
  children: string | Node;
  /** Class added when path matches (prefix match by default, exact match if `exact` is true) */
  activeClass?: string;
  /** Class added when path matches exactly */
  exactActiveClass?: string;
  /** When true, activeClass requires exact path match instead of prefix match */
  exact?: boolean;
  /** Static CSS class */
  class?: string;
  /** Use replaceState instead of pushState */
  replace?: boolean;
  /** Target attribute for the link */
  target?: string;
  /** Additional attributes */
  attrs?: Record<string, string>;
  /** 
   * Preload the route's lazy component on hover.
   * Can be true (preload on mouseenter) or a LazyComponent to preload.
   */
  preload?: boolean | LazyComponentWithMethods;
}

/**
 * Link creates an anchor element with client-side navigation.
 * 
 * @example
 * ```ts
 * // Basic link
 * const link = Link({ href: '/about', children: 'About Us' });
 * 
 * // With active class
 * const navLink = Link({
 *   href: '/users',
 *   children: 'Users',
 *   activeClass: 'nav-active',
 *   exactActiveClass: 'nav-exact',
 * });
 * ```
 */
export function Link(config: LinkConfig): HTMLAnchorElement {
  const {
    href,
    children,
    activeClass = 'active',
    exactActiveClass = 'exact-active',
    exact = false,
    class: className,
    replace = false,
    target,
    attrs = {},
    preload,
  } = config;

  // Get router from context
  let router: Router;
  try {
    router = use<Router>('router');
  } catch {
    throw new Error('Link requires a router in context. Make sure to use createApp with a router.');
  }

  // Create anchor element
  const anchor = document.createElement('a');
  anchor.href = href;

  // Set children
  if (typeof children === 'string') {
    anchor.textContent = children;
  } else {
    anchor.appendChild(children);
  }

  // Set static class
  if (className) {
    anchor.className = className;
  }

  // Set target
  if (target) {
    anchor.target = target;
  }

  // Set additional attributes
  for (const [key, value] of Object.entries(attrs)) {
    anchor.setAttribute(key, value);
  }

  // Track if preload has been triggered (only do it once)
  let preloadTriggered = false;

  // Handle preload on hover
  if (preload) {
    anchor.addEventListener('mouseenter', () => {
      if (preloadTriggered) return;
      preloadTriggered = true;

      // If preload is a LazyComponent, prefetch it directly
      if (preload !== true && isLazyComponent(preload)) {
        preload.prefetch();
        return;
      }

      // If preload is true, try to find the route's lazy component
      const resolved = router.resolve(href);
      const routeComponent = resolved.route?.component;
      
      if (routeComponent && isLazyComponent(routeComponent)) {
        routeComponent.prefetch();
      }
    });
  }

  // Handle click for client-side navigation
  anchor.addEventListener('click', (event: MouseEvent) => {
    // Don't handle if modifier keys are pressed (allow new tab)
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }

    // Don't handle if target is _blank
    if (anchor.target === '_blank') {
      return;
    }

    // Don't handle external links
    if (anchor.origin !== window.location.origin) {
      return;
    }

    // Prevent default browser navigation
    event.preventDefault();

    // Navigate using router
    if (replace) {
      router.replace(href);
    } else {
      router.navigate(href);
    }
  });

  // Set up effect to manage active classes
  const disposeEffect = effect(() => {
    const currentPath = router.path();

    // Check for exact match
    const isExactActive = isPathActive(currentPath, href, true);
    
    // Check for active match (exact if `exact` prop is true, otherwise prefix match)
    const isActive = exact
      ? isExactActive
      : isPathActive(currentPath, href, false);

    // Manage exact active class
    if (isExactActive) {
      anchor.classList.add(exactActiveClass);
    } else {
      anchor.classList.remove(exactActiveClass);
    }

    // Manage active class
    if (isActive) {
      anchor.classList.add(activeClass);
    } else {
      anchor.classList.remove(activeClass);
    }
  });

  // Store cleanup function on the element
  (anchor as HTMLAnchorElement & { __cleanup?: () => void }).__cleanup = disposeEffect;

  return anchor;
}

// =============================================================================
// NavLink (Convenience Alias)
// =============================================================================

/**
 * NavLink is an alias for Link with navigation-focused defaults.
 */
export const NavLink = Link;
