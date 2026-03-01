/**
 * LiteForge Vite Plugin Utilities
 * 
 * Helper functions for the JSX transform plugin.
 */

import type { LiteForgePluginOptions, ResolvedPluginOptions } from './types.js';

// =============================================================================
// Option Resolution
// =============================================================================

/**
 * Default plugin options
 */
const DEFAULT_OPTIONS: ResolvedPluginOptions = {
  extensions: ['.tsx', '.jsx'],
  hmr: true,
  importSource: '@liteforge/runtime',
  templateExtraction: 'auto',
};

/**
 * Resolve plugin options with defaults
 */
export function resolveOptions(
  options: LiteForgePluginOptions | undefined,
  isDev: boolean
): ResolvedPluginOptions {
  return {
    extensions: options?.extensions ?? DEFAULT_OPTIONS.extensions,
    hmr: options?.hmr ?? (isDev ? DEFAULT_OPTIONS.hmr : false),
    importSource: options?.importSource ?? DEFAULT_OPTIONS.importSource,
    templateExtraction: options?.templateExtraction ?? DEFAULT_OPTIONS.templateExtraction,
  };
}

/**
 * Check if template extraction should be enabled based on options and environment
 */
export function shouldUseTemplateExtraction(
  option: boolean | 'auto',
  isDev: boolean
): boolean {
  if (option === 'auto') {
    // Enable in production, disable in development
    return !isDev;
  }
  return option;
}

// =============================================================================
// File Matching
// =============================================================================

/**
 * Check if a file should be transformed based on its extension
 */
export function shouldTransform(id: string, extensions: string[]): boolean {
  // Remove query parameters (e.g., ?vue&type=script)
  const cleanId = id.split('?')[0] ?? id;
  return extensions.some((ext) => cleanId.endsWith(ext));
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
 * This is a heuristic to avoid parsing files that definitely don't have JSX.
 */
export function mightContainJsx(code: string): boolean {
  // Look for < followed by an identifier or >
  // This catches: <div, <Component, <>
  return /<[A-Za-z>]/.test(code);
}

// =============================================================================
// Prop Name Utilities
// =============================================================================

/**
 * Common DOM event names (lowercase, without 'on' prefix)
 * This covers the most common events. The runtime will handle
 * any event starting with 'on' + uppercase, but we need this
 * list to also support lowercase HTML-style event handlers.
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
  
  // React-style: on + PascalCase (onClick, onInput)
  // If third char is uppercase, it's always an event handler
  if (isUpperCase(thirdChar)) {
    return true;
  }
  
  // HTML-style: on + lowercase (onclick, oninput)
  // Only treat as event if it's a known event name
  const eventName = propName.slice(2).toLowerCase();
  return KNOWN_EVENTS.has(eventName);
}

/**
 * Check if a character is uppercase
 */
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

/**
 * Create the h() import statement
 */
export function createHImport(importSource: string, needsFragment: boolean): string {
  const imports = needsFragment ? 'h, Fragment' : 'h';
  return `import { ${imports} } from '${importSource}';\n`;
}
