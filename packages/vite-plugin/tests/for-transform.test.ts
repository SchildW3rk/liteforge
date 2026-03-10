/**
 * For() Transform Tests
 *
 * Verifies that the vite-plugin transforms developer-facing For() calls
 * into the runtime's getter-based API.
 */

import { describe, it, expect } from 'vitest';
import { transformCode } from '../src/transform.js';

// Helper: normalize whitespace for comparison
function norm(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

describe('For() transform', () => {
  // ─────────────────────────────────────────────────────────────────────────
  // each prop
  // ─────────────────────────────────────────────────────────────────────────

  describe('each prop', () => {
    it('wraps a signal call in a getter', () => {
      const input = `
        function List() {
          return (
            <ul>
              {For({ each: items(), children: (item) => <li>{item.name}</li> })}
            </ul>
          );
        }
      `;
      const output = transformCode(input);
      // each should become () => items()
      expect(norm(output)).toContain('each: () => items()');
    });

    it('wraps a logical expression in a getter', () => {
      const input = `
        function List() {
          return (
            <ul>
              {For({ each: data() ?? [], children: (item) => <li>{item.name}</li> })}
            </ul>
          );
        }
      `;
      const output = transformCode(input);
      expect(norm(output)).toContain('each: () => data() ??');
    });

    it('wraps an empty array literal in a getter (ArrayExpression is dynamic)', () => {
      const input = `
        function List() {
          return (
            <ul>
              {For({ each: [], children: (item) => <li>{item.name}</li> })}
            </ul>
          );
        }
      `;
      const output = transformCode(input);
      // ArrayExpression is dynamic by shouldWrapExpression — gets wrapped
      expect(norm(output)).toContain('each: () => []');
    });

    it('leaves an already-getter each unwrapped', () => {
      const input = `
        function List() {
          return (
            <ul>
              {For({ each: () => items(), children: (item) => <li>{item.name}</li> })}
            </ul>
          );
        }
      `;
      const output = transformCode(input);
      // Should not double-wrap
      expect(norm(output)).not.toContain('each: () => () =>');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // children prop — property access
  // ─────────────────────────────────────────────────────────────────────────

  describe('children — property access', () => {
    it('transforms item.name to () => item().name', () => {
      const input = `
        function List() {
          return (
            <ul>
              {For({ each: items(), children: (item) => <li>{item.name}</li> })}
            </ul>
          );
        }
      `;
      const output = transformCode(input);
      expect(norm(output)).toContain('() => item().name');
    });

    it('transforms multiple property accesses', () => {
      const input = `
        function List() {
          return (
            <ul>
              {For({
                each: users(),
                children: (user) => (
                  <li>
                    <span>{user.name}</span>
                    <span>{user.email}</span>
                  </li>
                ),
              })}
            </ul>
          );
        }
      `;
      // Normalize away Babel generator whitespace quirks (e.g. "user(). name" → "user().name")
      const output = norm(transformCode(input)).replace(/\(\)\.\s+/g, '().');
      expect(output).toContain('() => user().name');
      expect(output).toContain('() => user().email');
    });

    it('transforms nested property access (item.address.city)', () => {
      const input = `
        function List() {
          return (
            <ul>
              {For({ each: items(), children: (item) => <li>{item.address.city}</li> })}
            </ul>
          );
        }
      `;
      const output = transformCode(input);
      expect(norm(output)).toContain('() => item().address.city');
    });

    it('transforms property access used as an attribute value', () => {
      const input = `
        function List() {
          return (
            <ul>
              {For({
                each: items(),
                children: (item) => <li class={item.active ? 'active' : ''}>{item.name}</li>,
              })}
            </ul>
          );
        }
      `;
      const output = transformCode(input);
      expect(norm(output)).toContain('() => item().active');
      expect(norm(output)).toContain('() => item().name');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // children prop — index parameter
  // ─────────────────────────────────────────────────────────────────────────

  describe('children — index parameter', () => {
    it('transforms index usage in a child expression', () => {
      const input = `
        function List() {
          return (
            <ul>
              {For({
                each: items(),
                children: (item, index) => <li class={index % 2 === 0 ? 'even' : 'odd'}>{item.name}</li>,
              })}
            </ul>
          );
        }
      `;
      const output = transformCode(input);
      expect(norm(output)).toContain('() => index()');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Already-getter style — no double transform
  // ─────────────────────────────────────────────────────────────────────────

  describe('idempotency', () => {
    it('does not double-transform already getter-style children', () => {
      const input = `
        function List() {
          return (
            <ul>
              {For({
                each: () => items(),
                children: (item) => <li>{() => item().name}</li>,
              })}
            </ul>
          );
        }
      `;
      const output = transformCode(input);
      // Should not get triple-wrapped: () => () => item()().name
      expect(norm(output)).not.toContain('item()()');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // children prop — event handler bodies
  // ─────────────────────────────────────────────────────────────────────────

  describe('children — event handler param rewrite', () => {
    it('rewrites item.id inside an onclick arrow body', () => {
      const input = `
        function List() {
          return (
            <ul>
              {For({
                each: items(),
                children: (item) => (
                  <li onclick={() => navigate(item.id)}>{item.name}</li>
                ),
              })}
            </ul>
          );
        }
      `;
      const output = norm(transformCode(input)).replace(/\(\)\.\s+/g, '().');
      // item.id inside the event handler must become item().id
      expect(output).toContain('navigate(item().id)');
      // item.name in JSX text must still be wrapped in a getter
      expect(output).toContain('() => item().name');
    });

    it('rewrites bare item param passed as argument inside onclick', () => {
      const input = `
        function List() {
          return (
            <ul>
              {For({
                each: items(),
                children: (item) => (
                  <li onclick={() => handleClick(item)}>{item.name}</li>
                ),
              })}
            </ul>
          );
        }
      `;
      const output = norm(transformCode(input)).replace(/\(\)\.\s+/g, '().');
      expect(output).toContain('handleClick(item())');
    });

    it('rewrites item prop in a block-body event handler', () => {
      const input = `
        function List() {
          return (
            <ul>
              {For({
                each: items(),
                children: (item) => (
                  <li onclick={() => { doThing(item.id); }}>{item.name}</li>
                ),
              })}
            </ul>
          );
        }
      `;
      const output = norm(transformCode(input)).replace(/\(\)\.\s+/g, '().');
      expect(output).toContain('doThing(item().id)');
    });

    it('does not wrap the event handler itself in a getter', () => {
      const input = `
        function List() {
          return (
            <ul>
              {For({
                each: items(),
                children: (item) => (
                  <li onclick={() => navigate(item.id)}>{item.name}</li>
                ),
              })}
            </ul>
          );
        }
      `;
      const output = norm(transformCode(input));
      // The onclick value should remain a function, not () => (() => ...)
      expect(output).not.toContain('onclick: () => () =>');
    });

    it('handles onPointerDown and other on* events too', () => {
      const input = `
        function List() {
          return (
            <ul>
              {For({
                each: items(),
                children: (item) => (
                  <li onPointerDown={() => select(item.id)}>{item.name}</li>
                ),
              })}
            </ul>
          );
        }
      `;
      const output = norm(transformCode(input)).replace(/\(\)\.\s+/g, '().');
      expect(output).toContain('select(item().id)');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Show() — when prop auto-wrapping
  // ─────────────────────────────────────────────────────────────────────────

  describe('Show() when prop', () => {
    it('wraps a signal call in a getter', () => {
      const input = `
        function App() {
          return Show({ when: isLoading(), children: () => <div>Loading</div> });
        }
      `;
      const output = transformCode(input);
      expect(norm(output)).toContain('when: () => isLoading()');
    });

    it('wraps a logical expression in a getter', () => {
      const input = `
        function App() {
          return Show({ when: isLoading() && !data(), children: () => <div>Loading</div> });
        }
      `;
      const output = transformCode(input);
      expect(norm(output)).toContain('when: () => isLoading()');
    });

    it('leaves an already-getter when unwrapped', () => {
      const input = `
        function App() {
          return Show({ when: () => isLoading(), children: () => <div>Loading</div> });
        }
      `;
      const output = transformCode(input);
      expect(norm(output)).not.toContain('when: () => () =>');
    });

    it('leaves a boolean literal unwrapped', () => {
      const input = `
        function App() {
          return Show({ when: true, children: () => <div>Always</div> });
        }
      `;
      const output = transformCode(input);
      expect(norm(output)).toContain('when: true');
      expect(norm(output)).not.toContain('when: () => true');
    });
  });
});
