/**
 * Template Extractor
 * 
 * Analyzes JSX elements to determine if they can be extracted into
 * cloneable HTML templates for better runtime performance.
 * 
 * Classification:
 * - STATIC: Element with only string props, no event handlers, no expressions
 * - DYNAMIC: Element with reactive props, event handlers, spread props, or is a Component
 * - MIXED: Static element structure with some dynamic children or props
 */

import * as t from '@babel/types';
import { isEventHandler, isComponent } from './utils.js';

// =============================================================================
// Types
// =============================================================================

/**
 * Classification of a JSX element or subtree
 */
export type ElementClassification = 'static' | 'dynamic' | 'mixed';

/**
 * Information about a single JSX element
 */
export interface ElementInfo {
  /** The classification of this element */
  classification: ElementClassification;
  /** The tag name (for HTML elements) or null (for components) */
  tagName: string | null;
  /** Whether this is a component (PascalCase) */
  isComponent: boolean;
  /** Static attributes that can go in the template */
  staticAttrs: Map<string, string>;
  /** Dynamic attributes that need runtime handling */
  dynamicAttrs: string[];
  /** Event handler attributes */
  eventHandlers: string[];
  /** Whether there are spread props */
  hasSpread: boolean;
  /** Child element infos */
  children: ChildInfo[];
  /** Original JSX element node */
  node: t.JSXElement;
}

/**
 * Information about a child in the element tree
 */
export interface ChildInfo {
  /** Type of child */
  type: 'element' | 'text' | 'expression' | 'fragment' | 'spread';
  /** For text children, the text content */
  text?: string;
  /** For element children, the element info */
  elementInfo?: ElementInfo;
  /** Whether this child is static */
  isStatic: boolean;
  /** Index in the children array */
  index: number;
  /** Original node */
  node: t.JSXElement['children'][number];
}

/**
 * Result of analyzing a JSX tree for template extraction
 */
export interface TemplateAnalysis {
  /** Whether template extraction is worthwhile */
  shouldExtract: boolean;
  /** The root element info */
  root: ElementInfo;
  /** Total count of static elements */
  staticElementCount: number;
  /** Total count of dynamic points (attrs or children) */
  dynamicPointCount: number;
}

// =============================================================================
// Static Analysis
// =============================================================================

/**
 * Analyze a JSX element to determine if it can be template-extracted
 */
export function analyzeElement(element: t.JSXElement): TemplateAnalysis {
  const root = extractElementInfo(element);
  const staticCount = countStaticElements(root);
  const dynamicCount = countDynamicPoints(root);
  
  // Decision: extract if we have at least 2 static elements
  // (single element doesn't benefit from template extraction)
  const shouldExtract = staticCount >= 2 && !root.isComponent;
  
  return {
    shouldExtract,
    root,
    staticElementCount: staticCount,
    dynamicPointCount: dynamicCount,
  };
}

/**
 * Extract detailed information about a JSX element
 */
export function extractElementInfo(element: t.JSXElement): ElementInfo {
  const opening = element.openingElement;
  const tagName = getTagName(opening);
  const isComp = tagName !== null && isComponent(tagName);
  
  // If it's a component, it's always dynamic
  if (isComp || tagName === null) {
    return {
      classification: 'dynamic',
      tagName,
      isComponent: isComp,
      staticAttrs: new Map(),
      dynamicAttrs: [],
      eventHandlers: [],
      hasSpread: false,
      children: [],
      node: element,
    };
  }
  
  // Analyze attributes
  const attrAnalysis = analyzeAttributes(opening.attributes);
  
  // Analyze children
  const children = analyzeChildren(element.children);
  
  // Determine classification
  const hasDynamicContent = 
    attrAnalysis.dynamicAttrs.length > 0 ||
    attrAnalysis.eventHandlers.length > 0 ||
    attrAnalysis.hasSpread ||
    children.some(c => !c.isStatic);
  
  const hasStaticContent =
    attrAnalysis.staticAttrs.size > 0 ||
    children.some(c => c.isStatic);
  
  let classification: ElementClassification;
  if (!hasDynamicContent) {
    classification = 'static';
  } else if (!hasStaticContent && hasDynamicContent) {
    classification = 'dynamic';
  } else {
    classification = 'mixed';
  }
  
  return {
    classification,
    tagName,
    isComponent: false,
    staticAttrs: attrAnalysis.staticAttrs,
    dynamicAttrs: attrAnalysis.dynamicAttrs,
    eventHandlers: attrAnalysis.eventHandlers,
    hasSpread: attrAnalysis.hasSpread,
    children,
    node: element,
  };
}

