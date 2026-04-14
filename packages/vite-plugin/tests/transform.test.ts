/**
 * Tests for the main transform function
 */

import { describe, it, expect } from 'vitest';
import { transform, transformCode } from '../src/transform.js';

// =============================================================================
// Basic Transform Tests
// =============================================================================

describe('transform', () => {
  const defaultOptions = {
    extensions: ['.tsx', '.jsx'],
    hmr: false,
    importSource: '@liteforge/runtime',
    templateExtraction: false as const,
  };

  it('returns original code for non-JSX files', () => {
    const code = 'const x = 1 + 2;';
    const result = transform(code, defaultOptions);
    expect(result.code).toBe(code);
    expect(result.hasJsx).toBe(false);
    expect(result.hasFragment).toBe(false);
  });

  it('transforms simple JSX element', () => {
    const code = 'const el = <div class="test">Hello</div>;';
    const result = transform(code, defaultOptions);
    expect(result.hasJsx).toBe(true);
    expect(result.code).toContain('import { h } from');
    expect(result.code).toContain('h("div"');
    expect(result.code).toContain('"class"');
    expect(result.code).toContain('"test"');
    expect(result.code).toContain('"Hello"');
  });

  it('transforms JSX fragment', () => {
    const code = 'const el = <><div>A</div><div>B</div></>;';
    const result = transform(code, defaultOptions);
    expect(result.hasJsx).toBe(true);
    expect(result.hasFragment).toBe(true);
    expect(result.code).toContain('import { h, Fragment } from');
    expect(result.code).toContain('h(Fragment');
  });

  it('wraps dynamic props in getter functions', () => {
    const code = 'const el = <div class={theme()}>Text</div>;';
    const result = transform(code, defaultOptions);
    expect(result.code).toContain('"class"');
    expect(result.code).toContain('=>');
    expect(result.code).toContain('theme()');
  });

  it('does NOT wrap event handlers', () => {
    const code = 'const el = <button onClick={() => handleClick()}>Click</button>;';
    const result = transform(code, defaultOptions);
    // onClick should NOT be double-wrapped
    const onClickMatches = result.code.match(/onClick/g);
    expect(onClickMatches?.length).toBe(1);
    // Only one arrow function for the handler itself
    // Not counting the imports line
    const codeWithoutImport = result.code.replace(/import.*\n/, '');
    expect(codeWithoutImport.match(/=>/g)?.length).toBe(1);
  });

  it('does NOT wrap static literals', () => {
    const code = 'const el = <div tabIndex={0} class="static" hidden={true}>Text</div>;';
    const result = transform(code, defaultOptions);
    // Generated code uses quoted keys: "tabIndex": 0
    expect(result.code).toContain('"tabIndex": 0');
    expect(result.code).toContain('"class": "static"');
    expect(result.code).toContain('"hidden": true');
  });

  it('transforms component (PascalCase)', () => {
    const code = 'const el = <UserCard name="John" />;';
    const result = transform(code, defaultOptions);
    expect(result.code).toContain('h(UserCard');
    expect(result.code).toContain('"name"');
    expect(result.code).toContain('"John"');
  });

  it('distinguishes HTML elements from components', () => {
    const code = `
      const html = <div>HTML</div>;
      const component = <MyComponent>Component</MyComponent>;
    `;
    const result = transform(code, defaultOptions);
    // HTML element should have string tag
    expect(result.code).toContain('h("div"');
    // Component should have identifier tag
    expect(result.code).toContain('h(MyComponent');
  });
});

// =============================================================================
// transformCode Tests (simplified API)
// =============================================================================

describe('transformCode', () => {
  it('transforms JSX and returns code string', () => {
    const code = '<div>Hello</div>';
    const result = transformCode(code);
    expect(result).toContain('h("div"');
    expect(result).toContain('"Hello"');
  });

  it('uses custom import source', () => {
    const code = '<div>Hello</div>';
    const result = transformCode(code, '@custom/runtime');
    expect(result).toContain("import { h } from '@custom/runtime'");
  });
});

// =============================================================================
// Auto-Import Tests
// =============================================================================

describe('Auto-Import', () => {
  const defaultOptions = {
    extensions: ['.tsx', '.jsx'],
    hmr: false,
    importSource: '@liteforge/runtime',
    templateExtraction: false as const,
  };

  it('adds h import when JSX is found', () => {
    const code = '<div>Hello</div>';
    const result = transform(code, defaultOptions);
    expect(result.code).toContain("import { h } from '@liteforge/runtime'");
  });

  it('adds Fragment import when fragment is used', () => {
    const code = '<>Hello</>';
    const result = transform(code, defaultOptions);
    expect(result.code).toContain("import { h, Fragment } from '@liteforge/runtime'");
  });

  it('does NOT add h import if already present', () => {
    const code = `
      import { h } from '@liteforge/runtime';
      const el = <div>Hello</div>;
    `;
    const result = transform(code, defaultOptions);
    // Should only have one h import
    const hMatches = result.code.match(/import.*h.*from/g);
    expect(hMatches?.length).toBe(1);
  });

  it('does NOT add Fragment import if already present', () => {
    const code = `
      import { h, Fragment } from '@liteforge/runtime';
      const el = <>Hello</>;
    `;
    const result = transform(code, defaultOptions);
    // Should only have one Fragment import
    const fragmentMatches = result.code.match(/Fragment/g);
    // One in import, one in h() call
    expect(fragmentMatches?.length).toBe(2);
  });
});

// =============================================================================
// Nested Elements Tests
// =============================================================================

