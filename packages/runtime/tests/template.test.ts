import { describe, it, expect, beforeEach, vi } from 'vitest';
import { signal } from '@liteforge/core';
import { _template, _insert, _setProp, _addEventListener } from '../src/template.js';

// =============================================================================
// _template()
// =============================================================================

describe('_template', () => {
  describe('basic functionality', () => {
    it('creates a template factory from HTML string', () => {
      const tmpl = _template('<div class="card"></div>');
      expect(typeof tmpl).toBe('function');
    });

    it('returns a cloned DOM node on each call', () => {
      const tmpl = _template('<div class="card"></div>');
      
      const el1 = tmpl();
      const el2 = tmpl();
      
      expect(el1).toBeInstanceOf(Node);
      expect(el2).toBeInstanceOf(Node);
      expect(el1).not.toBe(el2); // Different instances
    });

    it('preserves element attributes', () => {
      const tmpl = _template('<div class="card" id="test" data-value="123"></div>');
      const el = tmpl() as HTMLElement;
      
      expect(el.className).toBe('card');
      expect(el.id).toBe('test');
      expect(el.dataset.value).toBe('123');
    });

    it('preserves nested structure', () => {
      const tmpl = _template('<div class="card"><h1>Title</h1><p>Content</p></div>');
      const el = tmpl() as HTMLElement;
      
      expect(el.children.length).toBe(2);
      expect(el.firstChild?.textContent).toBe('Title');
      expect(el.lastChild?.textContent).toBe('Content');
    });

    it('preserves deeply nested structure', () => {
      const tmpl = _template('<div><ul><li><a href="#">Link 1</a></li><li><a href="#">Link 2</a></li></ul></div>');
      const el = tmpl() as HTMLElement;
      
      const links = el.querySelectorAll('a');
      expect(links.length).toBe(2);
      expect(links[0]?.textContent).toBe('Link 1');
      expect(links[1]?.textContent).toBe('Link 2');
    });

    it('handles void elements correctly', () => {
      const tmpl = _template('<div><img src="test.jpg" alt="test"><br><input type="text"></div>');
      const el = tmpl() as HTMLElement;
      
      expect(el.querySelector('img')).not.toBeNull();
      expect(el.querySelector('br')).not.toBeNull();
      expect(el.querySelector('input')).not.toBeNull();
    });

    it('handles text content', () => {
      const tmpl = _template('<p>Hello, World!</p>');
      const el = tmpl() as HTMLElement;
      
      expect(el.textContent).toBe('Hello, World!');
    });

    it('handles mixed text and elements', () => {
      const tmpl = _template('<p>Hello <strong>World</strong>!</p>');
      const el = tmpl() as HTMLElement;
      
      expect(el.textContent).toBe('Hello World!');
      expect(el.querySelector('strong')?.textContent).toBe('World');
    });

    it('caches the template element', () => {
      const tmpl = _template('<div></div>');
      
      // Call multiple times
      tmpl();
      tmpl();
      tmpl();
      
      // The template should only be created once (internal caching)
      // We can verify this by checking that clones are independent
      const el1 = tmpl();
      (el1 as HTMLElement).className = 'modified';
      
      const el2 = tmpl();
      expect((el2 as HTMLElement).className).toBe('');
    });

    it('throws error for empty template', () => {
      const tmpl = _template('');
      expect(() => tmpl()).toThrow('Template is empty');
    });
  });

  describe('DOM traversal', () => {
    it('allows firstChild access', () => {
      const tmpl = _template('<div><span>First</span><span>Second</span></div>');
      const el = tmpl();
      
      expect(el.firstChild).toBeInstanceOf(Node);
      expect((el.firstChild as HTMLElement).textContent).toBe('First');
    });

    it('allows nextSibling access', () => {
      const tmpl = _template('<div><span>First</span><span>Second</span></div>');
      const el = tmpl();
      
      const first = el.firstChild;
      const second = first?.nextSibling;
      
      expect((second as HTMLElement).textContent).toBe('Second');
    });

    it('allows deep traversal', () => {
      const tmpl = _template('<div><header><h1>Title</h1></header><main><p>Content</p></main></div>');
      const el = tmpl();
      
      // div > header > h1
      const h1 = el.firstChild?.firstChild;
      expect((h1 as HTMLElement).tagName).toBe('H1');
      
      // div > main > p
      const p = el.firstChild?.nextSibling?.firstChild;
      expect((p as HTMLElement).tagName).toBe('P');
    });
  });
});

