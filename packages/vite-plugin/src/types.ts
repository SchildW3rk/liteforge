/**
 * LiteForge Vite Plugin Types
 *
 * Type definitions specific to the Vite plugin adapter.
 * Core transform types live in @liteforge/transform.
 */

import type { Plugin } from 'vite';
import type { TransformOptions } from '@liteforge/transform';

// =============================================================================
// Plugin Options
// =============================================================================

/**
 * Options for the LiteForge Vite plugin.
 * Extends TransformOptions with Vite-specific settings.
 */
export interface LiteForgePluginOptions extends TransformOptions {
  /** Enable HMR support (default: true in dev mode) */
  hmr?: boolean;
}

/**
 * Resolved options with defaults applied
 */
export interface ResolvedPluginOptions {
  extensions: string[];
  hmr: boolean;
  importSource: string;
  templateExtraction: boolean | 'auto';
  autoWrapProps: boolean;
}

// =============================================================================
// Vite Plugin Type
// =============================================================================

export type LiteForgePlugin = Plugin;
