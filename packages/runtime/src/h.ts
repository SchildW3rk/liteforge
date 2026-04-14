/**
 * LiteForge h() Function
 * 
 * The hyperscript function that creates DOM elements from JSX.
 * Handles both HTML elements and components, with support for
 * reactive props and children via getter functions.
 * 
 * @example
 * ```ts
 * // HTML element
 * h('div', { class: 'container' }, 'Hello')
 * 
 * // Reactive prop
 * h('div', { class: () => theme() }, 'Text')
 * 
 * // Component
 * h(MyComponent, { name: 'John' })
 * 
 * // Fragment
 * h(Fragment, null, h('div', null, 'A'), h('div', null, 'B'))
 * ```
 */

import { effect } from '@liteforge/core';
import type { ComponentFactory, ComponentFactoryInternal, RenderFunction } from './types.js';
import { isComponentFactory } from './component.js';

// =============================================================================
// Dev Helpers
// =============================================================================

const isDev = typeof import.meta !== 'undefined' && import.meta.env?.DEV === true;

/** Detect a LiteForge Signal at runtime: a function with .set and .peek methods. */
function isSignal(value: unknown): boolean {
  if (typeof value !== 'function') return false;
  const fn = value as unknown as Record<string, unknown>;
  return typeof fn['set'] === 'function' && typeof fn['peek'] === 'function';
}

function warnUnresolvedSignal(location: string): void {
  if (isDev) {
    console.error(
      `[LiteForge] Signal passed unresolved to JSX ${location}. ` +
      `Did you mean to call it? Use () => signal() instead of signal.`
    );
  }
}

// =============================================================================
// Fragment Symbol
// =============================================================================

/**
 * Fragment represents a list of children without a wrapper element.
 * Use with h(Fragment, null, ...children) or JSX <>...</>
 */
export const Fragment = Symbol.for('liteforge.fragment');

// =============================================================================
// Types
// =============================================================================

/** Props can be static values or getter functions for reactivity */
type PropValue = unknown | (() => unknown);

/** Props object passed to h() */
type Props = Record<string, PropValue> | null;

/** Child can be a node, string, number, getter, or component */
type HChild = 
  | Node 
  | string 
  | number 
  | boolean 
  | null 
  | undefined
  | (() => HChild)
  | HChild[];

/**
 * Function component type that accepts props.
 * The bivariant hack uses a method signature which TypeScript checks bivariantly.
 */
type FunctionComponent<P = Record<string, unknown>> = {
  bivarianceHack(props: P): Node;
}['bivarianceHack'];

/** Tag can be HTML element name, Component, Fragment, or render function */
type Tag = 
  | string 
  | typeof Fragment
  | ComponentFactory<Record<string, unknown>>
  // Order matters: FunctionComponent (1 param) must come before RenderFunction (0 params)
  // so TypeScript tries the more specific type first
  | FunctionComponent
  | RenderFunction;

// =============================================================================
// Main h() Function
// =============================================================================

/**
 * Create a DOM node from JSX-like arguments.
 * 
 * @param tag - Element name, Component, or Fragment
 * @param props - Props object or null
 * @param children - Child nodes
 */
export function h(
  tag: Tag,
  props: Props,
  ...children: HChild[]
): Node {
  // Fragment: return a document fragment with children
  if (tag === Fragment) {
    return createFragment(children);
  }

  // Component function
  if (typeof tag === 'function') {
    return createComponentNode(tag, props, children);
  }

  // HTML element
  return createElement(tag, props, children);
}

// =============================================================================
// Fragment Creation
// =============================================================================

/**
 * Create a DocumentFragment from children
 */
function createFragment(children: HChild[]): DocumentFragment {
  const fragment = document.createDocumentFragment();
  appendChildren(fragment, children);
  return fragment;
}

// =============================================================================
// Component Creation
// =============================================================================

/**
 * Simple function component type (takes props, returns Node)
 */
type SimpleFunctionComponent = (props: Record<string, unknown>) => Node;

/**
 * Create a node from a component (Factory, RenderFunction, or simple function)
 */