/**
 * Get the tag name from an opening element, or null if it's not a simple identifier
 */
function getTagName(opening: t.JSXOpeningElement): string | null {
  if (t.isJSXIdentifier(opening.name)) {
    return opening.name.name;
  }
  return null;
}

// =============================================================================
// Attribute Analysis
// =============================================================================

interface AttributeAnalysis {
  staticAttrs: Map<string, string>;
  dynamicAttrs: string[];
  eventHandlers: string[];
  hasSpread: boolean;
}

/**
 * Analyze attributes of a JSX element
 */
function analyzeAttributes(
  attrs: Array<t.JSXAttribute | t.JSXSpreadAttribute>
): AttributeAnalysis {
  const staticAttrs = new Map<string, string>();
  const dynamicAttrs: string[] = [];
  const eventHandlers: string[] = [];
  let hasSpread = false;
  
  for (const attr of attrs) {
    if (t.isJSXSpreadAttribute(attr)) {
      hasSpread = true;
      continue;
    }
    
    const name = getAttrName(attr.name);
    const value = attr.value;
    
    // Event handlers are always dynamic
    if (isEventHandler(name)) {
      eventHandlers.push(name);
      continue;
    }
    
    // Boolean shorthand: <div disabled />
    if (value === null) {
      staticAttrs.set(name, '');
      continue;
    }
    
    // String literal: <div class="foo" />
    if (t.isStringLiteral(value)) {
      staticAttrs.set(name, value.value);
      continue;
    }
    
    // Expression container: <div class={expr} />
    if (t.isJSXExpressionContainer(value)) {
      const expr = value.expression;
      
      // Check if it's a static expression
      if (isStaticExpression(expr)) {
        const staticValue = getStaticValue(expr);
        if (staticValue !== null) {
          staticAttrs.set(name, staticValue);
          continue;
        }
      }
      
      // Otherwise it's dynamic
      dynamicAttrs.push(name);
      continue;
    }
    
    // JSX element or fragment as value - dynamic
    dynamicAttrs.push(name);
  }
  
  return { staticAttrs, dynamicAttrs, eventHandlers, hasSpread };
}

/**
 * Get the string name from a JSX attribute name
 */
function getAttrName(name: t.JSXIdentifier | t.JSXNamespacedName): string {
  if (t.isJSXIdentifier(name)) {
    return name.name;
  }
  return `${name.namespace.name}:${name.name.name}`;
}

/**
 * Check if an expression is statically evaluable
 */
function isStaticExpression(expr: t.Expression | t.JSXEmptyExpression): boolean {
  if (t.isJSXEmptyExpression(expr)) {
    return false;
  }
  
  if (t.isStringLiteral(expr) || t.isNumericLiteral(expr) || t.isBooleanLiteral(expr)) {
    return true;
  }
  
  if (t.isNullLiteral(expr)) {
    return true;
  }
  
  // Template literal with no expressions
  if (t.isTemplateLiteral(expr) && expr.expressions.length === 0) {
    return true;
  }
  
  return false;
}

/**
 * Get the static value of an expression as a string
 */
function getStaticValue(expr: t.Expression | t.JSXEmptyExpression): string | null {
  if (t.isStringLiteral(expr)) {
    return expr.value;
  }
  
  if (t.isNumericLiteral(expr)) {
    return String(expr.value);
  }
  
  if (t.isBooleanLiteral(expr)) {
    return expr.value ? '' : null; // Boolean true = empty string attr, false = omit
  }
  
  if (t.isNullLiteral(expr)) {
    return null;
  }
  
  if (t.isTemplateLiteral(expr) && expr.expressions.length === 0) {
    return expr.quasis.map(q => q.value.cooked ?? q.value.raw).join('');
  }
  
  return null;
}

// =============================================================================
// Children Analysis
// =============================================================================

/**
 * Analyze children of a JSX element
 */
function analyzeChildren(children: t.JSXElement['children']): ChildInfo[] {
  const result: ChildInfo[] = [];
  
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (child === undefined) continue;
    
    const info = analyzeChild(child, i);
    if (info !== null) {
      result.push(info);
    }
  }
  
  return result;
}

/**
 * Analyze a single child
 */
