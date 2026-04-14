/**
 * LiteForge Template Extraction JSX Visitor
 * 
 * Alternative JSX visitor that uses template extraction for static subtrees.
 * Falls back to h() calls for dynamic elements and components.
 * 
 * This visitor is used instead of jsx-visitor.ts when template extraction is enabled.
 */

import type { Visitor, NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import type { JsxTransformState } from './types.js';
import { analyzeElement } from './template-extractor.js';
import { compileTemplate } from './template-compiler.js';
import { transformJsxElement, transformJsxFragment } from './jsx-visitor.js';

// =============================================================================
// Types
// =============================================================================

/**
 * Extended state for template extraction
 */
export interface TemplateTransformState extends JsxTransformState {
  /** Counter for unique template names */
  templateCounter: number;
  /** Template declarations to hoist to module level */
  templateDeclarations: t.VariableDeclaration[];
  /** Required template runtime imports */
  templateImports: Set<string>;
}

// =============================================================================
// Visitor Factory
// =============================================================================

/**
 * Create the template extraction JSX visitor
 */
export function createTemplateVisitor(state: TemplateTransformState): Visitor {
  return {
    JSXElement(path: NodePath<t.JSXElement>) {
      state.hasJsx = true;

      // Analyze the element for template extraction.
      // analyzeElement walks the raw JSX AST, so it must run BEFORE any
      // child JSX nodes are replaced (i.e. in enter phase).
      const analysis = analyzeElement(path.node);

      if (analysis.shouldExtract) {
        // Use template extraction
        const compiled = compileTemplate(analysis, ++state.templateCounter);

        // Add template declaration for hoisting
        state.templateDeclarations.push(compiled.templateDeclaration);

        // Add required imports
        for (const imp of compiled.requiredImports) {
          state.templateImports.add(imp);
        }

        // Replace JSX with hydrated expression.
        // After replaceWith, Babel re-queues the new node for traversal,
        // so any inner JSX inside expression containers (e.g. {items.map(i => <li/>)})
        // will still be visited and transformed correctly.
        path.replaceWith(compiled.hydratedExpression);
      } else {
        // Fall back to h() calls for dynamic elements
        const hCall = transformJsxElement(path.node, state.autoWrapProps);
        path.replaceWith(hCall);
      }
    },

    JSXFragment(path: NodePath<t.JSXFragment>) {
      state.hasJsx = true;
      state.hasFragment = true;

      // Fragments always use h() - no benefit from template extraction
      const hCall = transformJsxFragment(path.node, state.autoWrapProps);
      path.replaceWith(hCall);
    },
  };
}

// =============================================================================
// Module-level Template Hoisting
// =============================================================================

/**
 * Insert template declarations at the beginning of the module
 */
export function hoistTemplateDeclarations(
  ast: t.File,
  declarations: t.VariableDeclaration[]
): void {
  if (declarations.length === 0) return;
  
  // Find the first non-import statement
  let insertIndex = 0;
  for (let i = 0; i < ast.program.body.length; i++) {
    const node = ast.program.body[i];
    if (node && node.type !== 'ImportDeclaration') {
      insertIndex = i;
      break;
    }
    insertIndex = i + 1;
  }
  
  // Insert all template declarations
  ast.program.body.splice(insertIndex, 0, ...declarations);
}

/**
 * Create import statement for template runtime functions
 */
export function createTemplateImport(
  imports: Set<string>,
  importSource: string
): t.ImportDeclaration {
  const specifiers = Array.from(imports).map((name) =>
    t.importSpecifier(t.identifier(name), t.identifier(name))
  );
  
  return t.importDeclaration(specifiers, t.stringLiteral(importSource));
}

/**
 * Check if template imports already exist and track what's missing
 */
export function checkTemplateImports(
  ast: t.File,
  requiredImports: Set<string>,
  importSource: string
): Set<string> {
  const existingImports = new Set<string>();
  
  for (const node of ast.program.body) {
    if (node.type !== 'ImportDeclaration') continue;
    if (node.source.value !== importSource) continue;
    
    for (const specifier of node.specifiers) {
      if (specifier.type !== 'ImportSpecifier') continue;
      
      const imported = specifier.imported;
      const name = imported.type === 'Identifier' ? imported.name : imported.value;
      existingImports.add(name);
    }
  }
  
  // Return imports that are needed but don't exist
  const missing = new Set<string>();
  for (const imp of requiredImports) {
    if (!existingImports.has(imp)) {
      missing.add(imp);
    }
  }
  
  return missing;
}