function createComponentNode(
  component: ComponentFactory<Record<string, unknown>> | RenderFunction | SimpleFunctionComponent,
  props: Props,
  children: HChild[]
): Node {
  // Resolve props - for components, we pass props as-is (getters stay as getters)
  // The component is responsible for handling reactivity
  const resolvedProps: Record<string, unknown> = props ?? {};
  
  // Add children to props if provided
  if (children.length > 0) {
    resolvedProps.children = children.length === 1 ? children[0] : children;
  }

  // If it's a ComponentFactory (created with createComponent)
  if (isComponentFactory(component)) {
    // Cast to internal type to access ComponentInstance lifecycle methods.
    // The public ComponentFactory type returns Node for JSX compat; the runtime
    // actually returns ComponentInstance which we mount here.
    const factory = component as unknown as ComponentFactoryInternal;
    const instance = factory(resolvedProps);

    // Create a container to mount into
    const container = document.createDocumentFragment();
    instance.mount(container as unknown as Element);

    // Return the mounted node
    const node = instance.getNode();
    return node ?? document.createComment('empty-component');
  }

  // If it's a render function (no props) or simple function component (with props)
  // Try calling with props first, if it fails or returns wrong type, try without
  const fn = component as SimpleFunctionComponent | RenderFunction;
  
  // Check function arity to determine call pattern
  if (fn.length === 0) {
    // RenderFunction - no arguments
    const result = (fn as RenderFunction)();
    return result instanceof Node ? result : document.createTextNode(String(result ?? ''));
  }
  
  // SimpleFunctionComponent - takes props
  const result = (fn as SimpleFunctionComponent)(resolvedProps);
  return result instanceof Node ? result : document.createTextNode(String(result ?? ''));
}

// =============================================================================
// HTML / SVG Element Creation
// =============================================================================

const SVG_TAGS = new Set([
  'svg', 'path', 'circle', 'rect', 'line', 'polyline', 'polygon', 'g',
  'text', 'tspan', 'defs', 'use', 'symbol', 'clipPath', 'mask', 'pattern',
  'linearGradient', 'radialGradient', 'stop', 'animate', 'animateTransform',
  'feGaussianBlur', 'filter', 'feMerge', 'feMergeNode',
]);

/**
 * Create an HTML or SVG element with props and children
 */
function createElement(
  tag: string,
  props: Props,
  children: HChild[]
): Element {
  const element = SVG_TAGS.has(tag)
    ? document.createElementNS('http://www.w3.org/2000/svg', tag)
    : document.createElement(tag);

  // Apply props
  if (props !== null) {
    applyProps(element as HTMLElement, props, SVG_TAGS.has(tag));
  }

  // Append children
  appendChildren(element, children);

  return element;
}

/**
 * Apply props to an element, setting up effects for reactive props
 */
function applyProps(element: HTMLElement, props: Props, isSvg = false): void {
  if (props === null) return;

  for (const [key, value] of Object.entries(props)) {
    // Skip null/undefined
    if (value === null || value === undefined) {
      continue;
    }

    // Event handlers (onClick, onInput, etc.)
    if (key.startsWith('on') && key.length > 2) {
      const eventName = key.slice(2).toLowerCase();
      if (typeof value === 'function') {
        element.addEventListener(eventName, value as EventListener);
      }
      continue;
    }

    // ref prop - special handling (not reactive)
    if (key === 'ref' && typeof value === 'function') {
      (value as (el: HTMLElement) => void)(element);
      continue;
    }

    // Reactive prop (function that returns value)
    if (typeof value === 'function') {
      const getter = value as () => unknown;
      effect(() => {
        // Double-resolve: if the getter itself returns a plain function (e.g.
        // when a precomputed getter variable is passed as class={myGetter}),
        // the vite-plugin wraps the identifier to () => myGetter. Calling it
        // yields the inner function, so we call once more to get the real value.
        // Exception: signals are functions too — don't call them here; the
        // isSignal warning below handles the unresolved-signal case.
        let resolved = getter();
        if (typeof resolved === 'function' && !isSignal(resolved)) {
          resolved = (resolved as () => unknown)();
        }
        setProp(element, key, resolved, isSvg);
      });
      continue;
    }

    // Static prop
    setProp(element, key, value, isSvg);
  }
}

/**
 * Set a single prop on an element
 */
