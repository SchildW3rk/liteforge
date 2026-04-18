/**
 * LiteForge Vite Plugin Utilities
 *
 * Vite-specific helpers. The core transform utilities (shouldTransform,
 * isNodeModules, isEventHandler, etc.) now live in @liteforge/transform.
 */

import type { LiteForgePluginOptions, ResolvedPluginOptions } from './types.js';

// Re-export from @liteforge/transform for backward compat (tests import from this file)
export {
  shouldTransform,
  isNodeModules,
  mightContainJsx,
  isEventHandler,
  isComponent,
  createHImport,
} from '@liteforge/transform';

// =============================================================================
// Option Resolution
// =============================================================================

const DEFAULT_OPTIONS: ResolvedPluginOptions = {
  extensions: ['.tsx', '.jsx'],
  hmr: true,
  importSource: '@liteforge/runtime',
  templateExtraction: true,
  autoWrapProps: true,
};

export function resolveOptions(
  options: LiteForgePluginOptions | undefined,
  isDev: boolean
): ResolvedPluginOptions {
  return {
    extensions: options?.extensions ?? DEFAULT_OPTIONS.extensions,
    hmr: options?.hmr ?? (isDev ? DEFAULT_OPTIONS.hmr : false),
    importSource: options?.importSource ?? DEFAULT_OPTIONS.importSource,
    templateExtraction: options?.templateExtraction ?? DEFAULT_OPTIONS.templateExtraction,
    autoWrapProps: options?.autoWrapProps ?? DEFAULT_OPTIONS.autoWrapProps,
  };
}