// =============================================================================
// _insert()
// =============================================================================

describe('_insert', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
  });

  describe('static values', () => {
    it('inserts string content', () => {
      _insert(container, 'Hello, World!');
      expect(container.textContent).toBe('Hello, World!');
    });

    it('inserts number content', () => {
      _insert(container, 42);
      expect(container.textContent).toBe('42');
    });

    it('inserts DOM node', () => {
      const span = document.createElement('span');
      span.textContent = 'Test';
      
      _insert(container, span);
      
      expect(container.firstChild).toBe(span);
      expect(container.textContent).toBe('Test');
    });

    it('inserts array of values', () => {
      _insert(container, ['Hello', ' ', 'World']);
      expect(container.textContent).toBe('Hello World');
    });

    it('inserts array of nodes', () => {
      const span1 = document.createElement('span');
      span1.textContent = 'A';
      const span2 = document.createElement('span');
      span2.textContent = 'B';
      
      _insert(container, [span1, span2]);
      
      expect(container.children.length).toBe(2);
      expect(container.textContent).toBe('AB');
    });

    it('skips null values', () => {
      _insert(container, null);
      expect(container.childNodes.length).toBe(0);
    });

    it('skips undefined values', () => {
      _insert(container, undefined);
      expect(container.childNodes.length).toBe(0);
    });

    it('skips boolean true', () => {
      _insert(container, true);
      expect(container.childNodes.length).toBe(0);
    });

    it('skips boolean false', () => {
      _insert(container, false);
      expect(container.childNodes.length).toBe(0);
    });
  });

  describe('marker positioning', () => {
    it('inserts before marker when provided', () => {
      const existing = document.createTextNode('Existing');
      container.appendChild(existing);
      
      _insert(container, 'Inserted', existing);
      
      expect(container.textContent).toBe('InsertedExisting');
    });

    it('appends to end when no marker', () => {
      container.textContent = 'First';
      _insert(container, ' Second');
      
      expect(container.textContent).toBe('First Second');
    });
  });

  describe('reactive values', () => {
    it('creates effect for getter function', () => {
      const name = signal('Initial');
      
      _insert(container, () => name());
      
      expect(container.textContent).toBe('Initial');
      
      name.set('Updated');
      expect(container.textContent).toBe('Updated');
    });

    it('handles reactive arrays', () => {
      const items = signal(['A', 'B', 'C']);
      
      _insert(container, () => items());
      
      expect(container.textContent).toBe('ABC');
      
      items.set(['X', 'Y']);
      expect(container.textContent).toBe('XY');
    });

    it('handles reactive null', () => {
      const value = signal<string | null>('Initial');
      
      _insert(container, () => value());
      
      expect(container.textContent).toBe('Initial');
      
      value.set(null);
      expect(container.textContent).toBe('');
    });

    it('cleans up old nodes on update', () => {
      const count = signal(1);
      
      _insert(container, () => `Count: ${count()}`);
      
      expect(container.childNodes.length).toBe(1);
      
      count.set(2);
      expect(container.childNodes.length).toBe(1);
      expect(container.textContent).toBe('Count: 2');
    });
  });
});

// =============================================================================
// _setProp()
// =============================================================================