describe('Nested Elements', () => {
  it('transforms nested HTML elements', () => {
    const code = `
      <div class="card">
        <h1>Title</h1>
        <p>Content</p>
      </div>
    `;
    const result = transformCode(code);
    expect(result).toContain('h("div"');
    expect(result).toContain('h("h1"');
    expect(result).toContain('h("p"');
  });

  it('transforms deeply nested elements', () => {
    const code = `
      <div>
        <section>
          <article>
            <p>Deep</p>
          </article>
        </section>
      </div>
    `;
    const result = transformCode(code);
    expect(result).toContain('h("div"');
    expect(result).toContain('h("section"');
    expect(result).toContain('h("article"');
    expect(result).toContain('h("p"');
  });

  it('transforms mixed HTML and components', () => {
    const code = `
      <div>
        <Header />
        <main>
          <Article title="Test" />
        </main>
        <Footer />
      </div>
    `;
    const result = transformCode(code);
    expect(result).toContain('h("div"');
    expect(result).toContain('h(Header');
    expect(result).toContain('h("main"');
    expect(result).toContain('h(Article');
    expect(result).toContain('h(Footer');
  });
});

// =============================================================================
// Dynamic Children Tests
// =============================================================================

describe('Dynamic Children', () => {
  it('wraps dynamic child expressions', () => {
    const code = '<div>{count()}</div>';
    const result = transformCode(code);
    // Should wrap count() in getter
    expect(result).toContain('=>');
    expect(result).toContain('count()');
  });

  it('wraps template literals with expressions', () => {
    const code = '<div>{`Count: ${count()}`}</div>';
    const result = transformCode(code);
    expect(result).toContain('=>');
    expect(result).toContain('count()');
  });

  it('does NOT wrap static string children', () => {
    const code = '<div>Static text</div>';
    const result = transformCode(code);
    expect(result).toContain('"Static text"');
    // No arrow functions for static content
    const codeWithoutImport = result.replace(/import.*\n/, '');
    expect(codeWithoutImport).not.toContain('=>');
  });

  it('does NOT wrap render props (arrow functions)', () => {
    const code = '<For each={items()}>{(item) => <li>{item.name}</li>}</For>';
    const result = transformCode(code);
    // The render prop should NOT be additionally wrapped
    // It should appear as: (item) => h("li", ...)
    expect(result).toContain('(item) =>');
  });
});

// =============================================================================
// Spread Props Tests
// =============================================================================

describe('Spread Props', () => {
  it('transforms spread props', () => {
    const code = '<div {...attrs}>Content</div>';
    const result = transformCode(code);
    expect(result).toContain('...attrs');
  });

  it('transforms mixed regular and spread props', () => {
    const code = '<div class="base" {...attrs} id="main">Content</div>';
    const result = transformCode(code);
    expect(result).toContain('"class"');
    expect(result).toContain('...attrs');
    expect(result).toContain('"id"');
  });
});

// =============================================================================
// Control Flow Components Tests
// =============================================================================

describe('Control Flow Components', () => {
  it('transforms Show component', () => {
    const code = `
      <Show when={isVisible()} fallback={<Loading />}>
        <Content />
      </Show>
    `;
    const result = transformCode(code);
    expect(result).toContain('h(Show');
    expect(result).toContain('"when"');
    expect(result).toContain('"fallback"');
    expect(result).toContain('h(Loading');
    expect(result).toContain('h(Content');
  });

  it('transforms For component with render prop', () => {
    const code = `
      <For each={items()}>
        {(item) => <li>{item.name}</li>}
      </For>
    `;
    const result = transformCode(code);
    expect(result).toContain('h(For');
    expect(result).toContain('"each"');
    expect(result).toContain('(item) =>');
    expect(result).toContain('h("li"');
  });

  it('transforms Switch/Match components', () => {
    const code = `
      <Switch>
        <Match when={value() === 'a'}>A</Match>
        <Match when={value() === 'b'}>B</Match>
      </Switch>
    `;
    const result = transformCode(code);
    expect(result).toContain('h(Switch');
    expect(result).toContain('h(Match');
    expect(result).toContain('"when"');
  });

  it('transforms Dynamic component', () => {
    const code = '<Dynamic component={currentView()} props={{ id: 42 }} />';
    const result = transformCode(code);
    expect(result).toContain('h(Dynamic');
    expect(result).toContain('"component"');
    expect(result).toContain('"props"');
  });
});

// =============================================================================
// autoWrapProps — Issue #38
// =============================================================================

describe('autoWrapProps transform', () => {
  it('wraps {props.label} in content position to () => props.label', () => {
    const code = '<button>{props.label}</button>';
    const result = transformCode(code);
    // transformCode uses Babel generate with default spacing
    expect(result).toMatch(/\(\)\s*=>\s*props\.label/);
  });

  it('wraps nested {props.user.name} to () => props.user.name', () => {
    const code = '<span>{props.user.name}</span>';
    const result = transformCode(code);
    expect(result).toMatch(/\(\)\s*=>\s*props\.user\.name/);
  });

  it('does NOT double-wrap {() => props.label} — already a getter', () => {
    const code = '<span>{() => props.label}</span>';
    const result = transformCode(code);
    // Should contain a single getter, not ()=>()=>...
    expect(result).toMatch(/\(\)\s*=>\s*props\.label/);
    expect(result).not.toMatch(/\(\)\s*=>\s*\(\)\s*=>/);
  });

  it('wraps props.x ?? fallback expression (LogicalExpression)', () => {
    const code = '<span>{props.label ?? "—"}</span>';
    const result = transformCode(code);
    expect(result).toMatch(/\(\)\s*=>/);
    expect(result).toContain('props.label');
  });

  it('wraps props.x in a fragment child', () => {
    const code = '<>{props.title}</>';
    const result = transformCode(code);
    expect(result).toMatch(/\(\)\s*=>\s*props\.title/);
  });
});
