/**
 * Tests for HMR support
 */

import { describe, it, expect } from 'vitest';
import {
  generateHmrCode,
  appendHmrCode,
  hasHmrAcceptance,
} from '../src/hmr.js';

// =============================================================================
// generateHmrCode Tests
// =============================================================================

describe('generateHmrCode', () => {
  it('generates HMR acceptance code with callback', () => {
    const code = generateHmrCode('/path/to/module.tsx');
    expect(code).toContain('import.meta.hot');
    expect(code).toContain('import.meta.hot.accept((newModule)');
    expect(code).toContain('window.__LITEFORGE_HMR__');
  });

  it('wraps in if statement for safety', () => {
    const code = generateHmrCode('/path/to/module.tsx');
    expect(code).toContain('if (import.meta.hot)');
  });

  it('escapes module ID properly', () => {
    const code = generateHmrCode('/path/with"quotes.tsx');
    // JSON.stringify escapes the quotes with backslash
    expect(code).toContain('/path/with\\"quotes.tsx');
  });

  it('passes module ID to HMR handler', () => {
    const code = generateHmrCode('/src/components/Button.tsx');
    expect(code).toContain('"/src/components/Button.tsx"');
    expect(code).toContain('__LITEFORGE_HMR__.update');
  });
});

// =============================================================================
// appendHmrCode Tests
// =============================================================================

describe('appendHmrCode', () => {
  it('appends HMR code to existing code', () => {
    const original = 'const x = 1;';
    const result = appendHmrCode(original, '/test/module.tsx');
    expect(result).toContain(original);
    expect(result).toContain('import.meta.hot');
  });

  it('places HMR code at the end', () => {
    const original = 'const x = 1;';
    const result = appendHmrCode(original, '/test/module.tsx');
    const hmrIndex = result.indexOf('import.meta.hot');
    const originalEnd = original.length;
    expect(hmrIndex).toBeGreaterThan(originalEnd - 1);
  });

  it('uses "unknown" as default module ID', () => {
    const original = 'const x = 1;';
    const result = appendHmrCode(original);
    expect(result).toContain('"unknown"');
  });

  it('includes module ID in HMR update call', () => {
    const original = 'const x = 1;';
    const result = appendHmrCode(original, '/src/App.tsx');
    expect(result).toContain('"/src/App.tsx"');
  });
});

// =============================================================================
// hasHmrAcceptance Tests
// =============================================================================

describe('hasHmrAcceptance', () => {
  it('returns true if code has HMR acceptance', () => {
    const code = `
      const x = 1;
      if (import.meta.hot) {
        import.meta.hot.accept();
      }
    `;
    expect(hasHmrAcceptance(code)).toBe(true);
  });

  it('returns false if code has no HMR acceptance', () => {
    const code = 'const x = 1;';
    expect(hasHmrAcceptance(code)).toBe(false);
  });

  it('returns false for partial HMR code', () => {
    const code = `
      if (import.meta.hot) {
        // No accept call
      }
    `;
    expect(hasHmrAcceptance(code)).toBe(false);
  });
});
