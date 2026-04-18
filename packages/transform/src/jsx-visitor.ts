/**
 * LiteForge Custom Babel JSX Visitor
 * 
 * Transforms JSX elements into h() function calls with proper getter wrapping
 * for signal-based reactivity.
 * 
 * Transform examples:
 *   <div class="foo">Hello</div>
 *   → h('div', { class: 'foo' }, 'Hello')
 * 
 *   <div class={theme()}>Count: {count()}</div>
 *   → h('div', { class: () => theme() }, () => `Count: ${count()}`)
 * 
 *   <UserCard name={user().name} />
 *   → h(UserCard, { name: () => user().name })
 */

import type { Visitor, NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import type { JsxTransformState } from './types.js';
import { shouldWrapExpression, wrapInGetter, isPropsAccess } from './getter-wrap.js';
import { isEventHandler, isComponent } from './utils.js';

// =============================================================================
// Visitor Factory
// =============================================================================

/**
 * Create the JSX visitor with the given transform state
 */
export function createJsxVisitor(state: JsxTransformState): Visitor {
  return {
    JSXElement(path: NodePath<t.JSXElement>) {
      state.hasJsx = true;
      const hCall = transformJsxElement(path.node, state.autoWrapProps);
      path.replaceWith(hCall);
    },

    JSXFragment(path: NodePath<t.JSXFragment>) {
      state.hasJsx = true;
      state.hasFragment = true;
      const hCall = transformJsxFragment(path.node, state.autoWrapProps);
      path.replaceWith(hCall);
    },
  };
}

// =============================================================================
// JSX Element Transform
// =============================================================================

/**
 * Transform a JSX element into an h() call
 */
export function transformJsxElement(element: t.JSXElement, autoWrapProps = true): t.CallExpression {
  const tag = getTagExpression(element.openingElement);
  // For component tags (PascalCase), props are passed as-is — the component
  // manages its own reactivity. Only HTML element props need getter wrapping.
  const tagName = t.isJSXIdentifier(element.openingElement.name)
    ? element.openingElement.name.name
    : '';
  const isComponentTag = isComponent(tagName);
  const props = transformAttributes(element.openingElement.attributes, isComponentTag);
  const children = transformChildren(element.children, autoWrapProps);

  return createHCall(tag, props, children);
}

/**
 * Transform a JSX fragment into an h(Fragment, null, ...) call
 */
export function transformJsxFragment(fragment: t.JSXFragment, autoWrapProps = true): t.CallExpression {
  const children = transformChildren(fragment.children, autoWrapProps);
  return createHCall(t.identifier('Fragment'), null, children);
}

// =============================================================================
// Tag Expression
// =============================================================================

/**
 * Get the tag expression for an opening element.
 * - HTML elements (lowercase): string literal
 * - Components (PascalCase): identifier reference
 * - Namespaced (foo:bar): not supported, throw error
 * - Member expression (Foo.Bar): pass through
 */
export function getTagExpression(
  openingElement: t.JSXOpeningElement
): t.StringLiteral | t.Identifier | t.MemberExpression {
  const name = openingElement.name;

  if (t.isJSXIdentifier(name)) {
    // Check if it's a component (PascalCase) or HTML element (lowercase)
    if (isComponent(name.name)) {
      return t.identifier(name.name);
    }
    return t.stringLiteral(name.name);
  }

  if (t.isJSXMemberExpression(name)) {
    return jsxMemberToMemberExpression(name);
  }

  if (t.isJSXNamespacedName(name)) {
    throw new Error(
      `JSX namespaced names (${name.namespace.name}:${name.name.name}) are not supported`
    );
  }

  // Should not reach here
  throw new Error('Unknown JSX element name type');
}

/**
 * Convert JSXMemberExpression to regular MemberExpression
 * e.g., Foo.Bar.Baz → Foo.Bar.Baz
 */
function jsxMemberToMemberExpression(
  jsxMember: t.JSXMemberExpression
): t.MemberExpression {
  const property = t.identifier(jsxMember.property.name);
  
  if (t.isJSXIdentifier(jsxMember.object)) {
    return t.memberExpression(t.identifier(jsxMember.object.name), property);
  }
  
  // Nested: recursively convert
  return t.memberExpression(
    jsxMemberToMemberExpression(jsxMember.object),
    property
  );
}

// =============================================================================
// Attributes Transform
// =============================================================================

/**
 * Transform JSX attributes into an object expression or null.
 * @param isComponentTag - When true (PascalCase tag), props are passed as-is
 *   without getter wrapping. Components manage their own reactivity.
 */
export function transformAttributes(
  attributes: Array<t.JSXAttribute | t.JSXSpreadAttribute>,
  isComponentTag = false,
): t.ObjectExpression | null {
  if (attributes.length === 0) {
    return null;
  }

  const properties: Array<t.ObjectProperty | t.SpreadElement> = [];

  for (const attr of attributes) {
    if (t.isJSXSpreadAttribute(attr)) {
      // {...attrs} → ...attrs
      properties.push(t.spreadElement(attr.argument));
    } else {
      // name={value} or name="value" or name (boolean shorthand)
      const prop = transformAttribute(attr, isComponentTag);
      if (prop !== null) {
        properties.push(prop);
      }
    }
  }

  if (properties.length === 0) {
    return null;
  }

  return t.objectExpression(properties);
}

/**
 * Transform a single JSX attribute into an object property.
 * @param isComponentTag - When true, skip getter wrapping (component props).
 */
export function transformAttribute(attr: t.JSXAttribute, isComponentTag = false): t.ObjectProperty | null {
  const name = getAttributeName(attr.name);
  const value = attr.value;

  // Boolean shorthand: <div disabled /> → { disabled: true }
  if (value === null) {
    return t.objectProperty(
      t.stringLiteral(name),
      t.booleanLiteral(true)
    );
  }

  // String literal: <div class="foo" /> → { class: 'foo' }
  if (t.isStringLiteral(value)) {
    return t.objectProperty(
      t.stringLiteral(name),
      value
    );
  }

  // Expression: <div class={expr} /> → { class: maybeWrap(expr) }
  if (t.isJSXExpressionContainer(value)) {
    const expr = value.expression;

    // Empty expression: <div data={} /> - skip
    if (t.isJSXEmptyExpression(expr)) {
      return null;
    }

    const processedValue = processAttributeValue(name, expr, isComponentTag);
    return t.objectProperty(
      t.stringLiteral(name),
      processedValue
    );
  }

  // JSX element as attribute value (e.g. component={<Foo />})
  if (t.isJSXElement(value)) {
    const hCall = transformJsxElement(value);
    // For HTML elements wrap in getter; for components pass the h() call directly
    return t.objectProperty(
      t.stringLiteral(name),
      isComponentTag ? hCall : wrapInGetter(hCall)
    );
  }

  // JSX fragment as attribute value
  if (t.isJSXFragment(value)) {
    const hCall = transformJsxFragment(value);
    return t.objectProperty(
      t.stringLiteral(name),
      isComponentTag ? hCall : wrapInGetter(hCall)
    );
  }

  return null;
}

/**
 * Get the string name of a JSX attribute
 */
function getAttributeName(name: t.JSXIdentifier | t.JSXNamespacedName): string {
  if (t.isJSXIdentifier(name)) {
    return name.name;
  }
  // Namespaced: xmlns:xlink → xmlns:xlink
  return `${name.namespace.name}:${name.name.name}`;
}

/**
 * Process an attribute value expression.
 * - Event handlers (onX): never wrap
 * - Component props (isComponentTag=true): never wrap — components manage
 *   their own reactivity and receive plain values
 * - Static values: don't wrap
 * - Dynamic expressions on HTML elements: wrap in getter
 */
export function processAttributeValue(
  propName: string,
  expr: t.Expression,
  isComponentTag = false,
): t.Expression {
  // Event handlers are never wrapped
  if (isEventHandler(propName)) {
    return expr;
  }

  // ref prop is never wrapped — it's a callback function, not a reactive value
  if (propName === 'ref') {
    return expr;
  }

  // Component props are never wrapped — components manage their own reactivity
  if (isComponentTag) {
    return expr;
  }

  // Check if wrapping is needed
  if (shouldWrapExpression(expr)) {
    return wrapInGetter(expr);
  }

  return expr;
}

// =============================================================================
// Children Transform
// =============================================================================

/**
 * Transform JSX children into an array of h() call arguments
 */
export function transformChildren(
  children: t.JSXElement['children'],
  autoWrapProps = true,
): t.Expression[] {
  const result: t.Expression[] = [];

  for (const child of children) {
    const transformed = transformChild(child, autoWrapProps);
    if (transformed !== null) {
      result.push(transformed);
    }
  }

  return result;
}

/**
 * Transform a single JSX child
 */
export function transformChild(
  child: t.JSXElement['children'][number],
  autoWrapProps = true,
): t.Expression | null {
  // Text content
  if (t.isJSXText(child)) {
    const text = cleanJsxText(child.value);
    if (text === '') {
      return null;
    }
    return t.stringLiteral(text);
  }

  // Expression container: {expr}
  if (t.isJSXExpressionContainer(child)) {
    const expr = child.expression;

    // Empty expression: {} - skip
    if (t.isJSXEmptyExpression(expr)) {
      return null;
    }

    return processChildExpression(expr, autoWrapProps);
  }

  // Nested JSX element
  if (t.isJSXElement(child)) {
    return transformJsxElement(child, autoWrapProps);
  }

  // JSX fragment
  if (t.isJSXFragment(child)) {
    return transformJsxFragment(child, autoWrapProps);
  }

  // JSX spread child: {...children} - rare, convert to spread
  if (t.isJSXSpreadChild(child)) {
    // This is complex to handle; for now, just return the expression
    // The runtime h() needs to handle spread children
    return child.expression;
  }

  return null;
}

/**
 * Process a child expression, wrapping if necessary.
 *
 * @param expr - The expression to process
 * @param autoWrapProps - When true (default), `props.*` member accesses that
 *   are not already inside a getter are automatically wrapped in `() => ...`
 *   to prevent silent reactivity bugs.
 */
export function processChildExpression(expr: t.Expression, autoWrapProps = true): t.Expression {
  // Arrow functions that are render props should NOT be additionally wrapped
  // They're already functions: {(item) => <li>{item}</li>}
  if (t.isArrowFunctionExpression(expr) || t.isFunctionExpression(expr)) {
    return expr;
  }

  // Component calls should NOT be wrapped — they return Nodes and must be
  // called ONCE, not inside a reactive effect.
  // Covers:
  //   Link({...}), Show({...}), RouterOutlet()     ← Identifier callee
  //   table.Root(), calendar.Toolbar()             ← MemberExpression callee
  if (t.isCallExpression(expr)) {
    const callee = expr.callee;
    if (t.isIdentifier(callee) && /^[A-Z]/.test(callee.name)) {
      return expr;
    }
    if (
      t.isMemberExpression(callee) &&
      t.isIdentifier(callee.property) &&
      /^[A-Z]/.test(callee.property.name)
    ) {
      return expr;
    }
  }

  // Auto-wrap props.* accesses in content position.
  // props.x evaluates once at render time; wrapping to () => props.x makes it
  // reactive so it re-evaluates whenever the parent re-renders.
  if (autoWrapProps && isPropsAccess(expr)) {
    return wrapInGetter(expr);
  }

  // Static values don't need wrapping
  if (!shouldWrapExpression(expr)) {
    return expr;
  }

  // Dynamic expressions get wrapped
  return wrapInGetter(expr);
}

/**
 * Clean JSX text content:
 * - Trim leading/trailing whitespace on lines
 * - Collapse multiple whitespace into single space
 * - Remove empty lines at start/end
 */
export function cleanJsxText(text: string): string {
  // Split into lines and trim each
  const lines = text.split('\n').map((line) => line.trim());

  // Filter out all empty lines, then join with space
  const nonEmpty = lines.filter((line) => line !== '');

  // Join with single space and trim result
  return nonEmpty.join(' ').trim();
}

// =============================================================================
// h() Call Creation
// =============================================================================

/**
 * Create an h() call expression
 */
export function createHCall(
  tag: t.Expression,
  props: t.ObjectExpression | null,
  children: t.Expression[]
): t.CallExpression {
  const args: t.Expression[] = [tag];

  // Props (null if no props)
  args.push(props ?? t.nullLiteral());

  // Children
  args.push(...children);

  return t.callExpression(t.identifier('h'), args);
}
