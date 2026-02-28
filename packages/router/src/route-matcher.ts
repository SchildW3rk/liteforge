import type {
  RouteDefinition,
  CompiledRoute,
  RouteParams,
  MatchedRoute,
  RouteMatch,
  RouteGuard,
  Location,
  QueryParams,
  NavigationTarget,
  LazyDefaults,
} from './types.js';
import { processRouteComponent } from './lazy.js';

// =============================================================================
// Path Parsing Utilities
// =============================================================================

/**
 * Parse a URL path into its components
 */
export function parsePath(path: string): { path: string; search: string; hash: string } {
  let pathname = path;
  let search = '';
  let hash = '';

  // Extract hash
  const hashIndex = pathname.indexOf('#');
  if (hashIndex >= 0) {
    hash = pathname.slice(hashIndex + 1);
    pathname = pathname.slice(0, hashIndex);
  }

  // Extract search/query
  const searchIndex = pathname.indexOf('?');
  if (searchIndex >= 0) {
    search = pathname.slice(searchIndex + 1);
    pathname = pathname.slice(0, searchIndex);
  }

  return { path: pathname || '/', search, hash };
}

/**
 * Parse query string into key-value pairs
 */
export function parseQuery(search: string): QueryParams {
  if (!search) return {};

  const query: QueryParams = {};
  const params = new URLSearchParams(search);

  for (const [key, value] of params.entries()) {
    const existing = query[key];
    if (existing === undefined) {
      query[key] = value;
    } else if (Array.isArray(existing)) {
      existing.push(value);
    } else {
      query[key] = [existing, value];
    }
  }

  return query;
}

/**
 * Stringify query params back to a query string
 */
export function stringifyQuery(query: QueryParams): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (Array.isArray(value)) {
      for (const v of value) {
        params.append(key, v);
      }
    } else {
      params.append(key, value);
    }
  }

  const str = params.toString();
  return str;
}

/**
 * Create a Location object from various inputs
 */
export function createLocation(target: NavigationTarget, state?: unknown): Location {
  if (typeof target === 'string') {
    const { path, search, hash } = parsePath(target);
    return {
      href: target,
      path,
      search,
      query: parseQuery(search),
      hash,
      state: state ?? null,
    };
  }

  const search = target.query ? stringifyQuery(target.query) : '';
  const hash = target.hash ?? '';
  let href = target.path;
  if (search) href += '?' + search;
  if (hash) href += '#' + hash;

  return {
    href,
    path: target.path,
    search,
    query: target.query ?? {},
    hash,
    state: target.state ?? state ?? null,
  };
}

/**
 * Normalize a path - ensures leading slash, removes trailing slash (except for root)
 */
export function normalizePath(path: string): string {
  // Ensure leading slash
  if (!path.startsWith('/')) {
    path = '/' + path;
  }

  // Remove duplicate slashes first
  path = path.replace(/\/+/g, '/');

  // Remove trailing slash (except for root path)
  if (path !== '/' && path.endsWith('/')) {
    path = path.slice(0, -1);
  }

  return path;
}

/**
 * Join parent and child paths
 */
export function joinPaths(parent: string, child: string): string {
  // Handle root child path - it's relative to parent
  if (child === '/' || child === '') {
    return normalizePath(parent);
  }

  // Remove leading slash from child since we're joining
  const childPath = child.startsWith('/') ? child.slice(1) : child;

  // Ensure parent has trailing slash for joining
  const parentPath = parent.endsWith('/') ? parent : parent + '/';

  return normalizePath(parentPath + childPath);
}

// =============================================================================
// Route Compilation
// =============================================================================

/**
 * Escape regex special characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Compile a path pattern into a regex and extract param names
 */
export function compilePath(path: string): { regex: RegExp; paramNames: string[]; isCatchAll: boolean } {
  const paramNames: string[] = [];
  let isCatchAll = false;

  // Handle catch-all route
  if (path === '*' || path === '/*' || path.endsWith('/*') || path.endsWith('*')) {
    isCatchAll = true;
    // Remove trailing * or /* for base path
    const basePath = path.replace(/\/?\*$/, '') || '/';
    const baseRegex = basePath === '/' 
      ? '' 
      : escapeRegex(normalizePath(basePath));
    
    // Catch-all captures everything after base path
    paramNames.push('*');
    return {
      regex: new RegExp(`^${baseRegex}(?:/(.*))?$`),
      paramNames,
      isCatchAll,
    };
  }

  // Build regex pattern
  let pattern = '';
  const segments = normalizePath(path).split('/').filter(Boolean);

  for (const segment of segments) {
    pattern += '/';

    if (segment.startsWith(':')) {
      // Parameter segment
      const paramName = segment.slice(1);
      
      // Check for optional parameter (ends with ?)
      if (paramName.endsWith('?')) {
        const name = paramName.slice(0, -1);
        paramNames.push(name);
        // Optional param - group is optional
        pattern = pattern.slice(0, -1); // Remove the leading slash we just added
        pattern += `(?:/([^/]+))?`;
      } else {
        paramNames.push(paramName);
        pattern += '([^/]+)';
      }
    } else {
      // Static segment
      pattern += escapeRegex(segment);
    }
  }

  // Handle root path
  if (pattern === '') {
    pattern = '/';
  }

  // Exact match ($ at end)
  return {
    regex: new RegExp(`^${pattern}$`),
    paramNames,
    isCatchAll,
  };
}