function analyzeChild(
  child: t.JSXElement['children'][number],
  index: number
): ChildInfo | null {
  // Text content
  if (t.isJSXText(child)) {
    const text = cleanJsxText(child.value);
    if (text === '') {
      return null;
    }
    return {
      type: 'text',
      text,
      isStatic: true,
      index,
      node: child,
    };
  }
  
  // Expression container
  if (t.isJSXExpressionContainer(child)) {
    const expr = child.expression;
    
    if (t.isJSXEmptyExpression(expr)) {
      return null;
    }
    
    // Check if it's a static string/number
    if (isStaticExpression(expr)) {
      const value = getStaticValue(expr);
      if (value !== null) {
        return {
          type: 'text',
          text: value,
          isStatic: true,
          index,
          node: child,
        };
      }
    }
    
    // Dynamic expression
    return {
      type: 'expression',
      isStatic: false,
      index,
      node: child,
    };
  }
  
  // Nested JSX element
  if (t.isJSXElement(child)) {
    const elementInfo = extractElementInfo(child);
    return {
      type: 'element',
      elementInfo,
      isStatic: elementInfo.classification === 'static',
      index,
      node: child,
    };
  }
  
  // JSX fragment
  if (t.isJSXFragment(child)) {
    // Fragments are always dynamic (need special handling)
    return {
      type: 'fragment',
      isStatic: false,
      index,
      node: child,
    };
  }
  
  // Spread child
  if (t.isJSXSpreadChild(child)) {
    return {
      type: 'spread',
      isStatic: false,
      index,
      node: child,
    };
  }
  
  return null;
}

/**
 * Clean JSX text content (same as in jsx-visitor)
 */
function cleanJsxText(text: string): string {
  const lines = text.split('\n').map(line => line.trim());
  const nonEmpty = lines.filter(line => line !== '');
  return nonEmpty.join(' ').trim();
}

// =============================================================================
// Counting Helpers
// =============================================================================

/**
 * Count total static elements in the tree
 */
function countStaticElements(info: ElementInfo): number {
  let count = 0;
  
  // This element counts if it's static or mixed (structure is static)
  if (info.classification !== 'dynamic' && !info.isComponent) {
    count = 1;
  }
  
  // Count children
  for (const child of info.children) {
    if (child.type === 'element' && child.elementInfo) {
      count += countStaticElements(child.elementInfo);
    }
  }
  
  return count;
}

/**
 * Count total dynamic points in the tree
 */
function countDynamicPoints(info: ElementInfo): number {
  let count = 0;
  
  // Count dynamic attributes
  count += info.dynamicAttrs.length;
  count += info.eventHandlers.length;
  if (info.hasSpread) count += 1;
  
  // Count dynamic children
  for (const child of info.children) {
    if (!child.isStatic) {
      count += 1;
    }
    if (child.type === 'element' && child.elementInfo) {
      count += countDynamicPoints(child.elementInfo);
    }
  }
  
  return count;
}

// =============================================================================
// HTML String Generation
// =============================================================================

/**
 * Void elements that don't have closing tags
 */
const VOID_ELEMENTS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr',
]);

/**
 * Generate an HTML template string from element info
 */
export function generateTemplateString(info: ElementInfo): string {
  if (info.isComponent || info.tagName === null) {
    throw new Error('Cannot generate template for component');
  }
  
  const tag = info.tagName;
  let html = `<${tag}`;
  
  // Add static attributes
  for (const [name, value] of info.staticAttrs) {
    html += ` ${escapeAttrName(name)}="${escapeAttrValue(value)}"`;
  }
  
  html += '>';
  
  // Void elements don't have closing tags
  if (VOID_ELEMENTS.has(tag)) {
    return html;
  }
  
  // Add children
  for (const child of info.children) {
    if (child.type === 'text' && child.text !== undefined) {
      html += escapeHtml(child.text);
    } else if (child.type === 'element' && child.elementInfo && !child.elementInfo.isComponent) {
      html += generateTemplateString(child.elementInfo);
    } else if (!child.isStatic) {
      // Dynamic children and components get a comment marker so DOM traversal is correct.
      // Without a placeholder node the firstChild/nextSibling chain would skip dynamic slots.
      html += '<!---->';
    }
  }
  
  html += `</${tag}>`;
  
  return html;
}

/**
 * Escape HTML attribute name (mainly for data-* and aria-*)
 */
function escapeAttrName(name: string): string {
  // Attribute names are generally safe, but validate
  return name.replace(/[^a-zA-Z0-9_:-]/g, '');
}

/**
 * Escape HTML attribute value
 */
function escapeAttrValue(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Escape HTML text content
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
