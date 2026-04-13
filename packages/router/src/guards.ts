import { emitGuardRun } from '@liteforge/core';
import type {
  RouteGuard,
  GuardFunction,
  GuardContext,
  GuardResult,
  CompiledRoute,
  NavigationTarget,
} from './types.js';

// =============================================================================
// Guard Definition
// =============================================================================

/**
 * Define a named route guard
 *
 * @example
 * ```ts
 * const authGuard = defineGuard('auth', ({ to, from, use }) => {
 *   const auth = use('auth');
 *   if (!auth.isAuthenticated()) {
 *     return `/login?redirect=${encodeURIComponent(to.path)}`;
 *   }
 *   return true;
 * });
 *
 * // Parameterized guard
 * const roleGuard = defineGuard('role', ({ use, param }) => {
 *   return use('auth').hasRole(param) || '/unauthorized';
 * });
 * ```
 */
export function defineGuard(name: string, handler: GuardFunction): RouteGuard {
  return { name, handler };
}

// =============================================================================
// Guard Registry
// =============================================================================

/**
 * Guard registry for managing named guards
 */
export class GuardRegistry {
  private guards = new Map<string, RouteGuard>();

  /**
   * Register a guard
   */
  register(guard: RouteGuard): void {
    if (this.guards.has(guard.name)) {
      console.warn(`Guard "${guard.name}" is being overwritten`);
    }
    this.guards.set(guard.name, guard);
  }

  /**
   * Register multiple guards
   */
  registerAll(guards: RouteGuard[]): void {
    for (const guard of guards) {
      this.register(guard);
    }
  }

  /**
   * Get a guard by name
   */
  get(name: string): RouteGuard | undefined {
    return this.guards.get(name);
  }

  /**
   * Check if a guard exists
   */
  has(name: string): boolean {
    return this.guards.has(name);
  }

  /**
   * Unregister a guard
   */
  unregister(name: string): boolean {
    return this.guards.delete(name);
  }

  /**
   * Get all guard names
   */
  names(): string[] {
    return Array.from(this.guards.keys());
  }

  /**
   * Clear all guards
   */
  clear(): void {
    this.guards.clear();
  }

  /**
   * Get the internal map (for route compilation)
   */
  getMap(): Map<string, RouteGuard> {
    return this.guards;
  }
}

// =============================================================================
// Guard Execution
// =============================================================================

/**
 * Execute a single guard and normalize the result
 */
async function executeGuard(
  guard: RouteGuard,
  context: GuardContext
): Promise<{ allowed: boolean; redirect?: NavigationTarget }> {
  const startTime = performance.now();
  try {
    const result = await guard.handler(context);
    const normalized = normalizeGuardResult(result);
    const duration = performance.now() - startTime;
    
    // Emit guard run event (zero cost if debug not enabled)
    emitGuardRun(guard.name, context.to.path, normalized.allowed, duration);
    
    return normalized;
  } catch (error) {
    const duration = performance.now() - startTime;
    
    // Emit guard run event with failure (zero cost if debug not enabled)
    emitGuardRun(guard.name, context.to.path, false, duration);
    
    console.error(`Guard "${guard.name}" threw an error:`, error);
    // Treat errors as blocking navigation
    return { allowed: false };
  }
}

/**
 * Normalize guard result to a consistent format
 */
export function normalizeGuardResult(
  result: GuardResult
): { allowed: boolean; redirect?: NavigationTarget } {
  if (result === true) {
    return { allowed: true };
  }

  if (result === false) {
    return { allowed: false };
  }

  // String or NavigationTarget - redirect
  return { allowed: false, redirect: result };
}

/**
 * Run all guards for a route match
 * Guards are run in order; first failing guard stops execution
 */
export async function runGuards(
  guards: RouteGuard[],
  context: Omit<GuardContext, 'param'>
): Promise<{ allowed: boolean; redirect?: NavigationTarget }> {
  for (const guard of guards) {
    const result = await executeGuard(guard, context as GuardContext);
    if (!result.allowed) {
      return result;
    }
  }

  return { allowed: true };
}

/**
 * Resolve guards from guard specification using the registry
 * This is called at navigation time to support dynamic guard registration
 */
export function resolveGuardsFromSpec(
  guardSpec: CompiledRoute['guardSpec'],
  registry: GuardRegistry
): RouteGuard[] {
  if (!guardSpec) return [];

  const guards: RouteGuard[] = [];
  const guardList = Array.isArray(guardSpec) ? guardSpec : [guardSpec];

  for (const g of guardList) {
    if (typeof g === 'string') {
      // Parse parameterized guard (e.g., 'role:admin')
      const colonIndex = g.indexOf(':');
      const guardName = colonIndex >= 0 ? g.slice(0, colonIndex) : g;
      const param = colonIndex >= 0 ? g.slice(colonIndex + 1) : undefined;

      const registered = registry.get(guardName);
      if (registered) {
        // Create a wrapper that passes the param
        if (param !== undefined) {
          guards.push({
            name: g,
            handler: (ctx) => registered.handler({ ...ctx, param }),
          });
        } else {
          guards.push(registered);
        }
      }
      // If guard not found, skip it (allows dynamic registration)
    } else {
      // Direct guard object
      guards.push(g);
    }
  }

  return guards;
}