function setProp(element: HTMLElement, key: string, value: unknown, isSvg = false): void {
  if (isSignal(value)) {
    warnUnresolvedSignal(`as prop "${key}"`);
  }
  // SVG elements: always use setAttribute — direct property assignment
  // doesn't work for SVG-specific props (d, points, viewBox, etc. are SVGAnimatedString)
  if (isSvg) {
    if (value === null || value === undefined) {
      element.removeAttribute(key);
    } else if (key === 'style') {
      element.setAttribute('style', typeof value === 'string' ? value : '');
    } else if (key !== 'ref') {
      element.setAttribute(key, String(value));
    }
    return;
  }
  // Handle null/undefined - remove attribute
  if (value === null || value === undefined) {
    element.removeAttribute(key);
    return;
  }

  // Data attributes and aria attributes - always stringify (including false)
  if (key.startsWith('data-') || key.startsWith('aria-')) {
    element.setAttribute(key, String(value));
    return;
  }

  // Boolean false - remove attribute (for boolean HTML attributes like disabled)
  if (value === false) {
    element.removeAttribute(key);
    return;
  }

  // Boolean true - set empty attribute (for boolean HTML attributes)
  if (value === true) {
    element.setAttribute(key, '');
    return;
  }

  // class prop
  if (key === 'class' || key === 'className') {
    element.setAttribute('class', String(value));
    return;
  }

  // style prop (can be string or object)
  if (key === 'style') {
    if (typeof value === 'string') {
      element.setAttribute('style', value);
    } else if (typeof value === 'object' && value !== null) {
      Object.assign(element.style, value);
    }
    return;
  }

  // DOM properties vs attributes
  // For known DOM properties, set directly
  if (key in element) {
    try {
      (element as unknown as Record<string, unknown>)[key] = value;
      return;
    } catch {
      // Fall through to setAttribute
    }
  }

  // Default: set as attribute
  element.setAttribute(key, String(value));
}

// =============================================================================
// Children Handling
// =============================================================================

/**
 * Append children to a parent node
 */
function appendChildren(parent: Node, children: HChild[]): void {
  for (const child of children) {
    appendChild(parent, child);
  }
}

/**
 * Append a single child to a parent node
 */
function appendChild(parent: Node, child: HChild): void {
  // Skip null/undefined/false
  if (child === null || child === undefined || child === false || child === true) {
    return;
  }

  // Array of children
  if (Array.isArray(child)) {
    appendChildren(parent, child);
    return;
  }

  // Node
  if (child instanceof Node) {
    parent.appendChild(child);
    return;
  }

  // ComponentInstance as child (returned by calling a ComponentFactory directly)
  if (
    child !== null &&
    typeof child === 'object' &&
    typeof (child as Record<string, unknown>)['mount'] === 'function' &&
    typeof (child as Record<string, unknown>)['getNode'] === 'function'
  ) {
    const instance = child as { mount(p: Element): void; getNode(): Node | null };
    const container = document.createDocumentFragment();
    instance.mount(container as unknown as Element);
    const node = instance.getNode();
    if (node !== null && node !== undefined) {
      parent.appendChild(node);
    }
    return;
  }

  // Reactive child (function)
  if (typeof child === 'function') {
    // Create a placeholder and marker for reactive content
    const marker = document.createComment('reactive');
    parent.appendChild(marker);
    
    let currentNode: Node | null = null;
    
    effect(() => {
      const value = (child as () => HChild)();
      const newNode = resolveChildToNode(value);
      
      // Replace existing node
      if (currentNode !== null && currentNode.parentNode) {
        if (newNode !== null) {
          currentNode.parentNode.replaceChild(newNode, currentNode);
        } else {
          currentNode.parentNode.removeChild(currentNode);
        }
      } else if (newNode !== null && marker.parentNode) {
        marker.parentNode.insertBefore(newNode, marker.nextSibling);
      }
      
      currentNode = newNode;
    });
    return;
  }

  // String/number - create text node
  parent.appendChild(document.createTextNode(String(child)));
}

/**
 * Resolve a child value to a Node
 */
function resolveChildToNode(child: HChild): Node | null {
  if (child === null || child === undefined || child === false || child === true) {
    return null;
  }

  if (child instanceof Node) {
    return child;
  }

  if (Array.isArray(child)) {
    const fragment = document.createDocumentFragment();
    appendChildren(fragment, child);
    return fragment;
  }

  // Warn if an unresolved signal ended up here
  if (isSignal(child)) {
    warnUnresolvedSignal('as a child node');
  }

  // String/number
  return document.createTextNode(String(child));
}
