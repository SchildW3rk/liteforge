/**
 * Template Runtime
 * 
 * Provides runtime support for template extraction optimization.
 * Templates are cloneable HTML structures that avoid repeated createElement calls.
 */

import { effect } from '@liteforge/core';

/** Duck-type check for a signal: has .set and .peek methods. */
function isSignalLike(v: unknown): boolean {
  if (typeof v !== 'function') return false;
  const fn = v as unknown as Record<string, unknown>;
  return typeof fn['set'] === 'function' && typeof fn['peek'] === 'function';
}

// =============================================================================
// _template()
// =============================================================================

/**
 * Creates a template factory from an HTML string.
 * The template is parsed once and cloned on each call.
 * 
 * @example
 * ```ts
 * const _tmpl = _template('<div class="card"><h1></h1><p>Static text</p></div>');
 * 
 * function Card() {
 *   const el = _tmpl(); // Clone the template
 *   // ... add dynamic content
 *   return el;
 * }
 * ```
 */
export function _template(html: string): () => Node {
  let tpl: HTMLTemplateElement | null = null;
  
  return (): Node => {
    if (!tpl) {
      tpl = document.createElement('template');
      tpl.innerHTML = html;
    }
    
    // Get the first child of the content (the root element)
    const content = tpl.content.firstChild;
    if (!content) {
      throw new Error('Template is empty');
    }
    
    // Deep clone the entire subtree
    return content.cloneNode(true);
  };
}

// =============================================================================
// _insert()
// =============================================================================

/**
 * Value types that can be inserted into a template slot
 */
type InsertValue = 
  | string 
  | number 
  | boolean 
  | null 
  | undefined 
  | Node 
  | InsertValue[];

/**
 * Inserts dynamic content into a template slot.
 * Supports: strings, numbers, nodes, arrays, and reactive getters.
 * 
 * If value is a function, it creates an effect to reactively update the content.
 * 
 * @param parent - The parent node to insert into
 * @param value - The value to insert (or a getter function)
 * @param marker - Optional marker node for positioning (inserts before marker)
 * 
 * @example
 * ```ts
 * const el = _tmpl();
 * const h2 = el.firstChild;
 * 
 * // Static insert
 * _insert(h2, 'Hello');
 * 
 * // Reactive insert
 * _insert(h2, () => name());
 * ```
 */
export function _insert(
  parent: Node,
  value: (() => InsertValue) | InsertValue,
  marker?: Node
): void {
  // Track current nodes for cleanup on reactive updates
  let currentNodes: Node[] = [];
  
  /**
   * Remove all currently inserted nodes
   */
  function cleanup(): void {
    for (const node of currentNodes) {
      if (node.parentNode) {
        node.parentNode.removeChild(node);
      }
    }
    currentNodes = [];
  }
  
  /**
   * Insert a value into the DOM
   */
  function insertValue(val: InsertValue): void {
    cleanup();
    
    if (val === null || val === undefined || val === false || val === true) {
      // Skip null, undefined, and booleans
      return;
    }
    
    if (Array.isArray(val)) {
      // Insert array items
      for (const item of val) {
        insertSingle(item);
      }
      return;
    }
    
    insertSingle(val);
  }
  
  /**
   * Insert a single non-array value
   */
  function insertSingle(val: InsertValue): void {
    if (val === null || val === undefined || val === false || val === true) {
      return;
    }
    
    if (Array.isArray(val)) {
      for (const item of val) {
        insertSingle(item);
      }
      return;
    }
    
    let node: Node;
    
    if (val instanceof Node) {
      node = val;
    } else {
      // Convert to text node
      node = document.createTextNode(String(val));
    }
    
    // Insert the node
    if (marker) {
      parent.insertBefore(node, marker);
    } else {
      parent.appendChild(node);
    }
    
    currentNodes.push(node);
  }
  
  // Check if value is a getter function (reactive)
  if (typeof value === 'function') {
    // Create effect for reactive updates
    effect(() => {
      const val = (value as () => InsertValue)();
      insertValue(val);
    });
  } else {
    // Static insert
    insertValue(value);
  }
}

// =============================================================================
// _setProp()
// =============================================================================

/**
 * Sets a property on an element, handling special cases.
 * Used for dynamic props that were excluded from the template.
 * 
 * @param el - The element to set the property on
 * @param name - Property name
 * @param value - Property value (or getter function for reactive)
 */
export function _setProp(
  el: Element,
  name: string,
  value: unknown
): void {
  // ref prop — call immediately with the element (same as h.ts)
  if (name === 'ref' && typeof value === 'function') {
    (value as (el: Element) => void)(el);
    return;
  }

  // Handle reactive values
  if (typeof value === 'function' && !name.startsWith('on')) {
    // It's a getter - create effect.
    // Double-resolve: if the getter itself returns a plain function (e.g.
    // when a precomputed getter variable is passed as class={myGetter}),
    // the vite-plugin wraps the identifier to () => myGetter. Calling it
    // yields the inner function, so we call once more to get the real value.
    // Signals are functions too — skip them to preserve unresolved-signal behavior.
    effect(() => {
      let val = (value as () => unknown)();
      if (typeof val === 'function' && !isSignalLike(val)) val = (val as () => unknown)();
      applyProp(el, name, val);
    });
  } else {
    // Static value or event handler
    applyProp(el, name, value);
  }
}

/**
 * Apply a property value to an element
 */
function applyProp(el: Element, name: string, value: unknown): void {
  // Handle event listeners
  if (name.startsWith('on') && name.length > 2) {
    const eventName = name.slice(2).toLowerCase();
    if (typeof value === 'function') {
      el.addEventListener(eventName, value as EventListener);
    }
    return;
  }
  
  // Handle class
  if (name === 'class' || name === 'className') {
    if (value === null || value === undefined) {
      el.removeAttribute('class');
    } else {
      el.className = String(value);
    }
    return;
  }
  
  // Handle style
  if (name === 'style') {
    if (typeof value === 'string') {
      (el as HTMLElement).style.cssText = value;
    } else if (typeof value === 'object' && value !== null) {
      const style = (el as HTMLElement).style;
      for (const [key, val] of Object.entries(value)) {
        style.setProperty(key, String(val));
      }
    }
    return;
  }
  
  // Handle data-* attributes
  if (name.startsWith('data-')) {
    if (value === null || value === undefined) {
      el.removeAttribute(name);
    } else {
      el.setAttribute(name, String(value));
    }
    return;
  }
  
  // Handle boolean attributes
  if (typeof value === 'boolean') {
    if (value) {
      el.setAttribute(name, '');
    } else {
      el.removeAttribute(name);
    }
    return;
  }
  
  // Handle null/undefined - remove attribute
  if (value === null || value === undefined) {
    el.removeAttribute(name);
    return;
  }
  
  // Default: set as attribute
  el.setAttribute(name, String(value));
}

// =============================================================================
// _addEventListener()
// =============================================================================

/**
 * Adds an event listener to an element.
 * Simple wrapper for consistency in generated code.
 */
export function _addEventListener(
  el: Element,
  event: string,
  handler: EventListener
): void {
  el.addEventListener(event, handler);
}
