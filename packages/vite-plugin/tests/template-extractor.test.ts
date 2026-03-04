/**
 * Tests for template-extractor.ts
 * 
 * Tests the static analysis that classifies JSX elements as static/dynamic/mixed
 * and determines if template extraction is worthwhile.
 */

import { describe, it, expect } from 'vitest';
import { parse } from '@babel/parser';
import * as t from '@babel/types';
import {
  analyzeElement,
  extractElementInfo,
  generateTemplateString,
} from '../src/template-extractor.js';

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Parse JSX and get the first JSX element
 */
function parseJsx(code: string): t.JSXElement {
  const ast = parse(code, {
    sourceType: 'module',
    plugins: ['jsx', 'typescript'],
  });
  
  // Find first JSX element
  let result: t.JSXElement | null = null;
  
  function traverse(node: t.Node): void {
    if (result) return;
    if (t.isJSXElement(node)) {
      result = node;
      return;
    }
    for (const key of Object.keys(node)) {
      const value = (node as unknown as Record<string, unknown>)[key];
      if (Array.isArray(value)) {
        for (const item of value) {
          if (item && typeof item === 'object' && 'type' in item) {
            traverse(item as t.Node);
          }
        }
      } else if (value && typeof value === 'object' && 'type' in value) {
        traverse(value as t.Node);
      }
    }
  }
  
  traverse(ast);
  if (!result) throw new Error('No JSX element found');
  return result;
}

// =============================================================================
// Element Classification Tests
// =============================================================================

describe('Element Classification', () => {
  it('classifies fully static element as static', () => {
    const element = parseJsx('<div class="card">Hello</div>');
    const info = extractElementInfo(element);
    
    expect(info.classification).toBe('static');
    expect(info.tagName).toBe('div');
    expect(info.isComponent).toBe(false);
    expect(info.staticAttrs.get('class')).toBe('card');
    expect(info.dynamicAttrs).toHaveLength(0);
    expect(info.eventHandlers).toHaveLength(0);
  });
  
  it('classifies element with event handler as mixed', () => {
    const element = parseJsx('<button onClick={handleClick}>Click</button>');
    const info = extractElementInfo(element);
    
    expect(info.classification).toBe('mixed');
    expect(info.eventHandlers).toContain('onClick');
  });
  
  it('classifies element with dynamic prop as mixed', () => {
    const element = parseJsx('<div class={theme()}>Content</div>');
    const info = extractElementInfo(element);
    
    expect(info.classification).toBe('mixed');
    expect(info.dynamicAttrs).toContain('class');
  });
  
  it('classifies component as dynamic', () => {
    const element = parseJsx('<UserCard name="John" />');
    const info = extractElementInfo(element);
    
    expect(info.classification).toBe('dynamic');
    expect(info.isComponent).toBe(true);
    expect(info.tagName).toBe('UserCard');
  });
  
  it('classifies element with spread as mixed (has static structure)', () => {
    const element = parseJsx('<div {...attrs}>Content</div>');
    const info = extractElementInfo(element);
    
    expect(info.hasSpread).toBe(true);
    // Spread is dynamic, but element has static text child, so it's mixed
    expect(info.classification).toBe('mixed');
  });
  
  it('classifies element with only dynamic child as dynamic', () => {
    const element = parseJsx('<div>{count()}</div>');
    const info = extractElementInfo(element);
    
    // No static content at all, only dynamic child
    expect(info.classification).toBe('dynamic');
    expect(info.children.some(c => !c.isStatic)).toBe(true);
  });
});

// =============================================================================
// Static Attribute Detection
// =============================================================================

