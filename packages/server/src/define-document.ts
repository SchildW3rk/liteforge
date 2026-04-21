/**
 * defineDocument — minimal static HTML document configuration.
 *
 * Used by defineApp to render the shell HTML at .listen() / .build() / .dev() time.
 * No dynamic meta merging (reserved for Phase 4 SSR). No multi-document support.
 */

// ─── Head element shapes ──────────────────────────────────────────────────────

/**
 * Meta tag. A tag must declare either `name` (e.g. `description`, `viewport`,
 * `theme-color`) or `property` (e.g. `og:title`, `twitter:card`) — never both,
 * never neither. `content` is always required.
 */
export type DocumentMeta =
  | { name: string; property?: never; content: string }
  | { property: string; name?: never; content: string }

export interface DocumentLink {
  rel: string
  href: string
  type?: string
  crossorigin?: 'anonymous' | 'use-credentials'
}

export interface DocumentScript {
  src?: string
  type?: 'module' | 'text/javascript'
  async?: boolean
  defer?: boolean
  /** Inline script content. Either `src` or `content` must be set. */
  content?: string
}

export interface DocumentHead {
  /** `<title>` text — escaped before rendering. */
  title?: string
  /** Shorthand for `<meta name="description" content="...">`. */
  description?: string
  /** Additional `<meta>` tags (OG, Twitter, custom). */
  meta?: DocumentMeta[]
  links?: DocumentLink[]
  scripts?: DocumentScript[]
}

export interface DocumentBody {
  class?: string
}

export interface DocumentConfig {
  /** `<html lang="...">`. Defaults to `'en'`. */
  lang?: string
  head?: DocumentHead
  body?: DocumentBody
}

export interface DocumentDescriptor {
  readonly _tag: 'LiteForgeDocument'
  readonly config: DocumentConfig
}

/**
 * Build a `DocumentDescriptor` from a static configuration.
 *
 * The descriptor is consumed by `defineApp` at terminal time (Phase F) —
 * `.listen()`, `.dev()`, and `.build()` render the shell via `renderDocument`.
 */
export function defineDocument(config: DocumentConfig): DocumentDescriptor {
  return { _tag: 'LiteForgeDocument', config }
}

// ─── HTML escaping ────────────────────────────────────────────────────────────

/**
 * Escape text for inclusion in HTML text nodes or double-quoted attribute values.
 * Standard five-character set — sufficient for title/meta-content/attributes
 * since we render inside the document shell only.
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// ─── Render options ───────────────────────────────────────────────────────────

export interface RenderDocumentOptions {
  /**
   * ID of the mount-point `<div>` rendered inside `<body>`. Typically matches
   * the `target` selector passed to `defineApp({ target: '#app' })`, with the
   * leading `#` stripped.
   */
  mountId: string
  /**
   * Optional pre-rendered HTML inserted inside the mount-point `<div>`.
   * Used by SSR in future phases; omit for SPA shells.
   */
  contentSlot?: string
}

// ─── Renderers ────────────────────────────────────────────────────────────────

function renderMeta(meta: DocumentMeta): string {
  const content = escapeHtml(meta.content)
  if ('name' in meta && meta.name !== undefined) {
    return `<meta name="${escapeHtml(meta.name)}" content="${content}">`
  }
  return `<meta property="${escapeHtml((meta as { property: string }).property)}" content="${content}">`
}

function renderLink(link: DocumentLink): string {
  const parts: string[] = [
    `rel="${escapeHtml(link.rel)}"`,
    `href="${escapeHtml(link.href)}"`,
  ]
  if (link.type !== undefined) parts.push(`type="${escapeHtml(link.type)}"`)
  if (link.crossorigin !== undefined) parts.push(`crossorigin="${escapeHtml(link.crossorigin)}"`)
  return `<link ${parts.join(' ')}>`
}

function renderScript(script: DocumentScript): string {
  const attrs: string[] = []
  if (script.type !== undefined) attrs.push(`type="${escapeHtml(script.type)}"`)
  if (script.src !== undefined) attrs.push(`src="${escapeHtml(script.src)}"`)
  if (script.async === true) attrs.push('async')
  if (script.defer === true) attrs.push('defer')

  const openTag = attrs.length > 0 ? `<script ${attrs.join(' ')}>` : '<script>'
  const body = script.content !== undefined ? script.content : ''
  return `${openTag}${body}</script>`
}

function renderHead(head: DocumentHead | undefined): string {
  if (!head) return '<meta charset="UTF-8">'

  const parts: string[] = ['<meta charset="UTF-8">']

  if (head.title !== undefined) {
    parts.push(`<title>${escapeHtml(head.title)}</title>`)
  }
  if (head.description !== undefined) {
    parts.push(`<meta name="description" content="${escapeHtml(head.description)}">`)
  }
  if (head.meta) {
    for (const m of head.meta) parts.push(renderMeta(m))
  }
  if (head.links) {
    for (const l of head.links) parts.push(renderLink(l))
  }
  if (head.scripts) {
    for (const s of head.scripts) parts.push(renderScript(s))
  }

  return parts.join('\n    ')
}

function renderBodyAttrs(body: DocumentBody | undefined): string {
  if (!body?.class) return ''
  return ` class="${escapeHtml(body.class)}"`
}

/**
 * Render a `DocumentDescriptor` to a complete HTML string with doctype.
 *
 * The mount-point `<div>` is inserted as the last child of `<body>` and
 * receives the (optional) pre-rendered content slot. In SPA mode the slot
 * is empty and the client runtime mounts into it.
 */
export function renderDocument(
  doc: DocumentDescriptor,
  options: RenderDocumentOptions,
): string {
  const { config } = doc
  const lang = escapeHtml(config.lang ?? 'en')
  const head = renderHead(config.head)
  const bodyAttrs = renderBodyAttrs(config.body)
  const mountId = escapeHtml(options.mountId)
  const content = options.contentSlot ?? ''

  return `<!DOCTYPE html>
<html lang="${lang}">
  <head>
    ${head}
  </head>
  <body${bodyAttrs}>
    <div id="${mountId}">${content}</div>
  </body>
</html>`
}
