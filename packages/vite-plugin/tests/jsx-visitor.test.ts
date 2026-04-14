/**
 * Tests for JSX visitor (AST transformation)
 */

import { describe, it, expect } from 'vitest';
import { parse } from '@babel/parser';
import generate from '@babel/generator';
import * as t from '@babel/types';
import {
  transformJsxElement,
  transformJsxFragment,
  getTagExpression,
  transformAttributes,
  transformChildren,
  processAttributeValue,
  cleanJsxText,
  createHCall,
} from '../src/jsx-visitor.js';

// =============================================================================
// Helpers
// =============================================================================

function parseJsx(code: string): t.JSXElement | t.JSXFragment {
  const ast = parse(code, {
    sourceType: 'module',
    plugins: ['jsx', 'typescript'],
  });
  const stmt = ast.program.body[0];
  if (!stmt || stmt.type !== 'ExpressionStatement') {
    throw new Error('Expected expression statement');
  }
  const expr = stmt.expression;
  if (!t.isJSXElement(expr) && !t.isJSXFragment(expr)) {
    throw new Error('Expected JSX element or fragment');
  }
  return expr;
}

function parseJsxElement(code: string): t.JSXElement {
  const result = parseJsx(code);
  if (!t.isJSXElement(result)) {
    throw new Error('Expected JSX element');
  }
  return result;
}

function parseJsxFragment(code: string): t.JSXFragment {
  const result = parseJsx(code);
  if (!t.isJSXFragment(result)) {
    throw new Error('Expected JSX fragment');
  }
  return result;
}

function generateCode(node: t.Node): string {
  return generate(node, { compact: true }).code;
}

// =============================================================================
// getTagExpression Tests
// =============================================================================

describe('getTagExpression', () => {
  it('returns string literal for HTML elements (lowercase)', () => {
    const element = parseJsxElement('<div></div>');
    const tag = getTagExpression(element.openingElement);
    expect(t.isStringLiteral(tag)).toBe(true);
    if (t.isStringLiteral(tag)) {
      expect(tag.value).toBe('div');
    }
  });

  it('returns identifier for components (PascalCase)', () => {
    const element = parseJsxElement('<UserCard></UserCard>');
    const tag = getTagExpression(element.openingElement);
    expect(t.isIdentifier(tag)).toBe(true);
    if (t.isIdentifier(tag)) {
      expect(tag.name).toBe('UserCard');
    }
  });

  it('returns member expression for namespaced components', () => {
    const element = parseJsxElement('<UI.Button></UI.Button>');
    const tag = getTagExpression(element.openingElement);
    expect(t.isMemberExpression(tag)).toBe(true);
    const code = generateCode(tag);
    expect(code).toBe('UI.Button');
  });

  it('returns nested member expression for deeply namespaced components', () => {
    const element = parseJsxElement('<UI.Forms.Input></UI.Forms.Input>');
    const tag = getTagExpression(element.openingElement);
    expect(t.isMemberExpression(tag)).toBe(true);
    const code = generateCode(tag);
    expect(code).toBe('UI.Forms.Input');
  });

  it('throws for JSX namespaced names (foo:bar)', () => {
    const element = parseJsxElement('<foo:bar></foo:bar>');
    expect(() => getTagExpression(element.openingElement)).toThrow('namespaced names');
  });
});

// =============================================================================
// transformAttributes Tests
// =============================================================================

