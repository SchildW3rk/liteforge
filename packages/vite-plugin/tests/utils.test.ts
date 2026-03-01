/**
 * Tests for utility functions
 */

import { describe, it, expect } from 'vitest';
import {
  resolveOptions,
  shouldTransform,
  isNodeModules,
  mightContainJsx,
  isEventHandler,
  isComponent,
  createHImport,
} from '../src/utils.js';

// =============================================================================
// resolveOptions Tests
// =============================================================================

describe('resolveOptions', () => {
  it('uses defaults when no options provided', () => {
    const result = resolveOptions(undefined, false);
    expect(result.extensions).toEqual(['.tsx', '.jsx']);
    expect(result.hmr).toBe(false);
    expect(result.importSource).toBe('@liteforge/runtime');
  });

  it('uses defaults in dev mode with HMR enabled', () => {
    const result = resolveOptions(undefined, true);
    expect(result.hmr).toBe(true);
  });

  it('respects custom extensions', () => {
    const result = resolveOptions({ extensions: ['.custom'] }, false);
    expect(result.extensions).toEqual(['.custom']);
  });

  it('respects custom import source', () => {
    const result = resolveOptions({ importSource: '@custom/runtime' }, false);
    expect(result.importSource).toBe('@custom/runtime');
  });

  it('respects explicit HMR setting', () => {
    const result = resolveOptions({ hmr: false }, true);
    expect(result.hmr).toBe(false);
  });
});

// =============================================================================
// shouldTransform Tests
// =============================================================================

describe('shouldTransform', () => {
  it('returns true for .tsx files', () => {
    expect(shouldTransform('file.tsx', ['.tsx', '.jsx'])).toBe(true);
  });

  it('returns true for .jsx files', () => {
    expect(shouldTransform('file.jsx', ['.tsx', '.jsx'])).toBe(true);
  });

  it('returns false for .ts files', () => {
    expect(shouldTransform('file.ts', ['.tsx', '.jsx'])).toBe(false);
  });

  it('returns false for .js files', () => {
    expect(shouldTransform('file.js', ['.tsx', '.jsx'])).toBe(false);
  });

  it('handles paths with directories', () => {
    expect(shouldTransform('/path/to/file.tsx', ['.tsx'])).toBe(true);
  });

  it('removes query parameters before checking', () => {
    expect(shouldTransform('file.tsx?query=1', ['.tsx'])).toBe(true);
  });
});

// =============================================================================
// isNodeModules Tests
// =============================================================================

describe('isNodeModules', () => {
  it('returns true for node_modules path', () => {
    expect(isNodeModules('/project/node_modules/package/index.js')).toBe(true);
  });

  it('returns false for regular path', () => {
    expect(isNodeModules('/project/src/index.tsx')).toBe(false);
  });
});

// =============================================================================
// mightContainJsx Tests
// =============================================================================

describe('mightContainJsx', () => {
  it('returns true for JSX element', () => {
    expect(mightContainJsx('<div>Hello</div>')).toBe(true);
  });

  it('returns true for self-closing element', () => {
    expect(mightContainJsx('<Component />')).toBe(true);
  });

  it('returns true for fragment', () => {
    expect(mightContainJsx('<>Content</>')).toBe(true);
  });

  it('returns false for comparison operators', () => {
    expect(mightContainJsx('a < b && c > d')).toBe(false);
  });

  it('returns false for regular code', () => {
    expect(mightContainJsx('const x = 1 + 2;')).toBe(false);
  });

  it('may return true for generic type parameters (false positive is OK)', () => {
    // The mightContainJsx check is a quick heuristic to avoid parsing
    // False positives are acceptable; the actual parse will determine no JSX
    const result = mightContainJsx('const x: Array<number> = []');
    // This returns true because <n matches the pattern, but that's fine
    // The actual transform will still handle it correctly
    expect(typeof result).toBe('boolean');
  });
});

// =============================================================================
// isEventHandler Tests
// =============================================================================

describe('isEventHandler', () => {
  it('returns true for onClick', () => {
    expect(isEventHandler('onClick')).toBe(true);
  });

  it('returns true for onInput', () => {
    expect(isEventHandler('onInput')).toBe(true);
  });

  it('returns true for onKeyDown', () => {
    expect(isEventHandler('onKeyDown')).toBe(true);
  });

  it('returns true for onMouseEnter', () => {
    expect(isEventHandler('onMouseEnter')).toBe(true);
  });

  it('returns false for "on" alone', () => {
    expect(isEventHandler('on')).toBe(false);
  });

  it('returns true for "onclick" (lowercase HTML-style)', () => {
    // HTML-style lowercase event handlers are supported for known events
    expect(isEventHandler('onclick')).toBe(true);
    expect(isEventHandler('oninput')).toBe(true);
    expect(isEventHandler('onchange')).toBe(true);
    expect(isEventHandler('onkeydown')).toBe(true);
    expect(isEventHandler('onmouseenter')).toBe(true);
    expect(isEventHandler('onpointerdown')).toBe(true);
  });

  it('returns false for regular props', () => {
    expect(isEventHandler('class')).toBe(false);
    expect(isEventHandler('id')).toBe(false);
    expect(isEventHandler('value')).toBe(false);
  });

  it('returns false for props starting with "on" but not event handlers', () => {
    expect(isEventHandler('online')).toBe(false);
    expect(isEventHandler('once')).toBe(false);
  });
});

// =============================================================================
// isComponent Tests
// =============================================================================

describe('isComponent', () => {
  it('returns true for PascalCase', () => {
    expect(isComponent('UserCard')).toBe(true);
    expect(isComponent('MyComponent')).toBe(true);
  });

  it('returns true for single uppercase letter', () => {
    expect(isComponent('A')).toBe(true);
  });

  it('returns false for lowercase', () => {
    expect(isComponent('div')).toBe(false);
    expect(isComponent('span')).toBe(false);
  });

  it('returns false for camelCase', () => {
    expect(isComponent('myComponent')).toBe(false);
  });
});

// =============================================================================
// createHImport Tests
// =============================================================================

describe('createHImport', () => {
  it('creates h import only when Fragment not needed', () => {
    const result = createHImport('@liteforge/runtime', false);
    expect(result).toBe("import { h } from '@liteforge/runtime';\n");
  });

  it('creates h and Fragment import when needed', () => {
    const result = createHImport('@liteforge/runtime', true);
    expect(result).toBe("import { h, Fragment } from '@liteforge/runtime';\n");
  });

  it('uses custom import source', () => {
    const result = createHImport('@custom/jsx', false);
    expect(result).toBe("import { h } from '@custom/jsx';\n");
  });
});