describe('_setProp', () => {
  let el: HTMLElement;

  beforeEach(() => {
    el = document.createElement('div');
  });

  describe('class attribute', () => {
    it('sets class from string', () => {
      _setProp(el, 'class', 'btn btn-primary');
      expect(el.className).toBe('btn btn-primary');
    });

    it('sets className', () => {
      _setProp(el, 'className', 'test-class');
      expect(el.className).toBe('test-class');
    });

    it('removes class when null', () => {
      el.className = 'existing';
      _setProp(el, 'class', null);
      expect(el.hasAttribute('class')).toBe(false);
    });

    it('handles reactive class', () => {
      const theme = signal('light');
      _setProp(el, 'class', () => theme());

      expect(el.className).toBe('light');

      theme.set('dark');
      expect(el.className).toBe('dark');
    });

    it('double-resolves precomputed getter variable — class={myGetter} (#41)', () => {
      // Simulates vite-plugin wrapping class={myGetter} to () => myGetter
      // (identifier wrapped, not called). The runtime must detect the result is
      // itself a function and call it once more.
      const active = signal(false);
      const myGetter = () => active() ? 'active' : '';

      _setProp(el, 'class', () => myGetter); // outer wrapper returns the fn, not its result

      expect(el.className).toBe('');

      active.set(true);
      expect(el.className).toBe('active');
    });
  });

  describe('style attribute', () => {
    it('sets style from string', () => {
      _setProp(el, 'style', 'color: red; font-size: 14px;');
      expect(el.style.color).toBe('red');
      expect(el.style.fontSize).toBe('14px');
    });

    it('sets style from object', () => {
      _setProp(el, 'style', { color: 'blue', 'font-size': '16px' });
      expect(el.style.color).toBe('blue');
    });
  });

  describe('data attributes', () => {
    it('sets data-* attribute', () => {
      _setProp(el, 'data-id', '123');
      expect(el.dataset.id).toBe('123');
    });

    it('removes data-* when null', () => {
      el.setAttribute('data-id', '123');
      _setProp(el, 'data-id', null);
      expect(el.hasAttribute('data-id')).toBe(false);
    });
  });

  describe('boolean attributes', () => {
    it('sets boolean true as empty attribute', () => {
      _setProp(el, 'disabled', true);
      expect(el.hasAttribute('disabled')).toBe(true);
      expect(el.getAttribute('disabled')).toBe('');
    });

    it('removes attribute when false', () => {
      el.setAttribute('disabled', '');
      _setProp(el, 'disabled', false);
      expect(el.hasAttribute('disabled')).toBe(false);
    });
  });

  describe('regular attributes', () => {
    it('sets string attribute', () => {
      _setProp(el, 'title', 'Hello');
      expect(el.getAttribute('title')).toBe('Hello');
    });

    it('sets number as string', () => {
      _setProp(el, 'tabindex', 0);
      expect(el.getAttribute('tabindex')).toBe('0');
    });

    it('removes attribute when null', () => {
      el.setAttribute('title', 'Hello');
      _setProp(el, 'title', null);
      expect(el.hasAttribute('title')).toBe(false);
    });
  });

  describe('event handlers', () => {
    it('adds event listener for onClick', () => {
      const handler = vi.fn();
      _setProp(el, 'onClick', handler);
      
      el.click();
      
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('adds event listener for custom events', () => {
      const handler = vi.fn();
      _setProp(el, 'onCustomEvent', handler);
      
      el.dispatchEvent(new CustomEvent('customevent'));
      
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('reactive props', () => {
    it('handles reactive attributes', () => {
      const id = signal('initial');
      _setProp(el, 'id', () => id());
      
      expect(el.id).toBe('initial');
      
      id.set('updated');
      expect(el.id).toBe('updated');
    });

    it('does not wrap event handlers in effect', () => {
      // Event handlers starting with 'on' should be added directly
      const handler = vi.fn();
      _setProp(el, 'onClick', handler);

      // Should not create an effect, just add the listener
      el.click();
      expect(handler).toHaveBeenCalled();
    });

    // ── ref prop (regression: was silently broken in template path) ──────────
    it('ref callback is called immediately with the element', () => {
      const cb = vi.fn();
      _setProp(el, 'ref', cb);
      expect(cb).toHaveBeenCalledOnce();
      expect(cb).toHaveBeenCalledWith(el);
    });

    it('ref callback receives the actual HTMLElement, not a string or undefined', () => {
      let captured: unknown = undefined;
      _setProp(el, 'ref', (node: unknown) => { captured = node; });
      expect(captured).toBe(el);
      expect(captured).toBeInstanceOf(HTMLElement);
    });

    it('non-function ref value is not called and does not throw', () => {
      // ref={someStringByMistake} should not throw
      expect(() => _setProp(el, 'ref', 'not-a-function')).not.toThrow();
    });
  });
});

// =============================================================================
// _addEventListener()
// =============================================================================

describe('_addEventListener', () => {
  it('adds event listener to element', () => {
    const el = document.createElement('button');
    const handler = vi.fn();
    
    _addEventListener(el, 'click', handler);
    el.click();
    
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('supports custom events', () => {
    const el = document.createElement('div');
    const handler = vi.fn();
    
    _addEventListener(el, 'custom', handler);
    el.dispatchEvent(new CustomEvent('custom'));
    
    expect(handler).toHaveBeenCalledTimes(1);
  });
});

// =============================================================================
// Integration
// =============================================================================

describe('Template Integration', () => {
  it('works like a real compiled component', () => {
    // Simulating compiled output for:
    // <div class="card"><h1>{name()}</h1><p class="static">Always the same</p></div>
    
    const _tmpl = _template('<div class="card"><h1></h1><p class="static">Always the same</p></div>');
    
    function Card(props: { name: () => string }) {
      const _el = _tmpl() as HTMLElement;
      const _h1 = _el.firstChild as HTMLElement;
      
      _insert(_h1, props.name);
      
      return _el;
    }
    
    const name = signal('John');
    const card = Card({ name: () => name() });
    
    expect(card.className).toBe('card');
    expect((card.querySelector('h1') as HTMLElement).textContent).toBe('John');
    expect((card.querySelector('p') as HTMLElement).textContent).toBe('Always the same');
    
    name.set('Jane');
    expect((card.querySelector('h1') as HTMLElement).textContent).toBe('Jane');
  });

  it('handles multiple dynamic slots', () => {
    const _tmpl = _template('<div class="user"><span class="name"></span><span class="email"></span></div>');
    
    function User(props: { name: () => string; email: () => string }) {
      const _el = _tmpl() as HTMLElement;
      const _name = _el.firstChild as HTMLElement;
      const _email = _name.nextSibling as HTMLElement;
      
      _insert(_name, props.name);
      _insert(_email, props.email);
      
      return _el;
    }
    
    const name = signal('John');
    const email = signal('john@example.com');
    const user = User({ name: () => name(), email: () => email() });
    
    expect((user.querySelector('.name') as HTMLElement).textContent).toBe('John');
    expect((user.querySelector('.email') as HTMLElement).textContent).toBe('john@example.com');
    
    name.set('Jane');
    email.set('jane@example.com');
    
    expect((user.querySelector('.name') as HTMLElement).textContent).toBe('Jane');
    expect((user.querySelector('.email') as HTMLElement).textContent).toBe('jane@example.com');
  });

  it('handles event handlers on template elements', () => {
    const _tmpl = _template('<div><button>Click me</button></div>');
    
    function Button(props: { onClick: () => void }) {
      const _el = _tmpl() as HTMLElement;
      const _btn = _el.firstChild as HTMLElement;
      
      _addEventListener(_btn, 'click', props.onClick);
      
      return _el;
    }
    
    const onClick = vi.fn();
    const el = Button({ onClick });
    
    (el.querySelector('button') as HTMLElement).click();
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('handles dynamic props on template elements', () => {
    const _tmpl = _template('<div><button>Submit</button></div>');
    
    function Button(props: { disabled: () => boolean }) {
      const _el = _tmpl() as HTMLElement;
      const _btn = _el.firstChild as HTMLButtonElement;
      
      _setProp(_btn, 'disabled', props.disabled);
      
      return _el;
    }
    
    const disabled = signal(false);
    const el = Button({ disabled: () => disabled() });
    const btn = el.querySelector('button') as HTMLButtonElement;
    
    expect(btn.disabled).toBe(false);
    
    disabled.set(true);
    expect(btn.disabled).toBe(true);
  });
});