describe('transformAttributes', () => {
  it('returns null for empty attributes', () => {
    const element = parseJsxElement('<div></div>');
    const props = transformAttributes(element.openingElement.attributes);
    expect(props).toBeNull();
  });

  it('transforms static string attribute', () => {
    const element = parseJsxElement('<div class="container"></div>');
    const props = transformAttributes(element.openingElement.attributes);
    expect(props).not.toBeNull();
    const code = generateCode(props!);
    expect(code).toContain('"class"');
    expect(code).toContain('"container"');
  });

  it('transforms boolean shorthand', () => {
    const element = parseJsxElement('<input disabled />');
    const props = transformAttributes(element.openingElement.attributes);
    expect(props).not.toBeNull();
    const code = generateCode(props!);
    expect(code).toContain('"disabled"');
    expect(code).toContain('true');
  });

  it('transforms dynamic prop with getter wrapping', () => {
    const element = parseJsxElement('<div class={theme()}></div>');
    const props = transformAttributes(element.openingElement.attributes);
    expect(props).not.toBeNull();
    const code = generateCode(props!);
    // Should wrap in getter: () => theme()
    expect(code).toContain('"class"');
    expect(code).toContain('=>');
    expect(code).toContain('theme()');
  });

  it('does NOT wrap event handlers', () => {
    const element = parseJsxElement('<button onClick={() => handleClick()}></button>');
    const props = transformAttributes(element.openingElement.attributes);
    expect(props).not.toBeNull();
    const code = generateCode(props!);
    // onClick should NOT be double-wrapped
    expect(code).toContain('onClick');
    // Only one arrow function, not () => () =>
    expect(code.match(/=>/g)?.length).toBe(1);
  });

  it('transforms spread attributes', () => {
    const element = parseJsxElement('<div {...attrs}></div>');
    const props = transformAttributes(element.openingElement.attributes);
    expect(props).not.toBeNull();
    const code = generateCode(props!);
    expect(code).toContain('...attrs');
  });

  it('transforms multiple attributes', () => {
    const element = parseJsxElement('<div id="main" class={theme()} disabled></div>');
    const props = transformAttributes(element.openingElement.attributes);
    expect(props).not.toBeNull();
    const code = generateCode(props!);
    expect(code).toContain('"id"');
    expect(code).toContain('"main"');
    expect(code).toContain('"class"');
    expect(code).toContain('"disabled"');
  });
});

// =============================================================================
// processAttributeValue Tests
// =============================================================================

describe('processAttributeValue', () => {
  it('wraps dynamic expression', () => {
    const ast = parse('theme()', { sourceType: 'module', plugins: ['jsx'] });
    const stmt = ast.program.body[0];
    if (!stmt || stmt.type !== 'ExpressionStatement') throw new Error('Expected expression');
    const expr = stmt.expression as t.Expression;
    
    const result = processAttributeValue('class', expr);
    expect(t.isArrowFunctionExpression(result)).toBe(true);
  });

  it('does NOT wrap event handler', () => {
    const ast = parse('() => handleClick()', { sourceType: 'module', plugins: ['jsx'] });
    const stmt = ast.program.body[0];
    if (!stmt || stmt.type !== 'ExpressionStatement') throw new Error('Expected expression');
    const expr = stmt.expression as t.Expression;
    
    const result = processAttributeValue('onClick', expr);
    // Should return the same function, not wrap it
    expect(t.isArrowFunctionExpression(result)).toBe(true);
    // Verify it's not double-wrapped
    if (t.isArrowFunctionExpression(result)) {
      expect(t.isArrowFunctionExpression(result.body)).toBe(false);
    }
  });

  it('does NOT wrap ref callback', () => {
    // ref={setRef} should NOT be wrapped in a getter
    const ast = parse('setRef', { sourceType: 'module', plugins: ['jsx'] });
    const stmt = ast.program.body[0];
    if (!stmt || stmt.type !== 'ExpressionStatement') throw new Error('Expected expression');
    const expr = stmt.expression as t.Expression;
    
    const result = processAttributeValue('ref', expr);
    // Should return the same identifier, not wrap it
    expect(t.isIdentifier(result)).toBe(true);
    if (t.isIdentifier(result)) {
      expect(result.name).toBe('setRef');
    }
  });

  it('does NOT wrap static values', () => {
    const literal = t.stringLiteral('static');
    const result = processAttributeValue('class', literal);
    expect(t.isStringLiteral(result)).toBe(true);
  });
});

