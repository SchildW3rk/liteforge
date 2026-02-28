/**
 * Router Configuration
 * 
 * Demonstrates:
 * - createRouter with browser history
 * - Route guards (auth, admin)
 * - Nested routes with layouts
 * - **NEW: Inline lazy loading** (no more manual lazy() wrappers!)
 * - Route preloading
 * - Middleware (logging, title updates)
 * - Global lazyDefaults configuration
 */

import {
  createRouter,
  createBrowserHistory,
  defineGuard,
  defineMiddleware,
  type RouteDefinition,
  type LazyDefaults,
} from '@liteforge/router';
import { authStore } from './stores/auth.js';
import { uiStore } from './stores/ui.js';

// Static imports (small pages needed immediately)
import { HomePage } from './pages/Home.js';
import { LoginPage } from './pages/Login.js';
import { NotFoundPage } from './pages/NotFound.js';

// =============================================================================
// Global Lazy Loading Defaults
// =============================================================================

/**
 * Global configuration for all lazy-loaded routes.
 * Individual routes can override these with the `lazy` field.
 */
export const lazyDefaults: LazyDefaults = {
  delay: 200,      // Wait 200ms before showing loading state
  timeout: 10000,  // Error after 10 seconds
  loading: () => {
    const div = document.createElement('div');
    div.className = 'lazy-loading';
    div.textContent = 'Loading...';
    return div;
  },
};

// =============================================================================
// Loading Components (for route-specific overrides)
// =============================================================================

function DashboardLoading(): Node {
  const div = document.createElement('div');
  div.className = 'lazy-loading dashboard-loading';
  div.textContent = 'Loading dashboard...';
  return div;
}

function AdminLoading(): Node {
  const div = document.createElement('div');
  div.className = 'lazy-loading admin-loading';
  div.textContent = 'Loading admin panel...';
  return div;
}

// =============================================================================
// Guards
// =============================================================================

/**
 * Auth guard - requires user to be logged in
 */
export const authGuard = defineGuard('auth', async ({ to }) => {
  // Wait for auth to initialize
  if (!authStore.initialized()) {
    await authStore.initialize();
  }

  if (!authStore.isAuthenticated()) {
    console.log('[AuthGuard] Not authenticated, redirecting to login');
    return `/login?redirect=${encodeURIComponent(to.path)}`;
  }

  return true;
});

/**
 * Admin guard - requires admin role
 */
export const adminGuard = defineGuard('admin', async () => {
  if (!authStore.isAdmin()) {
    console.log('[AdminGuard] Not an admin, blocking access');
    uiStore.notify('error', 'You do not have permission to access this area');
    return '/dashboard';
  }

  return true;
});

/**
 * Guest guard - only for non-authenticated users (login page)
 */
export const guestGuard = defineGuard('guest', async () => {
  // Wait for auth to initialize
  if (!authStore.initialized()) {
    await authStore.initialize();
  }

  if (authStore.isAuthenticated()) {
    console.log('[GuestGuard] Already authenticated, redirecting to dashboard');
    return '/dashboard';
  }

  return true;
});

// =============================================================================
// Middleware
// =============================================================================

/**
 * Logging middleware - logs all navigations
 */
export const loggerMiddleware = defineMiddleware('logger', async (ctx, next) => {
  const start = performance.now();
  console.log(`[Router] Navigating: ${ctx.from?.path ?? '(initial)'} -> ${ctx.to.path}`);
  
  await next();
  
  const elapsed = (performance.now() - start).toFixed(2);
  console.log(`[Router] Navigation complete in ${elapsed}ms`);
});

/**
 * Title middleware - updates document title based on route meta
 */
export const titleMiddleware = defineMiddleware('title', async (ctx, next) => {
  await next();
  
  // Get title from route meta
  const route = ctx.matched[ctx.matched.length - 1];
  const title = (route?.route.meta?.title as string) ?? 'LiteForge Demo';
  uiStore.setPageTitle(title);
});

