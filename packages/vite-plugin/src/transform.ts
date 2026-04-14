/**
 * LiteForge JSX Transform
 * 
 * Main entry point for transforming JSX/TSX code into h() calls.
 * Uses Babel for parsing and our custom visitor for transformation.
 * 
 * Supports two modes:
 * 1. h() calls (default in dev): Simple, predictable, good for debugging
 * 2. Template extraction (default in prod): Optimized, clones static HTML
 */

import { parse } from '@babel/parser';
import * as traverseModule from '@babel/traverse';
import * as generateModule from '@babel/generator';

// Handle ESM/CJS interop - Babel packages may have their default nested
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const traverse = (traverseModule as any).default?.default ?? (traverseModule as any).default ?? traverseModule;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generate = (generateModule as any).default?.default ?? (generateModule as any).default ?? generateModule;
import type { TransformResult, JsxTransformState, ResolvedPluginOptions } from './types.js';
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
// Main Transform API
// =============================================================================

/**
 * Transform JSX code to h() calls or template extraction
 */
export function transform(
  code: string,
  options: ResolvedPluginOptions,
  isDev = false
): TransformResult {
  // Quick check: skip files that definitely don't have JSX
  if (!mightContainJsx(code)) {
    return {
      code,
      hasJsx: false,
      hasFragment: false,
    };
  }

  // Determine if template extraction should be used
  const useTemplateExtraction = resolveTemplateExtraction(
    options.templateExtraction,
    isDev
  );

  if (useTemplateExtraction) {
    return transformWithTemplates(code, options);
  }

  return transformWithHCalls(code, options);
}

/**
 * Resolve template extraction option to a boolean
 */
function resolveTemplateExtraction(
  option: boolean | 'auto',
  isDev: boolean
): boolean {
  if (option === 'auto') {
    return !isDev; // Enable in production
  }
  return option;
}

/**
 * Transform using h() calls (simpler, better for debugging)
 */
function transformWithHCalls(
  code: string,
  options: ResolvedPluginOptions
): TransformResult {
  // Parse the code
  const ast = parse(code, {
    sourceType: 'module',
    plugins: ['jsx', 'typescript'],
  });

  // Create transform state
  const state: JsxTransformState = {
    hasJsx: false,
    hasFragment: false,
    hasHImport: false,
    hasFragmentImport: false,
    importSource: options.importSource,
    autoWrapProps: options.autoWrapProps,
  };

  // Check for existing imports
  checkExistingImports(ast, state);

  // Transform For() calls BEFORE JSX transform:
  // Rewrites each in getter, rewrites item property accesses in children body.
  // Must run on raw JSX nodes so it can see JSXExpressionContainers directly.
  traverse(ast, createForTransformVisitor());

  // Transform JSX using our custom visitor
  const visitor = createJsxVisitor(state);
  traverse(ast, visitor);

  // If no JSX was found, return original code
  if (!state.hasJsx) {
    return {
      code,
      hasJsx: false,
      hasFragment: false,
    };
  }

  // Generate code from the transformed AST
  const output = generate(ast, {
    retainLines: true,
    compact: false,
  });

  // Add imports if needed
  let finalCode = output.code;
  if (state.hasJsx && !state.hasHImport) {
    const importStatement = createHImport(
      options.importSource,
      state.hasFragment && !state.hasFragmentImport
    );
    finalCode = importStatement + finalCode;
  }

  return {
    code: finalCode,
    map: output.map,
    hasJsx: state.hasJsx,
    hasFragment: state.hasFragment,
  };
}

/**
 * Transform using template extraction (optimized for production)
 */
function transformWithTemplates(
  code: string,
  options: ResolvedPluginOptions
): TransformResult {
  // Parse the code
  const ast = parse(code, {
    sourceType: 'module',
    plugins: ['jsx', 'typescript'],
  });

  // Create extended transform state for template extraction
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

  // Check for existing imports
  checkExistingImports(ast, state);

  // Transform For() calls before JSX transform (needs raw JSX nodes)
  traverse(ast, createForTransformVisitor());

  // Transform JSX using template extraction visitor
  const visitor = createTemplateVisitor(state);
  traverse(ast, visitor);

  // If no JSX was found, return original code
  if (!state.hasJsx) {
    return {
      code,
      hasJsx: false,
      hasFragment: false,
    };
  }

  // Hoist template declarations to module level
  hoistTemplateDeclarations(ast, state.templateDeclarations);

  // Generate code from the transformed AST
  const output = generate(ast, {
    retainLines: true,
    compact: false,
  });

  // Build imports
  let finalCode = output.code;
  
  // Add h() and Fragment imports if needed
  if (state.hasJsx && !state.hasHImport) {
    const importStatement = createHImport(
      options.importSource,
      state.hasFragment && !state.hasFragmentImport
    );
    finalCode = importStatement + finalCode;
  }

  // Add template runtime imports if needed
  if (state.templateImports.size > 0) {
    const missingImports = checkTemplateImports(
      ast,
      state.templateImports,
      options.importSource
    );
    
    if (missingImports.size > 0) {
      const templateImport = createTemplateImportStatement(
        missingImports,
        options.importSource
      );
      finalCode = templateImport + finalCode;
    }
  }

  return {
    code: finalCode,
    map: output.map,
    hasJsx: state.hasJsx,
    hasFragment: state.hasFragment,
  };
}

/**
 * Create template runtime import statement
 */
function createTemplateImportStatement(
  imports: Set<string>,
  importSource: string
): string {
  const importNames = Array.from(imports).join(', ');
  return `import { ${importNames} } from '${importSource}';\n`;
}

/**
 * Transform JSX code - simplified API for testing
 */
export function transformCode(
  code: string,
  importSource = '@liteforge/runtime',
  useTemplateExtraction = false
): string {
  const result = transform(
    code,
    {
      extensions: ['.tsx', '.jsx'],
      hmr: false,
      importSource,
      templateExtraction: useTemplateExtraction,
      autoWrapProps: true,
    },
    !useTemplateExtraction // isDev = opposite of useTemplateExtraction for this API
  );
  return result.code;
}

// =============================================================================
// Import Detection
// =============================================================================

/**
 * Check if the file already has h and/or Fragment imports
 */
function checkExistingImports(
  ast: ReturnType<typeof parse>,
  state: JsxTransformState
): void {
  for (const node of ast.program.body) {
    if (node.type !== 'ImportDeclaration') {
      continue;
    }

    // Check if this import is from our import source
    if (node.source.value !== state.importSource) {
      continue;
    }

    // Check imported specifiers
    for (const specifier of node.specifiers) {
      if (specifier.type !== 'ImportSpecifier') {
        continue;
      }

      const imported = specifier.imported;
      const name = imported.type === 'Identifier' ? imported.name : imported.value;

      if (name === 'h') {
        state.hasHImport = true;
      }
      if (name === 'Fragment') {
        state.hasFragmentImport = true;
      }
    }
  }
}