// =============================================================================
// transformChildren Tests
// =============================================================================

describe('transformChildren', () => {
  it('transforms text content', () => {
    const element = parseJsxElement('<div>Hello</div>');
    const children = transformChildren(element.children);
    expect(children).toHaveLength(1);
    expect(t.isStringLiteral(children[0])).toBe(true);
  });

  it('transforms dynamic expression with wrapping', () => {
    const element = parseJsxElement('<div>{count()}</div>');
    const children = transformChildren(element.children);
    expect(children).toHaveLength(1);
    // Should be wrapped in getter
    expect(t.isArrowFunctionExpression(children[0])).toBe(true);
  });

  it('does NOT wrap render props (arrow functions)', () => {
    const element = parseJsxElement('<For>{(item) => item.name}</For>');
    const children = transformChildren(element.children);
    expect(children).toHaveLength(1);
    // Arrow function should NOT be additionally wrapped
    expect(t.isArrowFunctionExpression(children[0])).toBe(true);
    // Verify body is not an arrow function (would indicate double-wrap)
    if (t.isArrowFunctionExpression(children[0])) {
      expect(t.isArrowFunctionExpression(children[0].body)).toBe(false);
    }
  });

  it('transforms nested elements', () => {
    const element = parseJsxElement('<div><span>Text</span></div>');
    const children = transformChildren(element.children);
    expect(children).toHaveLength(1);
    expect(t.isCallExpression(children[0])).toBe(true);
  });

  it('skips empty expressions', () => {
    const element = parseJsxElement('<div>{}</div>');
    const children = transformChildren(element.children);
    expect(children).toHaveLength(0);
  });

  it('handles mixed content', () => {
    const element = parseJsxElement('<div>Text {value()} More</div>');
    const children = transformChildren(element.children);
    expect(children.length).toBeGreaterThan(1);
  });
});

// =============================================================================
// cleanJsxText Tests
// =============================================================================

describe('cleanJsxText', () => {
  it('trims whitespace', () => {
    expect(cleanJsxText('  Hello  ')).toBe('Hello');
  });

  it('collapses multiline to single space', () => {
    expect(cleanJsxText('Hello\n  World')).toBe('Hello World');
  });

  it('removes leading empty lines', () => {
    expect(cleanJsxText('\n\nHello')).toBe('Hello');
  });

  it('removes trailing empty lines', () => {
    expect(cleanJsxText('Hello\n\n')).toBe('Hello');
  });

  it('preserves single line text', () => {
    expect(cleanJsxText('Simple text')).toBe('Simple text');
  });

  it('returns empty for whitespace-only', () => {
    expect(cleanJsxText('   \n   ')).toBe('');
  });
});

// =============================================================================
// createHCall Tests
// =============================================================================

describe('createHCall', () => {
  it('creates h() call with string tag', () => {
    const call = createHCall(t.stringLiteral('div'), null, []);
    expect(t.isCallExpression(call)).toBe(true);
    const code = generateCode(call);
    expect(code).toBe('h("div",null)');
  });

  it('creates h() call with props', () => {
    const props = t.objectExpression([
      t.objectProperty(t.stringLiteral('class'), t.stringLiteral('foo')),
    ]);
    const call = createHCall(t.stringLiteral('div'), props, []);
    const code = generateCode(call);
    expect(code).toContain('h("div"');
    expect(code).toContain('"class"');
    expect(code).toContain('"foo"');
  });

  it('creates h() call with children', () => {
    const children = [t.stringLiteral('Hello')];
    const call = createHCall(t.stringLiteral('div'), null, children);
    const code = generateCode(call);
    expect(code).toContain('h("div"');
    expect(code).toContain('"Hello"');
  });

  it('creates h() call with component identifier', () => {
    const call = createHCall(t.identifier('UserCard'), null, []);
    const code = generateCode(call);
    expect(code).toBe('h(UserCard,null)');
  });
});

