/**
 * LiteForge Context System
 *
 * Provides a scoped context chain with no provider components.
 * Context flows from app → parent components → child components.
 */

import type { ContextValues, UseFn } from './types.js';
import { createGlobalSingleton } from './_singleton.js';

// ============================================================================
// Context Stack
// ============================================================================

/**
 * Stack of context scopes. Each scope is a map of key → value.
 * The bottom of the stack is the app-level context.
 * Components can push their own scope when they have `provide`.
 *
 * Backed by a `globalThis` singleton to survive bundle duplication — see
 * `./_singleton.ts` for the rationale. All module instances of `context.ts`
 * share the same underlying array.
 */
const contextStack = createGlobalSingleton<ContextValues[]>('contextStack', () => []);

// ============================================================================
// Public API
// ============================================================================

/**
 * Get a value from the context chain.
 * Searches from the current scope up to the app root.
 *
 * @param key - The context key to look up
 * @returns The value associated with the key
 * @throws Error if key is not found in any scope
 */
export function use<K extends keyof import('./types.js').PluginRegistry>(key: K): import('./types.js').PluginRegistry[K];
export function use<T = unknown>(key: string): T;
export function use<T = unknown>(key: string): T {
  // Search from top of stack (innermost scope) to bottom (app scope)
  for (let i = contextStack.length - 1; i >= 0; i--) {
    const scope = contextStack[i];
    if (scope && key in scope) {
      return scope[key] as T;
    }
  }

  throw new Error(`Context key "${key}" not found. Make sure it's provided in defineApp() or a parent component's provide().`);
}

/**
 * Check if a context key exists without throwing.
 *
 * @param key - The context key to check
 * @returns True if the key exists in any scope
 */
export function hasContext(key: string): boolean {
  for (let i = contextStack.length - 1; i >= 0; i--) {
    const scope = contextStack[i];
    if (scope && key in scope) {
      return true;
    }
  }
  return false;
}

// ============================================================================
// Internal API (used by defineComponent and defineApp)
// ============================================================================

/**
 * Push a new context scope onto the stack.
 * Used when entering a component with `provide`.
 *
 * @param values - The context values to add to the scope
 */
export function pushContext(values: ContextValues): void {
  contextStack.push(values);
}

/**
 * Pop the current context scope from the stack.
 * Used when exiting a component with `provide`.
 */
export function popContext(): void {
  contextStack.pop();
}

/**
 * Initialize the app-level context (bottom of stack).
 * Should only be called once by defineApp().
 *
 * @param values - The app-level context values
 */
export function initAppContext(values: ContextValues): void {
  // Clear any existing context and set the app context as the base
  contextStack.length = 0;
  contextStack.push(values);
}

/**
 * Clear all context (used for cleanup/testing).
 */
export function clearContext(): void {
  contextStack.length = 0;
}

/**
 * Get the current context depth (for debugging/testing).
 */
export function getContextDepth(): number {
  return contextStack.length;
}

/**
 * Run a function with a temporary context scope.
 * The scope is automatically popped after the function completes.
 *
 * @param values - The context values for this scope
 * @param fn - The function to run within the scope
 * @returns The return value of the function
 */
export function withContext<T>(values: ContextValues, fn: () => T): T {
  pushContext(values);
  try {
    return fn();
  } finally {
    popContext();
  }
}

/**
 * Create a use function bound to the current context state.
 * This captures the current stack depth so the function works correctly
 * even if called later when the context has changed.
 */
export function createBoundUse(): UseFn {
  // The use function always reads from the current stack,
  // which includes any scopes pushed by parent components
  return use as UseFn;
}

/**
 * Get a snapshot of all current context values merged together.
 * Used by HMR to capture context state for later restoration.
 * 
 * @returns A shallow merge of all context scopes from bottom to top
 */
export function getContextSnapshot(): ContextValues {
  const merged: ContextValues = {};
  for (const scope of contextStack) {
    Object.assign(merged, scope);
  }
  return merged;
}
