/**
 * LiteForge Control Flow Transform
 *
 * Transforms developer-facing control flow calls into the runtime's getter-based API.
 * Runs BEFORE the JSX transform so it operates on raw JSX nodes.
 *
 * For():
 *   each: items()     → each: () => items()        (wrap dynamic value in getter)
 *   {item.name}       → {() => item().name}        (rewrite item property accesses)
 *   class={item.x}    → class={() => item().x}     (rewrite attribute values)
 *
 * Show() / Switch() / Match():
 *   when: expr        → when: () => expr           (wrap dynamic condition in getter)
 *
 * After this runs, JSX transform sees pre-transformed expressions and handles them normally.
 */

import type { Visitor, NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import { shouldWrapExpression, wrapInGetter } from './getter-wrap.js';

// =============================================================================
// Public API
// =============================================================================

/** Names of control flow components whose `when` prop should be auto-wrapped. */
const WHEN_COMPONENTS = new Set(['Show', 'Switch', 'Match']);

/** Cached regex for event handler attribute names — avoids re-creation per call. */
const EVENT_HANDLER_RE = /^on[A-Za-z]/;

/**
 * Create a Babel visitor that transforms control flow calls.
 * Must run BEFORE JSX transformation.
 */
export function createForTransformVisitor(): Visitor {
  return {
    CallExpression(path: NodePath<t.CallExpression>) {
      const callee = path.node.callee;
      if (!t.isIdentifier(callee)) return;

      const propsArg = path.node.arguments[0];
      if (!propsArg || !t.isObjectExpression(propsArg)) return;

      if (callee.name === 'For') {
        const eachProp = findProperty(propsArg, 'each');
        const childrenProp = findProperty(propsArg, 'children');
        if (eachProp) transformEach(eachProp);
        if (childrenProp) transformChildrenProp(childrenProp);
        return;
      }

      if (WHEN_COMPONENTS.has(callee.name)) {
        const whenProp = findProperty(propsArg, 'when');
        if (whenProp) transformWhen(whenProp);
      }
    },
  };
}

// =============================================================================
// when transform (Show / Switch / Match)
// =============================================================================

/**
 * Wrap `when` value in a getter if it's not already one.
 * Show({ when: expr }) → Show({ when: () => expr })
 */
function transformWhen(prop: t.ObjectProperty): void {
  const value = prop.value;
  if (!t.isExpression(value)) return;
  // Already a getter function — leave as-is
  if (t.isArrowFunctionExpression(value) || t.isFunctionExpression(value)) return;
  // Static literal — no getter needed
  if (!shouldWrapExpression(value)) return;
  prop.value = wrapInGetter(value);
}

// =============================================================================
// each transform
// =============================================================================

function transformEach(prop: t.ObjectProperty): void {
  const value = prop.value;
  if (!t.isExpression(value)) return;
  // Already a function — leave as-is (handles () => signal(), signal itself, etc.)
  if (t.isArrowFunctionExpression(value) || t.isFunctionExpression(value)) return;
  // Plain identifier: could be a signal (callable) or a plain array.
  // The For runtime accepts both — pass the identifier directly so that:
  //   - signal refs establish reactivity via the internal effect's dependency tracking
  //   - plain arrays are used as-is
  // We must NOT wrap as () => ident because that returns the signal object, not the array.
  if (t.isIdentifier(value)) return;
  // For other expressions (member access, call expressions, etc.) wrap in a getter
  if (!shouldWrapExpression(value)) return;
  prop.value = wrapInGetter(value);
}

// =============================================================================
// children transform
// =============================================================================

function transformChildrenProp(prop: t.ObjectProperty): void {
  const fn = prop.value;
  if (!t.isArrowFunctionExpression(fn) && !t.isFunctionExpression(fn)) return;
  if (fn.params.length === 0) return;

  const itemParam = fn.params[0];
  const indexParam = fn.params[1];
  if (!t.isIdentifier(itemParam)) return;

  const itemName = itemParam.name;
  const indexName = t.isIdentifier(indexParam) ? indexParam.name : null;

  // Walk the body, rewriting param references in JSX positions.
  // rewriteParamRefs() recognises item() (no-arg call to the param) and leaves it
  // unchanged, so this is safe to call even if the body is already in getter style.
  walkJsxNodes(fn.body, itemName, indexName);
}

// =============================================================================
// Body rewriting — single-pass JSX walker
// =============================================================================

/**
 * Recursively walk JSX nodes and rewrite expression containers that
 * reference the item or index param.
 *
 * Single-pass: we rewrite directly without a separate referencesParam() pre-scan.
 * rewriteParamRefs() returns the original node unchanged when no param reference
 * is found, so the identity check `rewritten !== expr` acts as the "did anything
 * change?" guard.
 */
function walkJsxNodes(
  node: t.Node,
  itemName: string,
  indexName: string | null,
): void {
  if (t.isJSXElement(node)) {
    // Process all attributes in one pass
    for (const attr of node.openingElement.attributes) {
      if (!t.isJSXAttribute(attr)) continue;
      if (!t.isJSXExpressionContainer(attr.value)) continue;
      const expr = attr.value.expression;
      if (t.isJSXEmptyExpression(expr)) continue;

      // Skip event handlers and ref — they receive the raw value intentionally
      const attrName = t.isJSXIdentifier(attr.name) ? attr.name.name : '';
      if (attrName === 'ref' || EVENT_HANDLER_RE.test(attrName)) continue;

      const rewritten = rewriteExprForParam(expr, itemName, indexName);
      if (rewritten !== expr) {
        attr.value = t.jsxExpressionContainer(rewritten);
      }
    }
    // Recurse into children
    for (const child of node.children) {
      if (t.isJSXExpressionContainer(child)) {
        const expr = child.expression;
        if (!t.isJSXEmptyExpression(expr)) {
          const rewritten = rewriteExprForParam(expr, itemName, indexName);
          if (rewritten !== expr) {
            child.expression = rewritten;
          }
        }
      } else {
        walkJsxNodes(child, itemName, indexName);
      }
    }
    return;
  }

  if (t.isJSXFragment(node)) {
    for (const child of node.children) walkJsxNodes(child, itemName, indexName);
    return;
  }

  // Non-JSX: walk into arrow/function bodies (nested render functions)
  if (t.isArrowFunctionExpression(node) || t.isFunctionExpression(node)) {
    walkJsxNodes(node.body, itemName, indexName);
    return;
  }

  if (t.isBlockStatement(node)) {
    for (const stmt of node.body) walkJsxNodes(stmt, itemName, indexName);
    return;
  }

  if (t.isReturnStatement(node) && node.argument) {
    walkJsxNodes(node.argument, itemName, indexName);
    return;
  }

  if (t.isExpressionStatement(node)) {
    walkJsxNodes(node.expression, itemName, indexName);
    return;
  }
}

// =============================================================================
// Expression rewriting
// =============================================================================

/**
 * Rewrite an expression that appears in a reactive JSX position.
 *
 * - If the expression is already an arrow/function, recurse into its body
 *   (handles manually-written `() => item().name` correctly without double-wrap).
 * - Otherwise rewrite param references then wrap in a getter.
 * - Returns the *original* node unchanged when no param reference is found,
 *   allowing callers to use identity comparison as a cheap "changed?" check.
 */
function rewriteExprForParam(
  expr: t.Expression,
  itemName: string,
  indexName: string | null,
): t.Expression {
  // Already a getter — recurse into its body instead of wrapping again
  if (t.isArrowFunctionExpression(expr) || t.isFunctionExpression(expr)) {
    if (t.isExpression(expr.body)) {
      // Expression body: () => row.label() — rewrite param refs directly
      const rewritten = rewriteParamRefs(expr.body, itemName, indexName);
      if (rewritten !== expr.body) {
        (expr as t.ArrowFunctionExpression).body = rewritten;
      }
    } else {
      walkJsxNodes(expr.body, itemName, indexName);
    }
    return expr;
  }

  const rewritten = rewriteParamRefs(expr, itemName, indexName);
  // If nothing changed there was no param reference — return original (identity preserved)
  if (rewritten === expr) return expr;
  return wrapInGetter(rewritten);
}

/**
 * Recursively rewrite all param identifier references to param() calls.
 *
 *   item.name  → item().name
 *   item       → item()
 *   index      → index()
 *
 * Returns the *original* node when no reference is found, so callers can use
 * a cheap `result !== input` identity check instead of a separate scan pass.
 *
 * Special case: `item()` (a no-arg CallExpression whose callee IS the param)
 * is left unchanged — it is already in getter style. This makes the rewrite
 * idempotent and eliminates the need for a separate `isAlreadyGetterStyle` pre-scan.
 */
function rewriteParamRefs(
  expr: t.Expression,
  itemName: string,
  indexName: string | null,
): t.Expression {
  // item → item()
  if (t.isIdentifier(expr) && expr.name === itemName) {
    return t.callExpression(t.identifier(itemName), []);
  }

  // index → index()
  if (indexName && t.isIdentifier(expr) && expr.name === indexName) {
    return t.callExpression(t.identifier(indexName), []);
  }

  // item() — already a getter call, leave as-is (idempotency guard)
  if (
    t.isCallExpression(expr) &&
    expr.arguments.length === 0 &&
    t.isIdentifier(expr.callee) &&
    (expr.callee.name === itemName || expr.callee.name === (indexName ?? ''))
  ) {
    return expr;
  }

  // item.prop → item().prop (direct member access)
  if (t.isMemberExpression(expr) && t.isIdentifier(expr.object) && expr.object.name === itemName) {
    return t.memberExpression(
      t.callExpression(t.identifier(itemName), []),
      expr.property,
      expr.computed,
    );
  }

  // Deeper member: recurse into object
  if (t.isMemberExpression(expr)) {
    const newObj = rewriteParamRefs(expr.object, itemName, indexName);
    if (newObj === expr.object) return expr;
    return t.memberExpression(newObj, expr.property, expr.computed);
  }

  // Call expression: item.method(args) → item().method(args)
  if (t.isCallExpression(expr)) {
    const newCallee = t.isExpression(expr.callee)
      ? rewriteParamRefs(expr.callee, itemName, indexName)
      : expr.callee;
    const newArgs = expr.arguments.map((arg) =>
      t.isExpression(arg) ? rewriteParamRefs(arg, itemName, indexName) : arg,
    );
    const changed =
      newCallee !== expr.callee || newArgs.some((a, i) => a !== expr.arguments[i]);
    if (!changed) return expr;
    return t.callExpression(newCallee, newArgs);
  }

  // Binary: item.x + item.y
  if (t.isBinaryExpression(expr)) {
    const left = t.isExpression(expr.left)
      ? rewriteParamRefs(expr.left, itemName, indexName)
      : expr.left;
    const right = t.isExpression(expr.right)
      ? rewriteParamRefs(expr.right, itemName, indexName)
      : expr.right;
    if (left === expr.left && right === expr.right) return expr;
    return t.binaryExpression(expr.operator, left, right);
  }

  // Logical: item.x ?? fallback
  if (t.isLogicalExpression(expr)) {
    const left = rewriteParamRefs(expr.left, itemName, indexName);
    const right = rewriteParamRefs(expr.right, itemName, indexName);
    if (left === expr.left && right === expr.right) return expr;
    return t.logicalExpression(expr.operator, left, right);
  }

  // Conditional: item.active ? 'a' : 'b'
  if (t.isConditionalExpression(expr)) {
    const test = rewriteParamRefs(expr.test, itemName, indexName);
    const consequent = rewriteParamRefs(expr.consequent, itemName, indexName);
    const alternate = rewriteParamRefs(expr.alternate, itemName, indexName);
    if (test === expr.test && consequent === expr.consequent && alternate === expr.alternate) {
      return expr;
    }
    return t.conditionalExpression(test, consequent, alternate);
  }

  // Template literal: `${item.name}`
  if (t.isTemplateLiteral(expr)) {
    const newExpressions = expr.expressions.map((e) =>
      t.isExpression(e) ? rewriteParamRefs(e, itemName, indexName) : e,
    );
    if (newExpressions.every((e, i) => e === expr.expressions[i])) return expr;
    return t.templateLiteral(expr.quasis, newExpressions);
  }

  // Unary: !item.active
  if (t.isUnaryExpression(expr)) {
    const arg = rewriteParamRefs(expr.argument, itemName, indexName);
    if (arg === expr.argument) return expr;
    return t.unaryExpression(expr.operator, arg);
  }

  return expr;
}

// =============================================================================
// Utilities
// =============================================================================

function findProperty(obj: t.ObjectExpression, key: string): t.ObjectProperty | null {
  for (const prop of obj.properties) {
    if (!t.isObjectProperty(prop)) continue;
    const k = t.isIdentifier(prop.key)
      ? prop.key.name
      : t.isStringLiteral(prop.key)
        ? prop.key.value
        : null;
    if (k === key) return prop;
  }
  return null;
}
