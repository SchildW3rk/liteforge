/**
 * LiteForge Vite Plugin
 *
 * Vite adapter over @liteforge/transform. Converts JSX/TSX into LiteForge
 * h() calls with signal-safe getter wrapping.
 *
 * Usage:
 * ```ts
 * import liteforge from '@liteforge/vite-plugin';
 *
 * export default defineConfig({
 *   plugins: [liteforge()]
 * });
 * ```
 */

import type { Plugin } from 'vite';
import type { LiteForgePluginOptions, ResolvedPluginOptions } from './types.js';
import { resolveOptions } from './utils.js';
import { transform } from './transform.js';
import { appendHmrCode, hasHmrAcceptance, injectHmrIds } from './hmr.js';
import { shouldTransform, isNodeModules } from '@liteforge/transform';

// =============================================================================
// Plugin Factory
// =============================================================================

export default function liteforgePlugin(options?: LiteForgePluginOptions): Plugin {
  let resolvedOptions: ResolvedPluginOptions;
  let isDev = false;

  return {
    name: 'vite-plugin-liteforge',
    enforce: 'pre',

    configResolved(config) {
      isDev = config.command === 'serve';
      resolvedOptions = resolveOptions(options, isDev);
    },

    transform(code: string, id: string) {
      if (isNodeModules(id)) return null;
      if (!shouldTransform(id, resolvedOptions.extensions)) return null;

      const result = transform(code, resolvedOptions, isDev);
      if (!result.hasJsx) return null;

      let finalCode = result.code;
      if (isDev && resolvedOptions.hmr) {
        finalCode = injectHmrIds(finalCode, id);
        if (!hasHmrAcceptance(finalCode)) {
          finalCode = appendHmrCode(finalCode, id);
        }
      }

      return {
        code: finalCode,
        map: result.map ?? { mappings: '' },
      };
    },
  };
}

// =============================================================================
// Re-exports
// =============================================================================

// Types
export type { LiteForgePluginOptions, ResolvedPluginOptions } from './types.js';

// Transform (for testing / adapters)
export { transform, transformCode } from './transform.js';

// HMR utilities
export { injectHmrIds, generateHmrCode, appendHmrCode, hasHmrAcceptance } from './hmr.js';

// Core transform utilities (re-exported from @liteforge/transform for convenience)
export {
  shouldWrapExpression,
  isStaticExpression,
  wrapInGetter,
  isEventHandler,
  isComponent,
  shouldTransform,
  analyzeElement,
  extractElementInfo,
  generateTemplateString,
  resolvePaths,
  pathToAccessor,
  compileTemplate,
  generateModuleTemplates,
  type ElementInfo,
  type ChildInfo,
  type TemplateAnalysis,
  type ElementClassification,
  type DomPath,
  type PathStep,
  type PathResolution,
  type CompiledTemplate,
} from '@liteforge/transform';