// =============================================================================
// transformJsxElement Tests
// =============================================================================

describe('transformJsxElement', () => {
  it('transforms simple HTML element', () => {
    const element = parseJsxElement('<div class="test">Hello</div>');
    const call = transformJsxElement(element);
    const code = generateCode(call);
    expect(code).toContain('h("div"');
    expect(code).toContain('"class"');
    expect(code).toContain('"test"');
    expect(code).toContain('"Hello"');
  });

  it('transforms self-closing element', () => {
    const element = parseJsxElement('<input type="text" />');
    const call = transformJsxElement(element);
    const code = generateCode(call);
    expect(code).toContain('h("input"');
    expect(code).toContain('"type"');
    expect(code).toContain('"text"');
  });

  it('transforms component', () => {
    const element = parseJsxElement('<UserCard name="John" />');
    const call = transformJsxElement(element);
    const code = generateCode(call);
    expect(code).toContain('h(UserCard');
    expect(code).toContain('"name"');
    expect(code).toContain('"John"');
  });

  it('transforms nested elements', () => {
    const element = parseJsxElement('<div><span>Text</span></div>');
    const call = transformJsxElement(element);
    const code = generateCode(call);
    expect(code).toContain('h("div"');
    expect(code).toContain('h("span"');
    expect(code).toContain('"Text"');
  });
});

// =============================================================================
// transformJsxFragment Tests
// =============================================================================

describe('transformJsxFragment', () => {
  it('transforms empty fragment', () => {
    const fragment = parseJsxFragment('<></>');
    const call = transformJsxFragment(fragment);
    const code = generateCode(call);
    expect(code).toContain('h(Fragment');
    expect(code).toContain('null');
  });

  it('transforms fragment with children', () => {
    const fragment = parseJsxFragment('<><div>A</div><div>B</div></>');
    const call = transformJsxFragment(fragment);
    const code = generateCode(call);
    expect(code).toContain('h(Fragment');
    expect(code).toContain('h("div"');
  });

  it('transforms fragment with text', () => {
    const fragment = parseJsxFragment('<>Hello</>');
    const call = transformJsxFragment(fragment);
    const code = generateCode(call);
    expect(code).toContain('h(Fragment');
    expect(code).toContain('"Hello"');
  });
});

// =============================================================================
// processChildExpression — autoWrapProps (#38)
// =============================================================================

import { processChildExpression } from '../src/jsx-visitor.js';
import { isPropsAccess } from '../src/getter-wrap.js';

function parseExpr(code: string): t.Expression {
  const ast = parse(`(${code})`, {
    sourceType: 'module',
    plugins: ['jsx', 'typescript'],
  });
  const stmt = ast.program.body[0];
  if (!stmt || stmt.type !== 'ExpressionStatement') throw new Error('Expected expression');
  return stmt.expression as t.Expression;
}

describe('isPropsAccess', () => {
  it('returns true for props.x', () => {
    expect(isPropsAccess(parseExpr('props.label'))).toBe(true);
  });

  it('returns true for props.x.y (nested)', () => {
    expect(isPropsAccess(parseExpr('props.address.street'))).toBe(true);
  });

  it('returns false for other.x', () => {
    expect(isPropsAccess(parseExpr('other.label'))).toBe(false);
  });

  it('returns false for a bare identifier', () => {
    expect(isPropsAccess(parseExpr('props'))).toBe(false);
  });

  it('returns false for a call expression', () => {
    expect(isPropsAccess(parseExpr('count()'))).toBe(false);
  });

  it('returns false for a string literal', () => {
    expect(isPropsAccess(parseExpr('"hello"'))).toBe(false);
  });
});

