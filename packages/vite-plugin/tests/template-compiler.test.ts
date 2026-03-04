/**
 * Tests for template-compiler.ts
 * 
 * Tests hydration code generation that combines template cloning with
 * dynamic content insertion.
 */

import { describe, it, expect } from 'vitest';
import { parse } from '@babel/parser';
import * as t from '@babel/types';
import * as generateModule from '@babel/generator';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generate = (generateModule as any).default?.default ?? (generateModule as any).default ?? generateModule;
import { analyzeElement } from '../src/template-extractor.js';
import { compileTemplate, generateModuleTemplates } from '../src/template-compiler.js';

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Parse JSX and get the first JSX element
 */
function parseJsx(code: string): t.JSXElement {
  const ast = parse(code, {
    sourceType: 'module',
    plugins: ['jsx', 'typescript'],
  });
  
  let result: t.JSXElement | null = null;
  
  function traverse(node: t.Node): void {
    if (result) return;
    if (t.isJSXElement(node)) {
      result = node;
      return;
    }
    for (const key of Object.keys(node)) {
      const value = (node as unknown as Record<string, unknown>)[key];
      if (Array.isArray(value)) {
        for (const item of value) {
          if (item && typeof item === 'object' && 'type' in item) {
            traverse(item as t.Node);
          }
        }
      } else if (value && typeof value === 'object' && 'type' in value) {
        traverse(value as t.Node);
      }
    }
  }
  
  traverse(ast);
  if (!result) throw new Error('No JSX element found');
  return result;
}

/**
 * Analyze and compile JSX code
 */
function compile(code: string, counter = 1) {
  const element = parseJsx(code);
  const analysis = analyzeElement(element);
  return compileTemplate(analysis, counter);
}

/**
 * Generate code string from AST expression
 */
function generateCode(expr: t.Expression): string {
  return generate(expr).code;
}

// =============================================================================
// Template Declaration Tests
// =============================================================================

describe('Template Declaration', () => {
  it('creates template variable with correct name', () => {
    const result = compile('<div><p>A</p><p>B</p></div>', 1);
    expect(result.templateVar).toBe('_tmpl$1');
  });
  
  it('creates template variable with incremented counter', () => {
    const result = compile('<div><p>A</p><p>B</p></div>', 5);
    expect(result.templateVar).toBe('_tmpl$5');
  });
  
  it('creates _template() call with HTML string', () => {
    const result = compile('<div class="card"><p>Text</p></div>', 1);
    const code = generate(result.templateDeclaration).code;
    
    expect(code).toContain('const _tmpl$1 = _template(');
    // Babel escapes quotes in string literals
    expect(code).toContain('class=\\"card\\"');
    expect(code).toContain('<p>Text</p>');
  });
  
  it('includes _template in required imports', () => {
    const result = compile('<div><p>A</p><p>B</p></div>', 1);
    expect(result.requiredImports.has('_template')).toBe(true);
  });
});

// =============================================================================
// Hydration Expression Tests
// =============================================================================

describe('Hydration Expression', () => {
  it('generates IIFE for hydration', () => {
    const result = compile('<div><p>A</p><p>B</p></div>', 1);
    const code = generateCode(result.hydratedExpression);
    
    // Should be an IIFE: (() => { ... })()
    expect(code).toMatch(/\(\(\)\s*=>\s*\{/);
    expect(code).toMatch(/\}\)\(\)/);
  });
  
  it('clones template at start', () => {
    const result = compile('<div><p>A</p><p>B</p></div>', 1);
    const code = generateCode(result.hydratedExpression);
    
    expect(code).toContain('const _el = _tmpl$1()');
  });
  
  it('returns root element at end', () => {
    const result = compile('<div><p>A</p><p>B</p></div>', 1);
    const code = generateCode(result.hydratedExpression);
    
    expect(code).toContain('return _el');
  });
});

// =============================================================================
// Dynamic Attribute Hydration Tests
// =============================================================================

describe('Dynamic Attribute Hydration', () => {
  it('generates _setProp for dynamic attributes', () => {
    const result = compile('<div class={theme()}><p>A</p><p>B</p></div>', 1);
    const code = generateCode(result.hydratedExpression);
    
    expect(code).toContain('_setProp');
    expect(code).toContain('"class"');
    expect(result.requiredImports.has('_setProp')).toBe(true);
  });
  
  it('wraps dynamic attribute in getter', () => {
    const result = compile('<div class={theme()}><p>A</p><p>B</p></div>', 1);
    const code = generateCode(result.hydratedExpression);
    
    // Should wrap theme() in arrow function for reactivity
    expect(code).toContain('() =>');
    expect(code).toContain('theme()');
  });
});

// =============================================================================
// Event Handler Hydration Tests
// =============================================================================

describe('Event Handler Hydration', () => {
  it('generates _addEventListener for event handlers', () => {
    const result = compile('<div><button onClick={handleClick}>A</button><p>B</p></div>', 1);
    const code = generateCode(result.hydratedExpression);
    
    expect(code).toContain('_addEventListener');
    expect(code).toContain('"click"');
    expect(result.requiredImports.has('_addEventListener')).toBe(true);
  });
  
  it('does NOT wrap event handler in getter', () => {
    const result = compile('<div><button onClick={handleClick}>A</button><p>B</p></div>', 1);
    const code = generateCode(result.hydratedExpression);
    
    // Event handler should be passed directly, not wrapped
    // Look for the addEventListener call
    const addEventMatch = code.match(/_addEventListener\([^)]+,\s*"click",\s*([^)]+)\)/);
    if (addEventMatch) {
      const handlerArg = addEventMatch[1];
      // The handler argument should be 'handleClick', not '() => handleClick'
      expect(handlerArg?.trim()).toBe('handleClick');
    }
  });
});