// =============================================================================
// Routes
// =============================================================================

export const routes: RouteDefinition[] = [
  // ==========================================================================
  // Public routes (static - loaded immediately)
  // ==========================================================================
  {
    path: '/',
    component: HomePage,
    meta: { title: 'Home' },
  },
  {
    path: '/login',
    component: LoginPage,
    guard: guestGuard,
    meta: { title: 'Login' },
  },

  // ==========================================================================
  // Protected dashboard routes (lazy-loaded with inline imports!)
  // 
  // NEW SYNTAX: Just use `() => import('./path')` directly!
  // - Named exports: use `export: 'ComponentName'`
  // - Route-specific config: use `lazy: { delay, timeout }`
  // - Route-specific loading: use `loading: LoadingComponent`
  // ==========================================================================
  {
    path: '/dashboard',
    // Inline lazy import - automatically wrapped!
    component: () => import('./pages/dashboard/Layout.js'),
    export: 'DashboardLayout',  // Named export from module
    loading: DashboardLoading,  // Route-specific loading component
    guard: authGuard,
    meta: { title: 'Dashboard' },
    children: [
      {
        path: '/',
        component: () => import('./pages/dashboard/Home.js'),
        export: 'DashboardHome',
        meta: { title: 'Dashboard' },
      },
      {
        path: '/users',
        component: () => import('./pages/dashboard/Users.js'),
        export: 'UsersPage',
        meta: { title: 'Users' },
      },
      {
        path: '/settings',
        component: () => import('./pages/dashboard/Settings.js'),
        export: 'SettingsPage',
        // Override lazy config for this specific route
        lazy: { delay: 100, timeout: 5000 },
        meta: { title: 'Settings' },
      },
      {
        path: '/posts',
        component: () => import('./pages/dashboard/Posts.js'),
        export: 'PostsPage',
        meta: { title: 'Posts' },
      },
      {
        path: '/posts/:id',
        component: () => import('./pages/dashboard/PostDetail.js'),
        export: 'PostDetailPage',
        meta: { title: 'Post Detail' },
      },
      {
        path: '/forms',
        component: () => import('./pages/dashboard/Forms.js'),
        export: 'FormsPage',
        meta: { title: 'Forms' },
      },
      {
        path: '/tables',
        component: () => import('./pages/dashboard/Tables.js'),
        export: 'TablesPage',
        meta: { title: 'Tables' },
      },
    ],
  },

  // ==========================================================================
  // Admin routes (lazy-loaded, requires admin role)
  // ==========================================================================
  {
    path: '/admin',
    component: () => import('./pages/admin/Layout.js'),
    export: 'AdminLayout',
    loading: AdminLoading,
    guard: [authGuard, adminGuard],
    meta: { title: 'Admin' },
    children: [
      {
        path: '/',
        component: () => import('./pages/admin/Dashboard.js'),
        export: 'AdminDashboard',
        meta: { title: 'Admin Dashboard' },
      },
      {
        path: '/users',
        component: () => import('./pages/admin/Users.js'),
        export: 'AdminUsers',
        meta: { title: 'Manage Users' },
      },
    ],
  },

  // ==========================================================================
  // 404 catch-all (static)
  // ==========================================================================
  {
    path: '*',
    component: NotFoundPage,
    meta: { title: 'Not Found' },
  },
];

// =============================================================================
// Router Instance
// =============================================================================

export function createAppRouter() {
  const history = createBrowserHistory();
  
  const router = createRouter({
    routes,
    history,
    middleware: [loggerMiddleware, titleMiddleware],
    // Global lazy loading configuration - applies to all inline lazy imports
    lazyDefaults,
  });

  // Register guards
  router.registerGuard(authGuard);
  router.registerGuard(adminGuard);
  router.registerGuard(guestGuard);

  return router;
}