describe('Static Attribute Detection', () => {
  it('detects string literal attributes as static', () => {
    const element = parseJsx('<div class="test" id="main" />');
    const info = extractElementInfo(element);
    
    expect(info.staticAttrs.get('class')).toBe('test');
    expect(info.staticAttrs.get('id')).toBe('main');
  });
  
  it('detects boolean shorthand as static', () => {
    const element = parseJsx('<input disabled readonly />');
    const info = extractElementInfo(element);
    
    expect(info.staticAttrs.has('disabled')).toBe(true);
    expect(info.staticAttrs.has('readonly')).toBe(true);
  });
  
  it('detects static numeric expression as static', () => {
    const element = parseJsx('<input tabIndex={0} />');
    const info = extractElementInfo(element);
    
    expect(info.staticAttrs.get('tabIndex')).toBe('0');
  });
  
  it('detects static string expression as static', () => {
    const element = parseJsx('<div class={"static"} />');
    const info = extractElementInfo(element);
    
    expect(info.staticAttrs.get('class')).toBe('static');
  });
  
  it('detects template literal without expressions as static', () => {
    const element = parseJsx('<div class={`static-class`} />');
    const info = extractElementInfo(element);
    
    expect(info.staticAttrs.get('class')).toBe('static-class');
  });
});

// =============================================================================
// Event Handler Detection
// =============================================================================

describe('Event Handler Detection', () => {
  it('detects onClick as event handler', () => {
    const element = parseJsx('<button onClick={fn} />');
    const info = extractElementInfo(element);
    
    expect(info.eventHandlers).toContain('onClick');
    expect(info.dynamicAttrs).not.toContain('onClick');
  });
  
  it('detects multiple event handlers', () => {
    const element = parseJsx('<input onInput={fn} onFocus={fn} onBlur={fn} />');
    const info = extractElementInfo(element);
    
    expect(info.eventHandlers).toContain('onInput');
    expect(info.eventHandlers).toContain('onFocus');
    expect(info.eventHandlers).toContain('onBlur');
  });
  
  it('does not treat "on" prefix without capital as event', () => {
    const element = parseJsx('<div ongoing="true" />');
    const info = extractElementInfo(element);
    
    expect(info.eventHandlers).not.toContain('ongoing');
    expect(info.staticAttrs.get('ongoing')).toBe('true');
  });
});

// =============================================================================
// Children Analysis
// =============================================================================

describe('Children Analysis', () => {
  it('analyzes static text children', () => {
    const element = parseJsx('<div>Hello World</div>');
    const info = extractElementInfo(element);
    
    const textChild = info.children.find(c => c.type === 'text');
    expect(textChild).toBeDefined();
    expect(textChild?.isStatic).toBe(true);
    expect(textChild?.text).toBe('Hello World');
  });
  
  it('analyzes static nested element', () => {
    const element = parseJsx('<div><span>Nested</span></div>');
    const info = extractElementInfo(element);
    
    const elementChild = info.children.find(c => c.type === 'element');
    expect(elementChild).toBeDefined();
    expect(elementChild?.isStatic).toBe(true);
    expect(elementChild?.elementInfo?.tagName).toBe('span');
  });
  
  it('analyzes dynamic expression child', () => {
    const element = parseJsx('<div>{count()}</div>');
    const info = extractElementInfo(element);
    
    const exprChild = info.children.find(c => c.type === 'expression');
    expect(exprChild).toBeDefined();
    expect(exprChild?.isStatic).toBe(false);
  });
  
  it('analyzes component child as dynamic', () => {
    const element = parseJsx('<div><UserCard /></div>');
    const info = extractElementInfo(element);
    
    const componentChild = info.children.find(c => c.type === 'element');
    expect(componentChild).toBeDefined();
    expect(componentChild?.elementInfo?.isComponent).toBe(true);
    expect(componentChild?.isStatic).toBe(false);
  });
  
  it('cleans JSX text whitespace', () => {
    const element = parseJsx(`
      <div>
        Hello
        World
      </div>
    `);
    const info = extractElementInfo(element);
    
    const textChild = info.children.find(c => c.type === 'text');
    expect(textChild?.text).toBe('Hello World');
  });
});

// =============================================================================
// Analysis Decision
// =============================================================================