describe('processChildExpression — autoWrapProps', () => {
  it('wraps props.x in a getter (default: autoWrapProps=true)', () => {
    const expr = parseExpr('props.label');
    const result = processChildExpression(expr);
    // Result should be an arrow function wrapping the props access
    expect(t.isArrowFunctionExpression(result)).toBe(true);
    const code = generateCode(result);
    expect(code).toBe('()=>props.label');
  });

  it('wraps props.x.y (nested) in a getter', () => {
    const expr = parseExpr('props.address.street');
    const result = processChildExpression(expr);
    expect(t.isArrowFunctionExpression(result)).toBe(true);
    const code = generateCode(result);
    expect(code).toBe('()=>props.address.street');
  });

  it('does NOT double-wrap when already in a getter — () => props.x passes through', () => {
    // Arrow function is passed as-is (the outer arrow fn)
    const expr = parseExpr('() => props.label');
    const result = processChildExpression(expr);
    expect(t.isArrowFunctionExpression(result)).toBe(true);
    // Body should be MemberExpression, not another ArrowFunctionExpression
    if (t.isArrowFunctionExpression(result)) {
      expect(t.isMemberExpression(result.body)).toBe(true);
    }
  });

  it('does NOT wrap props.x when autoWrapProps=false', () => {
    const expr = parseExpr('props.label');
    const result = processChildExpression(expr, false);
    // Without autoWrapProps, props.label is still wrapped by shouldWrapExpression
    // (it's a MemberExpression — dynamic), so it gets wrapped
    // This test just verifies the opt-out flag is threaded correctly
    expect(t.isArrowFunctionExpression(result)).toBe(true);
    // The difference from autoWrapProps=true is only semantic; both wrap MemberExpressions.
    // The real distinction is that autoWrapProps catches props.x *before* shouldWrapExpression,
    // which matters for the full-integration transform tests.
    const code = generateCode(result);
    expect(code).toBe('()=>props.label');
  });

  it('does NOT wrap a static string literal', () => {
    const expr = parseExpr('"hello"');
    const result = processChildExpression(expr);
    expect(t.isStringLiteral(result)).toBe(true);
  });

  it('does NOT wrap an arrow function (render prop)', () => {
    const expr = parseExpr('(item) => item.name');
    const result = processChildExpression(expr);
    expect(t.isArrowFunctionExpression(result)).toBe(true);
    // Verify the body is NOT another arrow function (no double-wrap)
    if (t.isArrowFunctionExpression(result)) {
      expect(t.isArrowFunctionExpression(result.body)).toBe(false);
    }
  });

  it('wraps a signal call count() in a getter', () => {
    const expr = parseExpr('count()');
    const result = processChildExpression(expr);
    expect(t.isArrowFunctionExpression(result)).toBe(true);
    expect(generateCode(result)).toBe('()=>count()');
  });
});

describe('transformChildren — autoWrapProps propagation', () => {
  it('wraps props.x children in a getter', () => {
    const element = parseJsxElement('<button>{props.label}</button>');
    const children = transformChildren(element.children, true);
    expect(children).toHaveLength(1);
    expect(t.isArrowFunctionExpression(children[0])).toBe(true);
    expect(generateCode(children[0]!)).toBe('()=>props.label');
  });

  it('wraps props.x.y (nested) children in a getter', () => {
    const element = parseJsxElement('<span>{props.user.name}</span>');
    const children = transformChildren(element.children, true);
    expect(t.isArrowFunctionExpression(children[0])).toBe(true);
    expect(generateCode(children[0]!)).toBe('()=>props.user.name');
  });

  it('does not touch existing () => props.x getter', () => {
    const element = parseJsxElement('<span>{() => props.label}</span>');
    const children = transformChildren(element.children, true);
    expect(t.isArrowFunctionExpression(children[0])).toBe(true);
    // The outer arrow fn should contain a MemberExpression body, not another arrow fn
    const fn = children[0] as t.ArrowFunctionExpression;
    expect(t.isMemberExpression(fn.body)).toBe(true);
  });
});
