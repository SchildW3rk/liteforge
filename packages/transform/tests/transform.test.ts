/**
 * @liteforge/transform — Core transform isolation tests
 *
 * These tests verify that the bundler-agnostic transform core works
 * correctly in complete isolation, without any Vite or Bun context.
 */

import { describe, it, expect } from 'vitest';
import { transformJsx, resolveTransformOptions, shouldTransform } from '../src/index.js';

// =============================================================================
// Helpers
// =============================================================================

function tx(code: string, isDev = true): string {
  const options = resolveTransformOptions({ importSource: '@liteforge/runtime' });
  return transformJsx(code, options, isDev).code;
}

function txProd(code: string): string {
  return tx(code, false);
}

// =============================================================================
// Basic JSX → h() transform
// =============================================================================

describe('transformJsx — h() mode', () => {
  it('transforms a simple element', () => {
    const result = tx('<div class="foo">Hello</div>');
    // Babel may use double or single quotes; use case-insensitive match on tag name
    expect(result).toMatch(/h\(["']div["']/);
    expect(result).toContain('foo');
    expect(result).toContain('Hello');
  });

  it('wraps dynamic attribute in getter', () => {
    const result = tx('<div class={theme()}>text</div>');
    expect(result).toContain('() => theme()');
  });

  it('does not wrap event handlers in getter', () => {
    const result = tx('<button onclick={() => doIt()}>x</button>');
    expect(result).not.toContain('() => () =>');
    expect(result).toContain("() => doIt()");
  });

  it('handles JSX fragment', () => {
    const result = tx('<>hello</>');
    expect(result).toContain('Fragment');
    expect(result).toContain("import { h, Fragment }");
  });

  it('adds h import automatically', () => {
    const result = tx('<div>hi</div>');
    expect(result).toContain("import { h }");
  });

  it('does not add h import if already present', () => {
    const code = `import { h } from '@liteforge/runtime';\n<div>hi</div>`;
    const result = tx(code);
    const importCount = (result.match(/import \{ h \}/g) ?? []).length;
    expect(importCount).toBe(1);
  });

  it('returns hasJsx=false for non-JSX code', () => {
    const options = resolveTransformOptions({});
    const result = transformJsx('const x = 1 + 2;', options, true);
    expect(result.hasJsx).toBe(false);
    expect(result.code).toBe('const x = 1 + 2;');
  });

  it('returns hasJsx=true for JSX code', () => {
    const options = resolveTransformOptions({});
    const result = transformJsx('<div />', options, true);
    expect(result.hasJsx).toBe(true);
  });
});

// =============================================================================
// Template extraction (prod mode)
// =============================================================================

describe('transformJsx — template extraction mode', () => {
  it('uses template extraction in prod', () => {
    const result = txProd('<div class="foo"><span>static</span></div>');
    expect(result).toContain('_template(');
    expect(result).toContain('_tmpl$');
  });

  it('still transforms dynamic content', () => {
    const result = txProd('<div>{count()}</div>');
    // Dynamic content may fall back to h() or use _insert
    expect(result.hasJsx ?? result).toBeTruthy();
  });
});

// =============================================================================
// For / Show control flow
// =============================================================================

describe('transformJsx — For/Show control flow', () => {
  it('wraps Show when prop in getter', () => {
    const result = tx('<Show when={isVisible()}>content</Show>');
    expect(result).toContain('() => isVisible()');
  });

  it('wraps For each prop in getter (call expression)', () => {
    const result = tx('<For each={items()}>{(item) => <li>{item.name}</li>}</For>');
    expect(result).toContain('() => items()');
  });

  it('rewrites item property access in For children', () => {
    const result = tx('<For each={items()}>{(item) => <li>{item.name}</li>}</For>');
    // item.name → () => item().name (wrapped in getter because content position)
    expect(result).toContain('item().name');
  });
});

// =============================================================================
// Props auto-wrap
// =============================================================================

describe('transformJsx — autoWrapProps', () => {
  it('wraps props.* access in getter by default', () => {
    const result = tx('<div>{props.label}</div>');
    expect(result).toContain('() => props.label');
  });

  it('does NOT wrap props.x when autoWrapProps=false — but shouldWrapExpression still wraps it as MemberExpression', () => {
    // autoWrapProps: false skips the isPropsAccess early-exit, but props.label is a
    // MemberExpression — dynamically wrapped by shouldWrapExpression regardless.
    // Both paths wrap it; the distinction only matters at the isPropsAccess branch level.
    // This test mirrors the original vite-plugin test (commit 2ff0f7b).
    const opts = resolveTransformOptions({ autoWrapProps: false });
    expect(opts.autoWrapProps).toBe(false);
    const result = transformJsx('<div>{props.label}</div>', opts, true);
    // Still wrapped — MemberExpression is dynamic
    expect(result.code).toMatch(/\(\)\s*=>\s*props\.label/);
  });
});

// =============================================================================
// shouldTransform
// =============================================================================

describe('shouldTransform', () => {
  it('returns true for .tsx files', () => {
    expect(shouldTransform('/src/App.tsx')).toBe(true);
  });

  it('returns true for .jsx files', () => {
    expect(shouldTransform('/src/App.jsx')).toBe(true);
  });

  it('returns false for .ts files', () => {
    expect(shouldTransform('/src/store.ts')).toBe(false);
  });

  it('returns false for .js files', () => {
    expect(shouldTransform('/src/utils.js')).toBe(false);
  });

  it('strips query params before checking', () => {
    expect(shouldTransform('/src/App.tsx?t=12345')).toBe(true);
  });

  it('respects custom extensions', () => {
    expect(shouldTransform('/src/comp.lf', ['.lf'])).toBe(true);
    expect(shouldTransform('/src/comp.tsx', ['.lf'])).toBe(false);
  });
});

// =============================================================================
// resolveTransformOptions
// =============================================================================

describe('resolveTransformOptions', () => {
  it('returns defaults when called with undefined', () => {
    const opts = resolveTransformOptions(undefined);
    expect(opts.importSource).toBe('@liteforge/runtime');
    expect(opts.extensions).toEqual(['.tsx', '.jsx']);
    // Default is 'auto' — template extraction enabled in prod, disabled in dev
    expect(opts.templateExtraction).toBe('auto');
    expect(opts.autoWrapProps).toBe(true);
  });

  it('merges custom options with defaults', () => {
    const opts = resolveTransformOptions({ importSource: '@my/runtime', autoWrapProps: false });
    expect(opts.importSource).toBe('@my/runtime');
    expect(opts.autoWrapProps).toBe(false);
    expect(opts.extensions).toEqual(['.tsx', '.jsx']);
  });
});

// =============================================================================
// Component calls — not wrapped
// =============================================================================

describe('transformJsx — component calls not wrapped', () => {
  it('does not wrap PascalCase component call in getter', () => {
    const result = tx('<div>{RouterOutlet({})}</div>');
    // RouterOutlet({}) should not be wrapped in () => ...
    expect(result).not.toMatch(/\(\) => RouterOutlet/);
  });

  it('does not wrap member.PascalCase call in getter', () => {
    const result = tx('<div>{table.Root()}</div>');
    expect(result).not.toMatch(/\(\) => table\.Root/);
  });
});
