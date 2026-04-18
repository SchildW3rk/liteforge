/**
 * LiteForge Getter Wrapping Logic
 * 
 * Determines whether expressions in JSX should be wrapped in getter functions
 * to preserve fine-grained reactivity with signals.
 * 
 * CRITICAL: Any dynamic expression that could contain signal reads must be
 * wrapped in a getter function. The runtime's h() function will detect
 * function props and set up effects to re-evaluate them when dependencies change.
 * 
 * Wrapping Rules:
 * - String/Number/Boolean/null/undefined literals: NO wrap (static)
 * - Template literals with only strings: NO wrap (static)
 * - Arrow functions / Function expressions: NO wrap (already functions)
 * - Event handlers (onX props): NO wrap (are functions, should not be invoked)
 * - Everything else: WRAP (could contain signal reads)
 */

import * as t from '@babel/types';

// =============================================================================
// Main API
// =============================================================================

/**
 * Check if an expression should be wrapped in a getter function.
 * Returns true if the expression is dynamic and could contain signal reads.
 */
export function shouldWrapExpression(node: t.Expression | t.JSXEmptyExpression): boolean {
  // JSXEmptyExpression ({}) is static (nothing to wrap)
  if (t.isJSXEmptyExpression(node)) {
    return false;
  }

  return !isStaticExpression(node);
}

/**
 * Check if an expression is static (doesn't need getter wrapping).
 * Static expressions can be evaluated once at component creation.
 */
export function isStaticExpression(node: t.Expression | t.JSXEmptyExpression): boolean {
  // JSXEmptyExpression is considered static
  if (t.isJSXEmptyExpression(node)) {
    return true;
  }

  // Literal values are static
  if (isLiteralValue(node)) {
    return true;
  }

  // Arrow functions and function expressions are already functions
  if (t.isArrowFunctionExpression(node) || t.isFunctionExpression(node)) {
    return true;
  }

  // Template literals with no expressions are static
  if (t.isTemplateLiteral(node) && node.expressions.length === 0) {
    return true;
  }

  // Everything else is potentially dynamic
  return false;
}

/**
 * Check if a node is a literal value (string, number, boolean, null, undefined)
 */
export function isLiteralValue(node: t.Node): boolean {
  // String literal
  if (t.isStringLiteral(node)) {
    return true;
  }

  // Numeric literal
  if (t.isNumericLiteral(node)) {
    return true;
  }

  // Boolean literal
  if (t.isBooleanLiteral(node)) {
    return true;
  }

  // Null literal
  if (t.isNullLiteral(node)) {
    return true;
  }

  // Undefined identifier
  if (t.isIdentifier(node) && node.name === 'undefined') {
    return true;
  }

  return false;
}

/**
 * Wrap an expression in an arrow function getter: () => expression
 */
export function wrapInGetter(node: t.Expression): t.ArrowFunctionExpression {
  return t.arrowFunctionExpression([], node);
}

// =============================================================================
// Expression Type Checks (for more granular analysis)
// =============================================================================

/**
 * Check if expression is a function call (potentially a signal read)
 */
export function isFunctionCall(node: t.Node): node is t.CallExpression {
  return t.isCallExpression(node);
}

/**
 * Check if expression is a binary operation (e.g., a() + b())
 */
export function isBinaryExpression(node: t.Node): node is t.BinaryExpression {
  return t.isBinaryExpression(node);
}

/**
 * Check if expression is a ternary/conditional (e.g., x() ? 'a' : 'b')
 */
export function isConditionalExpression(node: t.Node): node is t.ConditionalExpression {
  return t.isConditionalExpression(node);
}

/**
 * Check if expression is a member access (e.g., user.name)
 */
export function isMemberExpression(node: t.Node): node is t.MemberExpression {
  return t.isMemberExpression(node);
}

/**
 * Check if an expression is a `props.*` or `props.*.*` member access.
 *
 * Returns true for:
 *   props.label           — MemberExpression: props.label
 *   props.address.street  — MemberExpression: props.address.street
 *
 * Returns false for:
 *   () => props.label     — already wrapped (ArrowFunctionExpression)
 *   props                 — bare identifier (no member access)
 *   other.label           — not a props access
 *
 * Note: destructured props (`const { label } = props`) cannot be detected
 * at the AST level here and are a known limitation.
 */
export function isPropsAccess(node: t.Expression | t.JSXEmptyExpression): boolean {
  if (!t.isMemberExpression(node)) return false;

  // Walk the leftmost object of the member expression chain
  let root: t.Expression | t.V8IntrinsicIdentifier = node.object;
  while (t.isMemberExpression(root)) {
    root = root.object;
  }

  return t.isIdentifier(root) && root.name === 'props';
}

/**
 * Check if expression is an identifier (variable reference)
 */
export function isIdentifier(node: t.Node): node is t.Identifier {
  return t.isIdentifier(node);
}

/**
 * Check if expression is a template literal with expressions
 */
export function isTemplateLiteralWithExpressions(node: t.Node): boolean {
  return t.isTemplateLiteral(node) && node.expressions.length > 0;
}

/**
 * Check if expression is a logical expression (&&, ||, ??)
 */
export function isLogicalExpression(node: t.Node): node is t.LogicalExpression {
  return t.isLogicalExpression(node);
}

/**
 * Check if expression is a unary expression (!, -, +, etc.)
 */
export function isUnaryExpression(node: t.Node): node is t.UnaryExpression {
  return t.isUnaryExpression(node);
}