/**
 * Extract inline guard objects from guard specification
 * String guards are resolved at navigation time from the registry
 */
function extractInlineGuards(
  guard: RouteDefinition['guard']
): RouteGuard[] {
  if (!guard) return [];

  const guards: RouteGuard[] = [];
  const guardList = Array.isArray(guard) ? guard : [guard];

  for (const g of guardList) {
    if (typeof g !== 'string') {
      // Direct guard object - add to inline guards
      guards.push(g);
    }
    // String guards are resolved at navigation time
  }

  return guards;
}

/**
 * Options for route compilation
 */
export interface CompileRouteOptions {
  /** Guard registry for resolving named guards */
  guardRegistry: Map<string, RouteGuard>;
  /** Global lazy loading defaults */
  lazyDefaults: LazyDefaults | undefined;
}

/**
 * Compile a route definition into a CompiledRoute
 */
export function compileRoute(
  definition: RouteDefinition,
  parent: CompiledRoute | null,
  options: CompileRouteOptions
): CompiledRoute {
  const { lazyDefaults } = options;
  const normalizedPath = normalizePath(definition.path);
  const fullPath = parent ? joinPaths(parent.fullPath, normalizedPath) : normalizedPath;
  const { regex, paramNames, isCatchAll } = compilePath(fullPath);

  const compiled: CompiledRoute = {
    path: normalizedPath,
    fullPath,
    regex,
    paramNames,
    guards: extractInlineGuards(definition.guard),
    children: [],
    parent,
    meta: definition.meta ?? {},
    isCatchAll,
  };

  // Store original guard spec for runtime resolution
  if (definition.guard !== undefined) {
    compiled.guardSpec = definition.guard;
  }

  // Process component - handles inline lazy imports, static components, and pre-wrapped lazy
  if (definition.component !== undefined) {
    const processedComponent = processRouteComponent(
      definition.component,
      definition.export,       // Named export from lazy module
      definition.lazy,         // Per-route lazy config
      lazyDefaults             // Global lazy defaults
    );
    if (processedComponent !== undefined) {
      compiled.component = processedComponent;
    }
  }

  // Store lazy loading metadata for router outlet use
  if (definition.export !== undefined) {
    compiled.exportName = definition.export;
  }
  if (definition.loading !== undefined) {
    compiled.loadingComponent = definition.loading;
  }
  if (definition.lazy !== undefined) {
    compiled.lazyConfig = definition.lazy;
  }

  if (definition.redirect !== undefined) {
    compiled.redirect = definition.redirect;
  }
  if (definition.name !== undefined) {
    compiled.name = definition.name;
  }
  if (definition.preload !== undefined) {
    compiled.preload = definition.preload;
  }

  // Compile children recursively
  if (definition.children) {
    compiled.children = definition.children.map((child) =>
      compileRoute(child, compiled, options)
    );
  }

  return compiled;
}

/**
 * Compile all route definitions
 */
export function compileRoutes(
  definitions: RouteDefinition[],
  guardRegistry: Map<string, RouteGuard> = new Map(),
  lazyDefaults?: LazyDefaults
): CompiledRoute[] {
  const options: CompileRouteOptions = { guardRegistry, lazyDefaults };
  return definitions.map((def) => compileRoute(def, null, options));
}

// =============================================================================
// Route Matching
// =============================================================================

/**
 * Extract parameters from a path prefix for a parent route
 * Used when a child route matches and we need to include the parent in the chain
 */
function extractPrefixParams(path: string, route: CompiledRoute): RouteParams {
  const params: RouteParams = {};
  
  // If there are no params in the route, return empty
  if (route.paramNames.length === 0) {
    return params;
  }
  
  // Build a prefix-matching regex (without $ anchor)
  const normalizedPath = normalizePath(path);
  const segments = normalizePath(route.fullPath).split('/').filter(Boolean);
  
  let pattern = '';
  const paramIndices: number[] = [];
  let paramIndex = 0;
  
  for (const segment of segments) {
    pattern += '/';
    if (segment.startsWith(':')) {
      const paramName = segment.slice(1);
      if (paramName.endsWith('?')) {
        pattern = pattern.slice(0, -1);
        pattern += `(?:/([^/]+))?`;
      } else {
        pattern += '([^/]+)';
      }
      paramIndices.push(paramIndex++);
    } else {
      pattern += escapeRegex(segment);
    }
  }
  
  // Use prefix matching (no $ anchor)
  const prefixRegex = new RegExp(`^${pattern}`);
  const match = prefixRegex.exec(normalizedPath);
  
  if (match) {
    for (let i = 0; i < route.paramNames.length; i++) {
      const paramName = route.paramNames[i]!;
      const value = match[i + 1];
      if (value !== undefined) {
        params[paramName] = decodeURIComponent(value);
      }
    }
  }
  
  return params;
}

