/**
 * @liteforge/transform — Utility functions
 */

import type { TransformOptions, ResolvedTransformOptions } from './types.js';

// =============================================================================
// Option Resolution
// =============================================================================

const DEFAULT_OPTIONS: ResolvedTransformOptions = {
  extensions: ['.tsx', '.jsx'],
  importSource: '@liteforge/runtime',
  templateExtraction: 'auto',
  autoWrapProps: true,
};

export function resolveTransformOptions(options: TransformOptions | undefined): ResolvedTransformOptions {
  return {
    extensions: options?.extensions ?? DEFAULT_OPTIONS.extensions,
    importSource: options?.importSource ?? DEFAULT_OPTIONS.importSource,
    templateExtraction: options?.templateExtraction ?? DEFAULT_OPTIONS.templateExtraction,
    autoWrapProps: options?.autoWrapProps ?? DEFAULT_OPTIONS.autoWrapProps,
  };
}

// =============================================================================
// File Matching
// =============================================================================

/**
 * Check if a file should be transformed based on its extension
 */
export function shouldTransform(id: string, extensions?: string[]): boolean {
  const exts = extensions ?? DEFAULT_OPTIONS.extensions;
  const cleanId = id.split('?')[0] ?? id;
  return exts.some((ext) => cleanId.endsWith(ext));
}

/**
 * Check if a file is in node_modules
 */
export function isNodeModules(id: string): boolean {
  return id.includes('node_modules');
}

// =============================================================================
// JSX Detection
// =============================================================================

/**
 * Quick check if code might contain JSX (before full parsing)
 */
export function mightContainJsx(code: string): boolean {
  return /<[A-Za-z>]/.test(code);
}

// =============================================================================
// Prop Name Utilities
// =============================================================================

/**
 * Common DOM event names (lowercase, without 'on' prefix)
 */
const KNOWN_EVENTS = new Set([
  // Mouse events
  'click', 'dblclick', 'mousedown', 'mouseup', 'mousemove',
  'mouseenter', 'mouseleave', 'mouseover', 'mouseout',
  // Keyboard events
  'keydown', 'keyup', 'keypress',
  // Form events
  'input', 'change', 'submit', 'reset', 'focus', 'blur',
  'focusin', 'focusout', 'invalid',
  // Drag events
  'drag', 'dragstart', 'dragend', 'dragenter', 'dragleave', 'dragover', 'drop',
  // Touch events
  'touchstart', 'touchmove', 'touchend', 'touchcancel',
  // Pointer events
  'pointerdown', 'pointerup', 'pointermove', 'pointerenter', 'pointerleave',
  'pointerover', 'pointerout', 'pointercancel', 'gotpointercapture', 'lostpointercapture',
  // Scroll/wheel
  'scroll', 'wheel',
  // Clipboard
  'copy', 'cut', 'paste',
  // Media
  'play', 'pause', 'ended', 'loadeddata', 'loadedmetadata', 'canplay',
  'timeupdate', 'volumechange', 'seeking', 'seeked',
  // Animation
  'animationstart', 'animationend', 'animationiteration',
  'transitionstart', 'transitionend', 'transitionrun', 'transitioncancel',
  // Load/error
  'load', 'error', 'abort',
  // Context menu
  'contextmenu',
  // Selection
  'select', 'selectstart',
  // Misc
  'resize', 'beforeinput', 'compositionstart', 'compositionupdate', 'compositionend',
]);

/**
 * Check if a prop name is an event handler (onClick, onInput, onclick, oninput, etc.)
 *
 * Supports two patterns:
 * 1. React-style: on + PascalCase (onClick, onInput) - always treated as event handler
 * 2. HTML-style: on + lowercase known event (onclick, oninput) - only if event is known
 *
 * This correctly excludes non-event props like 'online' and 'once'.
 */
export function isEventHandler(propName: string): boolean {
  if (propName.length <= 2 || !propName.startsWith('on')) {
    return false;
  }

  const thirdChar = propName.charAt(2);

  if (isUpperCase(thirdChar)) {
    return true;
  }

  const eventName = propName.slice(2).toLowerCase();
  return KNOWN_EVENTS.has(eventName);
}

function isUpperCase(char: string): boolean {
  return char >= 'A' && char <= 'Z';
}

/**
 * Check if a tag name is a component (starts with uppercase)
 */
export function isComponent(tagName: string): boolean {
  const firstChar = tagName.charAt(0);
  return isUpperCase(firstChar);
}

// =============================================================================
// Code Generation Helpers
// =============================================================================

export function createHImport(importSource: string, needsFragment: boolean): string {
  const imports = needsFragment ? 'h, Fragment' : 'h';
  return `import { ${imports} } from '${importSource}';\n`;
}
