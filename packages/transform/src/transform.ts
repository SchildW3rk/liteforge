/**
 * @liteforge/transform — Main transform entry point
 *
 * Transforms JSX/TSX code into h() calls or template extraction code.
 * Bundler-agnostic: no Vite or Bun dependencies.
 *
 * Two modes:
 * 1. h() calls (dev/debug): simple, predictable, good for debugging
 * 2. Template extraction (prod): clones static HTML templates, faster rendering
 */

import { parse } from '@babel/parser';
import * as traverseModule from '@babel/traverse';
import * as generateModule from '@babel/generator';

// Handle ESM/CJS interop — Babel packages may have their default nested
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const traverse = (traverseModule as any).default?.default ?? (traverseModule as any).default ?? traverseModule;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generate = (generateModule as any).default?.default ?? (generateModule as any).default ?? generateModule;

import type { TransformResult, JsxTransformState, ResolvedTransformOptions } from './types.js';
import { createJsxVisitor } from './jsx-visitor.js';
import { createForTransformVisitor } from './for-transform.js';
import { mightContainJsx, createHImport } from './utils.js';
import {
  createTemplateVisitor,
  hoistTemplateDeclarations,
  checkTemplateImports,
  type TemplateTransformState,
} from './template-visitor.js';

// =============================================================================
// Primary API
// =============================================================================

/**
 * Transform JSX code to h() calls or template extraction.
 *
 * @param code - Source code to transform
 * @param options - Resolved transform options
 * @param isDev - Whether we're in development mode (affects template extraction default)
 */
export function transformJsx(
  code: string,
  options: ResolvedTransformOptions,
  isDev = false
): TransformResult {
  if (!mightContainJsx(code)) {
    return { code, hasJsx: false, hasFragment: false };
  }

  const useTemplateExtraction = resolveTemplateExtraction(options.templateExtraction, isDev);

  if (useTemplateExtraction) {
    return transformWithTemplates(code, options);
  }

  return transformWithHCalls(code, options);
}

function resolveTemplateExtraction(option: boolean | 'auto', isDev: boolean): boolean {
  if (option === 'auto') return !isDev;
  return option;
}

// =============================================================================
// h() call transform (dev mode / debug)
// =============================================================================

function transformWithHCalls(
  code: string,
  options: ResolvedTransformOptions
): TransformResult {
  const ast = parse(code, {
    sourceType: 'module',
    plugins: ['jsx', 'typescript'],
  });

  const state: JsxTransformState = {
    hasJsx: false,
    hasFragment: false,
    hasHImport: false,
    hasFragmentImport: false,
    importSource: options.importSource,
    autoWrapProps: options.autoWrapProps,
  };

  checkExistingImports(ast, state);

  traverse(ast, createForTransformVisitor());
  traverse(ast, createJsxVisitor(state));

  if (!state.hasJsx) {
    return { code, hasJsx: false, hasFragment: false };
  }

  const output = generate(ast, { retainLines: true, compact: false });

  let finalCode = output.code;
  if (!state.hasHImport) {
    finalCode = createHImport(
      options.importSource,
      state.hasFragment && !state.hasFragmentImport
    ) + finalCode;
  }

  return {
    code: finalCode,
    map: output.map,
    hasJsx: state.hasJsx,
    hasFragment: state.hasFragment,
  };
}

// =============================================================================
// Template extraction transform (prod mode)
// =============================================================================

function transformWithTemplates(
  code: string,
  options: ResolvedTransformOptions
): TransformResult {
  const ast = parse(code, {
    sourceType: 'module',
    plugins: ['jsx', 'typescript'],
  });

  const state: TemplateTransformState = {
    hasJsx: false,
    hasFragment: false,
    hasHImport: false,
    hasFragmentImport: false,
    importSource: options.importSource,
    autoWrapProps: options.autoWrapProps,
    templateCounter: 0,
    templateDeclarations: [],
    templateImports: new Set(),
  };

  checkExistingImports(ast, state);

  traverse(ast, createForTransformVisitor());
  traverse(ast, createTemplateVisitor(state));

  if (!state.hasJsx) {
    return { code, hasJsx: false, hasFragment: false };
  }

  hoistTemplateDeclarations(ast, state.templateDeclarations);

  const output = generate(ast, { retainLines: true, compact: false });

  let finalCode = output.code;

  if (!state.hasHImport) {
    finalCode = createHImport(
      options.importSource,
      state.hasFragment && !state.hasFragmentImport
    ) + finalCode;
  }

  if (state.templateImports.size > 0) {
    const missingImports = checkTemplateImports(ast, state.templateImports, options.importSource);
    if (missingImports.size > 0) {
      const names = Array.from(missingImports).join(', ');
      finalCode = `import { ${names} } from '${options.importSource}';\n` + finalCode;
    }
  }

  return {
    code: finalCode,
    map: output.map,
    hasJsx: state.hasJsx,
    hasFragment: state.hasFragment,
  };
}

// =============================================================================
// Import Detection
// =============================================================================

function checkExistingImports(
  ast: ReturnType<typeof parse>,
  state: JsxTransformState
): void {
  for (const node of ast.program.body) {
    if (node.type !== 'ImportDeclaration') continue;
    if (node.source.value !== state.importSource) continue;

    for (const specifier of node.specifiers) {
      if (specifier.type !== 'ImportSpecifier') continue;
      const imported = specifier.imported;
      const name = imported.type === 'Identifier' ? imported.name : imported.value;
      if (name === 'h') state.hasHImport = true;
      if (name === 'Fragment') state.hasFragmentImport = true;
    }
  }
}
