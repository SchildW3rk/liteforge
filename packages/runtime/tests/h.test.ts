/**
 * Tests for h() function and Fragment
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { h, Fragment } from '../src/h.js';
import { signal } from '@liteforge/core';
import { createComponent } from '../src/component.js';
import { initAppContext, clearContext } from '../src/context.js';

// =============================================================================
// Test Setup
// =============================================================================

let container: HTMLDivElement;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  initAppContext({});
});

afterEach(() => {
  container.remove();
  clearContext();
});

// Helper to wait for effects to run
function tick(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

// =============================================================================
// Basic Element Creation
// =============================================================================

describe('h() - Basic Elements', () => {
  it('creates a div element', () => {
    const el = h('div', null);
    expect(el).toBeInstanceOf(HTMLDivElement);
  });

  it('creates a span element', () => {
    const el = h('span', null);
    expect(el).toBeInstanceOf(HTMLSpanElement);
  });

  it('creates element with static class', () => {
    const el = h('div', { class: 'container' }) as HTMLElement;
    expect(el.className).toBe('container');
  });

  it('creates element with static id', () => {
    const el = h('div', { id: 'main' }) as HTMLElement;
    expect(el.id).toBe('main');
  });

  it('creates element with multiple attributes', () => {
    const el = h('input', { type: 'text', placeholder: 'Enter name' }) as HTMLInputElement;
    expect(el.type).toBe('text');
    expect(el.placeholder).toBe('Enter name');
  });

  it('creates element with data attributes', () => {
    const el = h('div', { 'data-id': '123', 'data-name': 'test' }) as HTMLElement;
    expect(el.dataset.id).toBe('123');
    expect(el.dataset.name).toBe('test');
  });

  it('creates element with boolean attribute (true)', () => {
    const el = h('input', { disabled: true }) as HTMLInputElement;
    expect(el.disabled).toBe(true);
  });

  it('creates element with boolean attribute (false)', () => {
    const el = h('input', { disabled: false }) as HTMLInputElement;
    expect(el.disabled).toBe(false);
  });
});

// =============================================================================
// Children
// =============================================================================

describe('h() - Children', () => {
  it('creates element with text child', () => {
    const el = h('div', null, 'Hello');
    expect(el.textContent).toBe('Hello');
  });

  it('creates element with number child', () => {
    const el = h('div', null, 42);
    expect(el.textContent).toBe('42');
  });

  it('creates element with multiple text children', () => {
    const el = h('div', null, 'Hello', ' ', 'World');
    expect(el.textContent).toBe('Hello World');
  });

  it('creates element with element child', () => {
    const el = h('div', null, h('span', null, 'Child')) as HTMLElement;
    expect(el.innerHTML).toContain('<span>');
    expect(el.textContent).toBe('Child');
  });

  it('creates element with multiple element children', () => {
    const el = h('ul', null,
      h('li', null, 'Item 1'),
      h('li', null, 'Item 2'),
      h('li', null, 'Item 3')
    ) as HTMLElement;
    expect(el.children.length).toBe(3);
    expect(el.textContent).toContain('Item 1');
    expect(el.textContent).toContain('Item 2');
    expect(el.textContent).toContain('Item 3');
  });

  it('skips null children', () => {
    const el = h('div', null, 'Before', null, 'After');
    expect(el.textContent).toBe('BeforeAfter');
  });

  it('skips undefined children', () => {
    const el = h('div', null, 'Before', undefined, 'After');
    expect(el.textContent).toBe('BeforeAfter');
  });

  it('skips false children', () => {
    const el = h('div', null, 'Before', false, 'After');
    expect(el.textContent).toBe('BeforeAfter');
  });

  it('handles array of children', () => {
    const items = ['A', 'B', 'C'];
    const el = h('div', null, items);
    expect(el.textContent).toBe('ABC');
  });
});

// =============================================================================
// Reactive Props
// =============================================================================

describe('h() - Reactive Props', () => {
  it('updates class when signal changes', async () => {
    const theme = signal('light');
    const el = h('div', { class: () => theme() }) as HTMLElement;
    container.appendChild(el);

    expect(el.className).toBe('light');

    theme.set('dark');
    await tick();
    expect(el.className).toBe('dark');
  });

  it('updates multiple reactive props', async () => {
    const count = signal(0);
    const active = signal(false);
    
    const el = h('div', {
      'data-count': () => count(),
      'data-active': () => active(),
    }) as HTMLElement;
    container.appendChild(el);

    expect(el.dataset.count).toBe('0');
    expect(el.dataset.active).toBe('false');

    count.set(5);
    active.set(true);
    await tick();

    expect(el.dataset.count).toBe('5');
    expect(el.dataset.active).toBe('true');
  });

  it('handles precomputed getter variable: class={myGetter} (#41)', async () => {
    // Reproduces issue #41:
    // When a getter is stored in a variable and passed as class={myGetter},
    // the vite-plugin wraps the identifier to () => myGetter (not () => myGetter()).
    // The runtime must double-resolve: call the outer wrapper, detect the result
    // is itself a function, and call it again to get the real value.
    const active = signal(false);
    const myGetter = () => active() ? 'active' : '';

    // Simulate what the vite-plugin emits for class={myGetter}:
    // processAttributeValue wraps the identifier → () => myGetter
    const el = h('div', { class: () => myGetter }) as HTMLElement;
    container.appendChild(el);

    expect(el.className).toBe('');

    active.set(true);
    await tick();
    expect(el.className).toBe('active');

    active.set(false);
    await tick();
    expect(el.className).toBe('');
  });
});

// =============================================================================
// Reactive Children
// =============================================================================

describe('h() - Reactive Children', () => {
  it('updates child when signal changes', async () => {
    const name = signal('World');
    const el = h('div', null, () => `Hello, ${name()}!`);
    container.appendChild(el);

    expect(el.textContent).toContain('Hello, World!');

    name.set('LiteForge');
    await tick();
    expect(el.textContent).toContain('Hello, LiteForge!');
  });

  it('updates dynamic element child', async () => {
    const show = signal(true);
    const el = h('div', null, () => show() ? h('span', null, 'Visible') : null);
    container.appendChild(el);

    expect(el.textContent).toContain('Visible');

    show.set(false);
    await tick();
    expect(el.textContent).toBe('');

    show.set(true);
    await tick();
    expect(el.textContent).toContain('Visible');
  });
});

// =============================================================================
// Event Handlers
// =============================================================================

describe('h() - Event Handlers', () => {
  it('attaches click handler', () => {
    let clicked = false;
    const el = h('button', { onClick: () => { clicked = true; } }) as HTMLButtonElement;
    
    el.click();
    expect(clicked).toBe(true);
  });

  it('attaches input handler', () => {
    let value = '';
    const el = h('input', { 
      onInput: (e: Event) => { value = (e.target as HTMLInputElement).value; }
    }) as HTMLInputElement;
    
    el.value = 'test';
    el.dispatchEvent(new Event('input'));
    expect(value).toBe('test');
  });
});

// =============================================================================
// Fragment
// =============================================================================

describe('Fragment', () => {
  it('creates a DocumentFragment with children', () => {
    const frag = h(Fragment, null, h('div', null, 'A'), h('div', null, 'B'));
    // Fragment should have 2 child divs
    expect(frag.childNodes.length).toBe(2);
    expect((frag.childNodes[0] as HTMLElement).textContent).toBe('A');
    expect((frag.childNodes[1] as HTMLElement).textContent).toBe('B');
  });

  it('fragment children can be appended to element', () => {
    const frag = h(Fragment, null,
      h('span', null, 'First'),
      h('span', null, 'Second')
    );
    container.appendChild(frag);
    expect(container.children.length).toBe(2);
    expect(container.textContent).toBe('FirstSecond');
  });
});

// =============================================================================
// Function Components
// =============================================================================

describe('h() - Function Components', () => {
  it('renders simple function component', () => {
    function Greeting(props: { name: string }): Node {
      return h('div', null, `Hello, ${props.name}!`);
    }

    const el = h(Greeting, { name: 'World' });
    expect(el.textContent).toBe('Hello, World!');
  });

  it('renders function component with children', () => {
    function Card(props: { children: Node }): Node {
      return h('div', { class: 'card' }, props.children);
    }

    const el = h(Card, null, h('span', null, 'Content')) as HTMLElement;
    expect(el.className).toBe('card');
    expect(el.textContent).toBe('Content');
  });

  it('renders render function (no props)', () => {
    function StaticComponent(): Node {
      return h('div', null, 'Static');
    }

    const el = h(StaticComponent, null);
    expect(el.textContent).toBe('Static');
  });
});

// =============================================================================
// LiteForge Components
// =============================================================================

describe('h() - LiteForge Components', () => {
  it('renders createComponent factory', () => {
    const MyComponent = createComponent({
      props: {
        name: { type: String, default: 'Guest' },
      },
      component: ({ props }) => {
        const div = document.createElement('div');
        div.textContent = `Hello, ${props.name}`;
        return div;
      },
    });

    const el = h(MyComponent, { name: 'LiteForge' });
    expect(el.textContent).toBe('Hello, LiteForge');
  });
});

// =============================================================================
// Style Prop
// =============================================================================

describe('h() - Style Prop', () => {
  it('applies style string', () => {
    const el = h('div', { style: 'color: red; font-size: 16px;' }) as HTMLElement;
    expect(el.style.color).toBe('red');
    expect(el.style.fontSize).toBe('16px');
  });

  it('applies style object', () => {
    const el = h('div', { style: { color: 'blue', fontSize: '20px' } }) as HTMLElement;
    expect(el.style.color).toBe('blue');
    expect(el.style.fontSize).toBe('20px');
  });
});

// =============================================================================
// Ref Prop
// =============================================================================

describe('h() - Ref Prop', () => {
  it('calls ref callback with element', () => {
    let refEl: HTMLElement | null = null;
    const el = h('div', { ref: (el: HTMLElement) => { refEl = el; } }) as HTMLElement;
    expect(refEl).toBe(el);
  });
});

// =============================================================================
// Unresolved Signal Warning
// =============================================================================

describe('h() - unresolved signal warning', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it('warns when a signal is passed as a child without being called', () => {
    const name = signal('Alice');
    // Simulate what the vite-plugin emits: () => name (signal passed unresolved)
    h('span', null, (() => name) as unknown as () => string);
    expect(errorSpy).toHaveBeenCalledOnce();
    expect(errorSpy.mock.calls[0]![0]).toContain('[LiteForge]');
    expect(errorSpy.mock.calls[0]![0]).toContain('Signal passed unresolved');
  });

  it('does NOT warn when a signal is called correctly', () => {
    const name = signal('Alice');
    h('span', null, () => name());
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('warns when a reactive prop getter returns a signal instead of its value', async () => {
    const cls = signal('active');
    // Simulates: class={authStore.emailClass} → vite-plugin emits () => authStore.emailClass
    // The getter returns the signal itself, not its value
    h('div', { class: (() => cls) as unknown as () => string });
    await vi.waitFor(() => expect(errorSpy).toHaveBeenCalledOnce());
    expect(errorSpy.mock.calls[0]![0]).toContain('[LiteForge]');
    expect(errorSpy.mock.calls[0]![0]).toContain('prop "class"');
  });

  it('does NOT warn for a plain function child (render prop)', () => {
    // A plain function without .set/.peek is not a signal
    const renderFn = () => document.createTextNode('hello');
    h('div', null, renderFn);
    expect(errorSpy).not.toHaveBeenCalled();
  });
});

// =============================================================================
// Issue #43 — function children resolved through reactive wrappers
// =============================================================================

describe('h() - function children resolved correctly (#43)', () => {
  it('renders string returned by reactive child getter', () => {
    const label = signal('Hello');
    // <div>{() => label()}</div>
    const el = h('div', null, () => label()) as HTMLElement;
    expect(el.textContent).toBe('Hello');
  });

  it('renders component child when props.children is a getter returning a function', () => {
    // Simulates: <Button>{() => label()}</Button>
    // The vite-plugin passes the arrow fn as children (a function).
    // The component does: h('button', null, () => props.children)
    // That outer getter returns the inner function — resolveChildToNode must call it.
    function Button(props: { children: unknown }): Node {
      return h('button', null, (() => props.children) as () => unknown);
    }

    const label = signal('Click me');
    const el = h(Button, { children: () => label() }) as HTMLButtonElement;
    expect(el.textContent).toBe('Click me');
  });

  it('updates reactively when signal inside nested function child changes', async () => {
    const label = signal('Before');

    function Button(props: { children: unknown }): Node {
      return h('button', null, (() => props.children) as () => unknown);
    }

    const el = h(Button, { children: () => label() }) as HTMLButtonElement;
    expect(el.textContent).toBe('Before');

    label.set('After');
    await Promise.resolve();
    expect(el.textContent).toBe('After');
  });

  it('resolves a deeply nested function chain to a text node', () => {
    // Edge case: getter returning getter returning string
    const inner = () => 'deep';
    const outer = () => inner;
    const el = h('span', null, outer as () => unknown);
    expect(el.textContent).toBe('deep');
  });
});

// =============================================================================
// Issue #58 — reactive children in <textarea> should set textContent
// =============================================================================

describe('h() - textarea reactive children (#58)', () => {
  it('sets initial textContent for reactive string child', () => {
    const notes = signal('hello');
    const el = h('textarea', null, () => notes()) as HTMLTextAreaElement;
    expect(el.textContent).toBe('hello');
    expect(el.value).toBe('hello');
  });

  it('updates textContent reactively when signal changes', async () => {
    const notes = signal('hello');
    const el = h('textarea', null, () => notes()) as HTMLTextAreaElement;
    expect(el.textContent).toBe('hello');

    notes.set('world');
    await Promise.resolve();
    expect(el.textContent).toBe('world');
  });

  it('does NOT insert a comment node into textarea', () => {
    const notes = signal('hello');
    const el = h('textarea', null, () => notes()) as HTMLTextAreaElement;
    const hasComment = Array.from(el.childNodes).some(n => n.nodeType === Node.COMMENT_NODE);
    expect(hasComment).toBe(false);
  });

  it('handles null/undefined value as empty string', () => {
    const notes = signal<string | null>(null);
    const el = h('textarea', null, () => notes()) as HTMLTextAreaElement;
    expect(el.textContent).toBe('');
  });
});