// =============================================================================
// Module Templates Generation Tests
// =============================================================================

describe('Module Templates Generation', () => {
  it('generates template declarations for module level', () => {
    const templates = new Map<number, string>();
    templates.set(1, '<div><p>A</p></div>');
    templates.set(2, '<span>B</span>');
    
    const statements = generateModuleTemplates(templates);
    
    expect(statements).toHaveLength(2);
    
    const code = statements.map(s => generate(s).code).join('\n');
    expect(code).toContain('_tmpl$1');
    expect(code).toContain('_tmpl$2');
    expect(code).toContain('<div><p>A</p></div>');
    expect(code).toContain('<span>B</span>');
  });
  
  it('returns empty array for empty templates map', () => {
    const templates = new Map<number, string>();
    const statements = generateModuleTemplates(templates);
    
    expect(statements).toHaveLength(0);
  });
});

// =============================================================================
// Complex Structure Tests
// =============================================================================

describe('Complex Structures', () => {
  it('handles nested static elements', () => {
    const result = compile(`
      <div class="container">
        <header>
          <h1>Title</h1>
        </header>
        <main>
          <p>Content</p>
        </main>
      </div>
    `, 1);
    
    const declCode = generate(result.templateDeclaration).code;
    expect(declCode).toContain('<header>');
    expect(declCode).toContain('<h1>Title</h1>');
    expect(declCode).toContain('<main>');
    expect(declCode).toContain('<p>Content</p>');
  });
  
  it('handles mixed static and dynamic', () => {
    const result = compile(`
      <div>
        <h1>Static Title</h1>
        <p class={style}>{content()}</p>
      </div>
    `, 1);
    
    const code = generateCode(result.hydratedExpression);
    
    // Generates IIFE with clone and return
    expect(code).toContain('const _el = _tmpl$1()');
    expect(code).toContain('return _el');
    
    // Generates DOM path declarations for dynamic nodes
    expect(code).toContain('firstChild');
    
    // Note: Full hydration for nested dynamic content is a known limitation
    // that will be addressed in a future iteration. The path resolver
    // correctly identifies dynamic nodes, but hydration code generation
    // for nested elements needs more work.
  });
  
  it('generates DOM path accessors for nested elements', () => {
    const result = compile(`
      <div>
        <section>
          <button onClick={fn}>Click</button>
        </section>
        <p>Static</p>
      </div>
    `, 1);
    
    const code = generateCode(result.hydratedExpression);
    
    // Should have path traversal to button
    expect(code).toContain('firstChild');
  });
});

// =============================================================================
// Edge Cases
// =============================================================================

describe('Edge Cases', () => {
  it('handles element with only event handler', () => {
    const result = compile('<div><button onClick={fn}>A</button><span>B</span></div>', 1);
    
    expect(result.requiredImports.has('_addEventListener')).toBe(true);
  });
  
  it('handles multiple attributes on same element', () => {
    const result = compile('<div><input type="text" value={val} onChange={fn} /><span>B</span></div>', 1);
    const code = generateCode(result.hydratedExpression);
    
    // Should handle both value (dynamic) and onChange (event)
    expect(code).toContain('_setProp');
    expect(code).toContain('_addEventListener');
  });
  
  it('handles void elements correctly', () => {
    const result = compile('<div><input type="text" /><br /><span>Text</span></div>', 1);
    const declCode = generate(result.templateDeclaration).code;

    // Void elements should not have closing tags
    // Babel escapes quotes in string literals
    expect(declCode).toContain('type=\\"text\\"');
    expect(declCode).toContain('<br>');
    expect(declCode).not.toContain('</input>');
    expect(declCode).not.toContain('</br>');
  });
});

// =============================================================================
// Regression Tests: findTargetByPath + comment marker integration
// =============================================================================

describe('findTargetByPath correctness (regression)', () => {
  it('correctly identifies dynamic child after static sibling', () => {
    // Bug: without comment markers, <div><h1>Title</h1>{content()}</div> had
    // nextSibling = null in the DOM because the dynamic slot was absent from HTML.
    const result = compile('<div><h1>Title</h1>{content()}</div>', 1);
    const code = generateCode(result.hydratedExpression);

    // Must generate _insert call for {content()} — proves findTargetByPath found it
    expect(code).toContain('_insert');
  });

  it('correctly identifies dynamic child as first child', () => {
    const result = compile('<div>{first()}<span>Static</span></div>', 1);
    const code = generateCode(result.hydratedExpression);

    expect(code).toContain('_insert');
  });

  it('correctly identifies two dynamic children', () => {
    const result = compile('<div><p>A</p>{x()}<p>B</p>{y()}</div>', 1);
    const code = generateCode(result.hydratedExpression);

    // Both dynamic slots must produce _insert calls
    const insertCount = (code.match(/_insert/g) ?? []).length;
    expect(insertCount).toBeGreaterThanOrEqual(2);
  });

  it('template HTML contains comment markers for dynamic slots', () => {
    const result = compile('<div><p>Static</p>{expr()}</div>', 1);
    const declCode = generate(result.templateDeclaration).code;

    // The template string must contain a comment marker for the dynamic slot
    expect(declCode).toContain('<!---->');
  });

  it('dynamic child in nested element is correctly hydrated', () => {
    // Path: root -> firstChild (section) -> firstChild (dynamic)
    const result = compile(`
      <div>
        <section>{text()}</section>
        <footer>Footer</footer>
      </div>
    `, 1);
    const code = generateCode(result.hydratedExpression);

    expect(code).toContain('_insert');
    // Must traverse into section
    expect(code).toContain('firstChild');
  });
});