/**
 * Collect all guards for a matched route chain
 * (including parent route guards for nested routes)
 * Resolves string guards from the registry at runtime
 */
export function collectRouteGuards(route: CompiledRoute, registry?: GuardRegistry): RouteGuard[] {
  const guards: RouteGuard[] = [];

  // Walk up the parent chain and collect guards (parents first)
  let current: CompiledRoute | null = route;
  const chain: CompiledRoute[] = [];

  while (current) {
    chain.unshift(current);
    current = current.parent;
  }

  // Add guards from each route in the chain
  for (const r of chain) {
    // First add inline guards (RouteGuard objects defined directly)
    guards.push(...r.guards);
    
    // Then resolve string guards from the registry (if registry provided)
    if (registry && r.guardSpec) {
      const resolvedGuards = resolveGuardsFromSpec(r.guardSpec, registry);
      // Filter out guards that are already in the inline guards (by reference comparison)
      // and filter out object guards since those are already in r.guards
      for (const g of resolvedGuards) {
        // Only add if it's not already present (comparing by name for string-resolved guards)
        if (!r.guards.some(existing => existing === g || existing.name === g.name)) {
          guards.push(g);
        }
      }
    }
  }

  return guards;
}

// =============================================================================
// Built-in Guards
// =============================================================================

export interface CreateAuthGuardOptions {
  /** Returns true when the user is authenticated. */
  isAuthenticated: () => boolean;
  /** Path to redirect unauthenticated users to. @default '/login' */
  loginPath?: string;
  /**
   * Whether to replace the current history entry when redirecting to the login page.
   * Set to `false` to push a new history entry instead (allows Back navigation to protected route URL).
   * @default true
   */
  replace?: boolean;
}

/**
 * Create a simple authentication guard.
 *
 * @example
 * ```ts
 * createAuthGuard({ isAuthenticated: () => !!currentUser(), loginPath: '/login' })
 * ```
 */
export function createAuthGuard(options: CreateAuthGuardOptions): RouteGuard {
  const { isAuthenticated, loginPath = '/login', replace = true } = options;
  return defineGuard('auth', ({ to }) => {
    if (isAuthenticated()) {
      return true;
    }
    return { path: loginPath, query: { redirect: to.path + to.search }, replace };
  });
}

export interface CreateRoleGuardOptions {
  /** Returns true when the user has the given role. */
  hasRole: (role: string) => boolean;
  /** Path to redirect users without the required role to. @default '/unauthorized' */
  unauthorizedPath?: string;
}

/**
 * Create a role-based guard.
 * Usage: `guard: 'role:admin'` or `guard: 'role:editor'`
 *
 * @example
 * ```ts
 * createRoleGuard({ hasRole: (role) => authStore.roles().includes(role) })
 * ```
 */
export function createRoleGuard(options: CreateRoleGuardOptions): RouteGuard {
  const { hasRole, unauthorizedPath = '/unauthorized' } = options;
  return defineGuard('role', ({ param }) => {
    if (!param) {
      console.warn('Role guard requires a role parameter (e.g., "role:admin")');
      return false;
    }
    return hasRole(param) || unauthorizedPath;
  });
}

export interface CreateConfirmGuardOptions {
  /** Returns true when the user should be prompted before leaving. */
  shouldConfirm: () => boolean;
  /** Message shown in the confirm dialog. @default 'You have unsaved changes. Are you sure you want to leave?' */
  message?: string;
}

/**
 * Create a confirmation guard for unsaved changes.
 *
 * @example
 * ```ts
 * createConfirmGuard({ shouldConfirm: () => form.isDirty() })
 * ```
 */
export function createConfirmGuard(options: CreateConfirmGuardOptions): RouteGuard {
  const {
    shouldConfirm,
    message = 'You have unsaved changes. Are you sure you want to leave?',
  } = options;
  return defineGuard('confirm', () => {
    if (!shouldConfirm()) {
      return true;
    }
    if (typeof window !== 'undefined' && window.confirm) {
      return window.confirm(message);
    }
    return true;
  });
}

export interface CreateGuestGuardOptions {
  /** Returns true when the user is authenticated (guest guard blocks authenticated users). */
  isAuthenticated: () => boolean;
  /** Path to redirect authenticated users to. @default '/' */
  homePath?: string;
}

/**
 * Create a guest-only guard (redirects already-authenticated users).
 *
 * @example
 * ```ts
 * createGuestGuard({ isAuthenticated: () => !!currentUser(), homePath: '/dashboard' })
 * ```
 */
export function createGuestGuard(options: CreateGuestGuardOptions): RouteGuard {
  const { isAuthenticated, homePath = '/' } = options;
  return defineGuard('guest', () => {
    if (!isAuthenticated()) {
      return true;
    }
    return homePath;
  });
}