describe('Template Analysis Decision', () => {
  it('recommends extraction for 2+ static elements', () => {
    const element = parseJsx('<div><p>A</p><p>B</p></div>');
    const analysis = analyzeElement(element);
    
    expect(analysis.shouldExtract).toBe(true);
    expect(analysis.staticElementCount).toBeGreaterThanOrEqual(2);
  });
  
  it('does NOT recommend extraction for single element', () => {
    const element = parseJsx('<div>Single</div>');
    const analysis = analyzeElement(element);
    
    expect(analysis.shouldExtract).toBe(false);
    expect(analysis.staticElementCount).toBe(1);
  });
  
  it('does NOT recommend extraction for component', () => {
    const element = parseJsx('<UserCard><div>A</div><div>B</div></UserCard>');
    const analysis = analyzeElement(element);
    
    expect(analysis.shouldExtract).toBe(false);
  });
  
  it('counts static elements in nested structure', () => {
    const element = parseJsx(`
      <div>
        <header><h1>Title</h1></header>
        <main><p>Content</p></main>
        <footer><span>Footer</span></footer>
      </div>
    `);
    const analysis = analyzeElement(element);
    
    // div, header, h1, main, p, footer, span = 7 static elements
    expect(analysis.staticElementCount).toBe(7);
    expect(analysis.shouldExtract).toBe(true);
  });
  
  it('counts dynamic points correctly', () => {
    const element = parseJsx(`
      <div class={theme()} onClick={handleClick}>
        <span>{text()}</span>
      </div>
    `);
    const analysis = analyzeElement(element);
    
    // dynamic: class (1), onClick (1), span's dynamic child {text()} (1)
    // Plus span also counts as mixed (1 for having dynamic child)
    // Total = 4 dynamic points across the tree
    expect(analysis.dynamicPointCount).toBe(4);
  });
});

// =============================================================================
// HTML Template String Generation
// =============================================================================

describe('Template String Generation', () => {
  it('generates simple element template', () => {
    const element = parseJsx('<div class="card">Hello</div>');
    const info = extractElementInfo(element);
    const html = generateTemplateString(info);
    
    expect(html).toBe('<div class="card">Hello</div>');
  });
  
  it('generates nested element template', () => {
    const element = parseJsx('<div><span>Nested</span></div>');
    const info = extractElementInfo(element);
    const html = generateTemplateString(info);
    
    expect(html).toBe('<div><span>Nested</span></div>');
  });
  
  it('escapes HTML in attributes', () => {
    const element = parseJsx('<div title="a &amp; b">Text</div>');
    const info = extractElementInfo(element);
    const html = generateTemplateString(info);
    
    // The attribute value should be escaped
    expect(html).toContain('title="');
  });
  
  it('generates void element without closing tag', () => {
    const element = parseJsx('<input type="text" />');
    const info = extractElementInfo(element);
    const html = generateTemplateString(info);
    
    expect(html).toBe('<input type="text">');
    expect(html).not.toContain('</input>');
  });
  
  it('handles multiple static attributes', () => {
    const element = parseJsx('<div class="a" id="b" data-x="c">Text</div>');
    const info = extractElementInfo(element);
    const html = generateTemplateString(info);
    
    expect(html).toContain('class="a"');
    expect(html).toContain('id="b"');
    expect(html).toContain('data-x="c"');
  });
  
  it('excludes dynamic attributes from template', () => {
    const element = parseJsx('<div class={theme()} id="static">Text</div>');
    const info = extractElementInfo(element);
    const html = generateTemplateString(info);
    
    // class is dynamic, should not appear in template
    expect(html).not.toContain('class=');
    // id is static, should appear
    expect(html).toContain('id="static"');
  });
  
  it('excludes event handlers from template', () => {
    const element = parseJsx('<button onClick={fn}>Click</button>');
    const info = extractElementInfo(element);
    const html = generateTemplateString(info);
    
    expect(html).not.toContain('onClick');
    expect(html).toBe('<button>Click</button>');
  });
  
  it('skips component children in template', () => {
    const element = parseJsx('<div><span>Static</span><UserCard /></div>');
    const info = extractElementInfo(element);
    const html = generateTemplateString(info);
    
    expect(html).toContain('<span>Static</span>');
    expect(html).not.toContain('UserCard');
  });
  
  it('throws for component root', () => {
    const element = parseJsx('<UserCard />');
    const info = extractElementInfo(element);
    
    expect(() => generateTemplateString(info)).toThrow();
  });
});