/**
 * Match a path against a single compiled route
 */
export function matchRoute(path: string, route: CompiledRoute): MatchedRoute | null {
  const normalizedPath = normalizePath(path);
  const match = route.regex.exec(normalizedPath);

  if (!match) return null;

  // Extract params
  const params: RouteParams = {};
  for (let i = 0; i < route.paramNames.length; i++) {
    const paramName = route.paramNames[i]!;
    const value = match[i + 1];
    if (value !== undefined) {
      params[paramName] = decodeURIComponent(value);
    }
  }

  return { route, params };
}

/**
 * Recursively find matching routes in the tree
 */
function findMatchingRoute(
  path: string,
  routes: CompiledRoute[],
  parentParams: RouteParams = {}
): RouteMatch | null {
  const normalizedPath = normalizePath(path);

  for (const route of routes) {
    // Try to match this route
    const matched = matchRoute(normalizedPath, route);

    if (matched) {
      // Merge with parent params
      const combinedParams = { ...parentParams, ...matched.params };
      const matchedWithParams: MatchedRoute = {
        route: matched.route,
        params: combinedParams,
      };

      // If this route has children, try to match them first
      // But only if this is not a catch-all route and has a component
      if (route.children.length > 0 && !route.isCatchAll) {
        const childMatch = findMatchingRoute(normalizedPath, route.children, combinedParams);
        if (childMatch) {
          // Prepend this route to the match chain
          return [matchedWithParams, ...childMatch];
        }
      }

      // Return this match (could be leaf or parent with no matching children)
      return [matchedWithParams];
    }

    // If no direct match, try children anyway for nested paths
    // This handles cases where parent path is a prefix
    if (route.children.length > 0) {
      // Check if this route's path is a prefix of the target path
      const routeBasePath = route.fullPath === '/' ? '' : route.fullPath;
      if (normalizedPath.startsWith(routeBasePath + '/') || normalizedPath === routeBasePath) {
        const childMatch = findMatchingRoute(normalizedPath, route.children, parentParams);
        if (childMatch) {
          // Include the parent in the chain if it has a component (layout route)
          // For nested routes, the parent should be included even if it doesn't "match" the full path
          if (route.component !== undefined) {
            // Extract any params from the parent's path prefix
            const prefixParams = extractPrefixParams(normalizedPath, route);
            return [{ route, params: { ...parentParams, ...prefixParams } }, ...childMatch];
          }
          return childMatch;
        }
      }
    }
  }

  return null;
}

/**
 * Match a path against compiled routes
 * Returns array of matched routes (for nested routes) or null if no match
 */
export function matchRoutes(path: string, routes: CompiledRoute[]): RouteMatch | null {
  const { path: pathname } = parsePath(path);
  return findMatchingRoute(pathname, routes);
}

/**
 * Find a route by name in the route tree
 */
export function findRouteByName(name: string, routes: CompiledRoute[]): CompiledRoute | undefined {
  for (const route of routes) {
    if (route.name === name) return route;
    if (route.children.length > 0) {
      const found = findRouteByName(name, route.children);
      if (found) return found;
    }
  }
  return undefined;
}

/**
 * Generate a path from a route and params
 */
export function generatePath(route: CompiledRoute, params: RouteParams = {}): string {
  let path = route.fullPath;

  // Replace params
  for (const [name, value] of Object.entries(params)) {
    if (name === '*') {
      // Handle catch-all - append to base path
      const basePath = path.replace(/\/?\*$/, '') || '';
      path = basePath + '/' + value;
    } else {
      // Try optional param first (has ? suffix), then regular param
      // This order matters because :id would match the :id part of :id?
      const optionalReplaced = path.replace(`:${name}?`, encodeURIComponent(value));
      if (optionalReplaced !== path) {
        path = optionalReplaced;
      } else {
        path = path.replace(`:${name}`, encodeURIComponent(value));
      }
    }
  }

  // Remove any remaining optional params that weren't provided
  path = path.replace(/\/:[^/]+\?/g, '');

  return normalizePath(path);
}

/**
 * Check if a path is active (matches current location)
 */
export function isPathActive(
  currentPath: string,
  targetPath: string,
  exact: boolean = false
): boolean {
  const normalizedCurrent = normalizePath(currentPath);
  const normalizedTarget = normalizePath(targetPath);

  if (exact) {
    return normalizedCurrent === normalizedTarget;
  }

  // Partial match - target is a prefix of current
  if (normalizedTarget === '/') {
    return true; // Root always matches
  }

  return (
    normalizedCurrent === normalizedTarget ||
    normalizedCurrent.startsWith(normalizedTarget + '/')
  );
}

// =============================================================================
// Route Flattening (for debugging/inspection)
// =============================================================================

/**
 * Flatten route tree into a list of all routes
 */
export function flattenRoutes(routes: CompiledRoute[]): CompiledRoute[] {
  const result: CompiledRoute[] = [];

  function traverse(routeList: CompiledRoute[]) {
    for (const route of routeList) {
      result.push(route);
      if (route.children.length > 0) {
        traverse(route.children);
      }
    }
  }

  traverse(routes);
  return result;
}
