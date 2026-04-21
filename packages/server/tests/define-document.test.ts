import { describe, it, expect } from 'vitest'
import { defineDocument, renderDocument } from '../src/define-document.js'

describe('defineDocument', () => {
  it('returns a DocumentDescriptor with the _tag and wrapped config', () => {
    const doc = defineDocument({ lang: 'de' })
    expect(doc._tag).toBe('LiteForgeDocument')
    expect(doc.config).toEqual({ lang: 'de' })
  })

  it('accepts an empty config', () => {
    const doc = defineDocument({})
    expect(doc.config).toEqual({})
  })
})

describe('renderDocument — minimal shell', () => {
  it('produces a valid HTML doctype document with lang + mount-point', () => {
    const doc = defineDocument({})
    const html = renderDocument(doc, { mountId: 'app' })

    expect(html).toMatch(/^<!DOCTYPE html>/)
    expect(html).toContain('<html lang="en">')
    expect(html).toContain('<meta charset="UTF-8">')
    expect(html).toContain('<div id="app"></div>')
    expect(html).toMatch(/<\/html>$/)
  })

  it('respects custom lang', () => {
    const doc = defineDocument({ lang: 'de-AT' })
    const html = renderDocument(doc, { mountId: 'root' })
    expect(html).toContain('<html lang="de-AT">')
    expect(html).toContain('<div id="root"></div>')
  })

  it('inserts contentSlot inside the mount-point div', () => {
    const doc = defineDocument({})
    const html = renderDocument(doc, { mountId: 'app', contentSlot: '<p>hello</p>' })
    expect(html).toContain('<div id="app"><p>hello</p></div>')
  })
})

describe('renderDocument — head fields', () => {
  it('renders title, description, and additional meta tags', () => {
    const doc = defineDocument({
      head: {
        title: 'Kontor',
        description: 'Business management',
        meta: [
          { name: 'viewport', content: 'width=device-width, initial-scale=1' },
          { property: 'og:title', content: 'Kontor' },
          { property: 'twitter:card', content: 'summary_large_image' },
        ],
      },
    })
    const html = renderDocument(doc, { mountId: 'app' })

    expect(html).toContain('<title>Kontor</title>')
    expect(html).toContain('<meta name="description" content="Business management">')
    expect(html).toContain('<meta name="viewport" content="width=device-width, initial-scale=1">')
    expect(html).toContain('<meta property="og:title" content="Kontor">')
    expect(html).toContain('<meta property="twitter:card" content="summary_large_image">')
  })

  it('renders link tags with rel + href + optional attrs', () => {
    const doc = defineDocument({
      head: {
        links: [
          { rel: 'stylesheet', href: '/styles.css' },
          { rel: 'icon', href: '/favicon.ico', type: 'image/x-icon' },
          { rel: 'preconnect', href: 'https://cdn.example.com', crossorigin: 'anonymous' },
        ],
      },
    })
    const html = renderDocument(doc, { mountId: 'app' })

    expect(html).toContain('<link rel="stylesheet" href="/styles.css">')
    expect(html).toContain('<link rel="icon" href="/favicon.ico" type="image/x-icon">')
    expect(html).toContain(
      '<link rel="preconnect" href="https://cdn.example.com" crossorigin="anonymous">',
    )
  })

  it('renders external module scripts with src + type + defer', () => {
    const doc = defineDocument({
      head: {
        scripts: [
          { src: '/main.js', type: 'module' },
          { src: '/legacy.js', defer: true },
          { src: '/async.js', async: true },
        ],
      },
    })
    const html = renderDocument(doc, { mountId: 'app' })

    expect(html).toContain('<script type="module" src="/main.js"></script>')
    expect(html).toContain('<script src="/legacy.js" defer></script>')
    expect(html).toContain('<script src="/async.js" async></script>')
  })

  it('renders inline script content', () => {
    const doc = defineDocument({
      head: {
        scripts: [{ content: 'window.__lf = { mode: "dev" };', type: 'module' }],
      },
    })
    const html = renderDocument(doc, { mountId: 'app' })

    expect(html).toContain('<script type="module">window.__lf = { mode: "dev" };</script>')
  })

  it('renders head elements in order: charset, title, description, meta, links, scripts', () => {
    const doc = defineDocument({
      head: {
        title: 'T',
        description: 'D',
        meta: [{ property: 'og:title', content: 'O' }],
        links: [{ rel: 'stylesheet', href: '/s.css' }],
        scripts: [{ src: '/m.js' }],
      },
    })
    const html = renderDocument(doc, { mountId: 'app' })

    const charsetIdx = html.indexOf('<meta charset')
    const titleIdx = html.indexOf('<title>')
    const descIdx = html.indexOf('name="description"')
    const ogIdx = html.indexOf('og:title')
    const linkIdx = html.indexOf('<link ')
    const scriptIdx = html.indexOf('<script ')

    expect(charsetIdx).toBeGreaterThan(-1)
    expect(charsetIdx).toBeLessThan(titleIdx)
    expect(titleIdx).toBeLessThan(descIdx)
    expect(descIdx).toBeLessThan(ogIdx)
    expect(ogIdx).toBeLessThan(linkIdx)
    expect(linkIdx).toBeLessThan(scriptIdx)
  })
})

