/**
 * LiteForge HMR Support
 * 
 * Hot Module Replacement integration for LiteForge components.
 * 
 * Strategy:
 * 1. Each transformed module gets an HMR boundary that accepts updates
 * 2. When a module updates, we notify the global __LITEFORGE_HMR__ handler
 * 3. The runtime tracks mounted component instances and can re-render them
 * 4. Signals and stores survive the update (they're in separate modules)
 */

// =============================================================================
// HMR Code Injection
// =============================================================================

/**
 * Generate HMR acceptance code to append to a module
 * 
 * @param moduleId - The module's file path/URL for tracking
 */
export function generateHmrCode(moduleId: string): string {
  // Escape the moduleId for use in a string literal
  const escapedId = JSON.stringify(moduleId);
  
  return `

// ── LiteForge HMR ──
if (import.meta.hot) {
  import.meta.hot.accept((newModule) => {
    if (typeof window !== 'undefined' && window.__LITEFORGE_HMR__) {
      window.__LITEFORGE_HMR__.update(${escapedId}, newModule);
    }
  });
}
`;
}

/**
 * Append HMR code to the transformed output
 * 
 * @param code - The transformed code
 * @param moduleId - The module's file path for identification
 */
export function appendHmrCode(code: string, moduleId?: string): string {
  const id = moduleId ?? 'unknown';
  return code + generateHmrCode(id);
}

/**
 * Check if code already has HMR acceptance
 */
export function hasHmrAcceptance(code: string): boolean {
  return code.includes('import.meta.hot.accept');
}
