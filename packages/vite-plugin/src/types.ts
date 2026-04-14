/**
 * LiteForge Vite Plugin Types
 * 
 * Type definitions for the JSX transform plugin.
 */

import type { Plugin } from 'vite';

// =============================================================================
// Plugin Options
// =============================================================================

/**
 * Options for the LiteForge Vite plugin
 */
export interface LiteForgePluginOptions {
  /** File extensions to transform (default: ['.tsx', '.jsx']) */
  extensions?: string[];
  /** Enable HMR support (default: true in dev mode) */
  hmr?: boolean;
  /** Import source for h() and Fragment (default: '@liteforge/runtime') */
  importSource?: string;
  /**
   * Enable template extraction optimization (default: true).
   * Template extraction clones static HTML structures instead of calling
   * createElement repeatedly — faster and produces the same output in dev and prod.
   * Set to false only when debugging JSX transform issues.
   *
   * @example
   * ```ts
   * // Only disable for debugging transform issues:
   * // templateExtraction: false,
   * ```
   */
  templateExtraction?: boolean | 'auto';
  /**
   * Automatically wrap `props.*` member accesses in JSX content position with
   * a reactive getter (default: true).
   *
   * When enabled, `{props.label}` is transformed to `{() => props.label}` at
   * compile time, preventing the common silent reactivity bug where a props
   * access evaluates once and never updates.
   *
   * Disable only if you intentionally read props once at render time.
   *
   * **Known limitation:** only `props.x` / `props.x.y` syntax is detected.
   * Destructured props (`const { label } = props`) are not auto-wrapped.
   *
   * @example
   * ```ts
   * // Opt out globally (not recommended):
   * liteforge({ autoWrapProps: false })
   * ```
   */
  autoWrapProps?: boolean;
}

/**
 * Resolved options with defaults applied
 */
export interface ResolvedPluginOptions {
  extensions: string[];
  hmr: boolean;
  importSource: string;
  templateExtraction: boolean | 'auto';
  /** Auto-wrap props.* accesses in JSX content position (default: true) */
  autoWrapProps: boolean;
}

// =============================================================================
// Transform Context
// =============================================================================

/**
 * Context passed during transformation
 */
export interface TransformContext {
  /** The file ID being transformed */
  id: string;
  /** Whether we're in development mode */
  isDev: boolean;
  /** Resolved plugin options */
  options: ResolvedPluginOptions;
}

/**
 * Source map object (compatible with Rollup/Vite and Babel)
 */
export interface SourceMap {
  version: number;
  sources: string[];
  names: string[];
  sourceRoot?: string | undefined;
  sourcesContent?: string[] | undefined;
  mappings: string;
  file?: string | undefined;
}

/**
 * Result of a transform operation
 */
export interface TransformResult {
  /** The transformed code */
  code: string;
  /** Source map (if available) */
  map?: SourceMap | null;
  /** Whether JSX was found and transformed */
  hasJsx: boolean;
  /** Whether Fragment was used */
  hasFragment: boolean;
}

// =============================================================================
// JSX Transform State
// =============================================================================

/**
 * State tracked during JSX transformation
 */
export interface JsxTransformState {
  /** Whether any JSX was found */
  hasJsx: boolean;
  /** Whether Fragment (<>...</>) was used */
  hasFragment: boolean;
  /** Whether h import already exists */
  hasHImport: boolean;
  /** Whether Fragment import already exists */
  hasFragmentImport: boolean;
  /** The import source to use */
  importSource: string;
  /** Auto-wrap props.* accesses in JSX content position */
  autoWrapProps: boolean;
}

// =============================================================================
// Vite Plugin Type
// =============================================================================

/**
 * The LiteForge Vite plugin type
 */
export type LiteForgePlugin = Plugin;