describe('renderDocument — body', () => {
  it('omits body class if not set', () => {
    const doc = defineDocument({})
    const html = renderDocument(doc, { mountId: 'app' })
    expect(html).toContain('<body>')
    expect(html).not.toContain('<body ')
  })

  it('renders body class when provided', () => {
    const doc = defineDocument({ body: { class: 'theme-dark no-scroll' } })
    const html = renderDocument(doc, { mountId: 'app' })
    expect(html).toContain('<body class="theme-dark no-scroll">')
  })
})

describe('renderDocument — HTML escaping (XSS prevention)', () => {
  it('escapes title content', () => {
    const doc = defineDocument({ head: { title: '<script>alert(1)</script>' } })
    const html = renderDocument(doc, { mountId: 'app' })

    expect(html).toContain('<title>&lt;script&gt;alert(1)&lt;/script&gt;</title>')
    expect(html).not.toContain('<title><script>')
  })

  it('escapes description meta content', () => {
    const doc = defineDocument({ head: { description: 'A & B "test" <tag>' } })
    const html = renderDocument(doc, { mountId: 'app' })

    expect(html).toContain(
      '<meta name="description" content="A &amp; B &quot;test&quot; &lt;tag&gt;">',
    )
  })

  it('escapes meta content for both name and property variants', () => {
    const doc = defineDocument({
      head: {
        meta: [
          { name: 'twitter:title', content: 'A "quoted" <value>' },
          { property: 'og:description', content: 'Bread & butter' },
        ],
      },
    })
    const html = renderDocument(doc, { mountId: 'app' })

    expect(html).toContain(
      '<meta name="twitter:title" content="A &quot;quoted&quot; &lt;value&gt;">',
    )
    expect(html).toContain('<meta property="og:description" content="Bread &amp; butter">')
  })

  it('escapes link href (blocks javascript: via quote-escape)', () => {
    const doc = defineDocument({
      head: { links: [{ rel: 'icon', href: '" onload="alert(1)"' }] },
    })
    const html = renderDocument(doc, { mountId: 'app' })

    expect(html).toContain('href="&quot; onload=&quot;alert(1)&quot;"')
    expect(html).not.toContain('" onload="alert(1)"')
  })

  it('escapes body class attribute', () => {
    const doc = defineDocument({ body: { class: '" onload="alert(1)' } })
    const html = renderDocument(doc, { mountId: 'app' })

    expect(html).toContain('<body class="&quot; onload=&quot;alert(1)">')
  })

  it('escapes mountId', () => {
    const doc = defineDocument({})
    const html = renderDocument(doc, { mountId: '"><script>bad' })

    expect(html).toContain('<div id="&quot;&gt;&lt;script&gt;bad"></div>')
  })

  it('escapes lang attribute', () => {
    const doc = defineDocument({ lang: '" onload="x' })
    const html = renderDocument(doc, { mountId: 'app' })

    expect(html).toContain('<html lang="&quot; onload=&quot;x">')
  })

  it('does NOT escape inline script content (script is CDATA context)', () => {
    // Note: this is intentional — <script> children are raw, not escaped.
    // The user is responsible for the script body. If they need to escape
    // dynamic values, they must do so themselves before passing as `content`.
    const doc = defineDocument({
      head: { scripts: [{ content: 'if (1 < 2) {}', type: 'module' }] },
    })
    const html = renderDocument(doc, { mountId: 'app' })

    expect(html).toContain('if (1 < 2) {}')
  })
})