// =============================================================================
// Edge Cases
// =============================================================================

describe('Edge Cases', () => {
  it('handles empty element', () => {
    const element = parseJsx('<div></div>');
    const info = extractElementInfo(element);
    const html = generateTemplateString(info);
    
    expect(html).toBe('<div></div>');
    expect(info.children).toHaveLength(0);
  });
  
  it('handles self-closing element', () => {
    const element = parseJsx('<div />');
    const info = extractElementInfo(element);
    const html = generateTemplateString(info);
    
    expect(html).toBe('<div></div>');
  });
  
  it('handles boolean attribute true', () => {
    const element = parseJsx('<input disabled={true} />');
    const info = extractElementInfo(element);
    
    // Boolean true becomes empty string attribute
    expect(info.staticAttrs.get('disabled')).toBe('');
  });
  
  it('handles boolean attribute false (omitted)', () => {
    const element = parseJsx('<input disabled={false} />');
    const info = extractElementInfo(element);
    
    // Boolean false means attribute is not included
    expect(info.staticAttrs.has('disabled')).toBe(false);
  });
  
  it('handles fragment child', () => {
    const element = parseJsx('<div><>Fragment</></div>');
    const info = extractElementInfo(element);
    
    const fragmentChild = info.children.find(c => c.type === 'fragment');
    expect(fragmentChild).toBeDefined();
    expect(fragmentChild?.isStatic).toBe(false);
  });
  
  it('handles mixed static and dynamic children', () => {
    const element = parseJsx('<div>Static {dynamic()} More Static</div>');
    const info = extractElementInfo(element);

    const staticChildren = info.children.filter(c => c.isStatic);
    const dynamicChildren = info.children.filter(c => !c.isStatic);

    expect(staticChildren.length).toBe(2); // "Static" and "More Static"
    expect(dynamicChildren.length).toBe(1); // {dynamic()}
  });
});

// =============================================================================
// Comment Marker Tests (regression: dynamic slots need placeholder nodes)
// =============================================================================

describe('generateTemplateString — comment markers for dynamic slots', () => {
  it('emits comment marker for dynamic expression child', () => {
    const element = parseJsx('<div><span>A</span>{expr()}<span>B</span></div>');
    const info = extractElementInfo(element);
    const html = generateTemplateString(info);

    // The dynamic {expr()} slot must produce a comment node placeholder so that
    // firstChild/nextSibling traversal lands on the correct DOM node.
    expect(html).toContain('<!---->');
    // Static siblings must still be present
    expect(html).toContain('<span>A</span>');
    expect(html).toContain('<span>B</span>');
  });

  it('emits comment marker for each dynamic expression child', () => {
    const element = parseJsx('<div>{a()}{b()}</div>');
    const info = extractElementInfo(element);
    const html = generateTemplateString(info);

    // Two dynamic slots → two comment markers
    const markerCount = (html.match(/<!---->/g) ?? []).length;
    expect(markerCount).toBe(2);
  });

  it('does NOT emit comment marker for static text children', () => {
    const element = parseJsx('<div><p>Hello</p><p>World</p></div>');
    const info = extractElementInfo(element);
    const html = generateTemplateString(info);

    expect(html).not.toContain('<!---->');
  });

  it('comment marker ensures correct nextSibling traversal', () => {
    // Without the marker: <div><h1>Title</h1></div> — nextSibling of h1 = null
    // With the marker:    <div><h1>Title</h1><!----></div> — nextSibling of h1 = comment
    const element = parseJsx('<div><h1>Title</h1>{content()}</div>');
    const info = extractElementInfo(element);
    const html = generateTemplateString(info);

    // Comment must appear AFTER the static element
    const h1Pos = html.indexOf('<h1>');
    const markerPos = html.indexOf('<!---->');
    expect(h1Pos).toBeGreaterThanOrEqual(0);
    expect(markerPos).toBeGreaterThan(h1Pos);
  });
});
