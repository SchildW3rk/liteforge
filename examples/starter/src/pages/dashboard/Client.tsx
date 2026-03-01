/**
 * Client Demo Page
 *
 * Section 1 — Without Query: bare client.get(), manual loading/error signals.
 * Section 2 — With Query:    createClient({ query }) + resource.useList/useOne/useCreate.
 *             Loading, error, caching — all managed by @liteforge/query automatically.
 */

import { createComponent } from '@liteforge/runtime';
import { createClient, ApiError } from '@liteforge/client';
import type { RequestConfig, ResponseContext } from '@liteforge/client';
import { signal } from '@liteforge/core';
import { createQuery, createMutation } from '@liteforge/query';

// ============================================================================
// Types (JSONPlaceholder)
// ============================================================================

interface Post {
  id: number;
  userId: number;
  title: string;
  body: string;
}

interface Todo {
  id: number;
  title: string;
  completed: boolean;
}

// ============================================================================
// Component
// ============================================================================

export const ClientPage = createComponent({
  name: 'ClientPage',
  component() {

    // -----------------------------------------------------------------------
    // Section 1 — client WITHOUT query integration
    //   Manually managing loading / error / data signals.
    // -----------------------------------------------------------------------
    const bareClient = createClient({
      baseUrl: 'https://jsonplaceholder.typicode.com',
    });

    bareClient.addInterceptor({
      onRequest: (cfg: RequestConfig) => {
        console.log('[Client] →', cfg.method, cfg.url);
        return cfg;
      },
      onResponse: (ctx: ResponseContext<unknown>) => {
        console.log('[Client] ←', ctx.status, ctx.config.url);
        return ctx;
      },
    });

    // Manual state — one set per endpoint
    const todoData   = signal<Todo | null>(null);
    const todoLoading = signal(false);
    const todoError  = signal('');

    async function fetchTodo() {
      todoError.set('');
      todoLoading.set(true);
      try {
        todoData.set(await bareClient.get<Todo>('/todos/1'));
      } catch (err: unknown) {
        todoError.set(err instanceof ApiError ? `${err.status} ${err.statusText}` : 'Network error');
      } finally {
        todoLoading.set(false);
      }
    }

    // -----------------------------------------------------------------------
    // Section 2 — client WITH @liteforge/query integration
    //   Pass { query: { createQuery, createMutation } } to createClient.
    //   Resources get .useList() / .useOne() / .useCreate() etc. automatically.
    // -----------------------------------------------------------------------
    const client = createClient({
      baseUrl: 'https://jsonplaceholder.typicode.com',
      query: { createQuery, createMutation },
    });

    const posts = client.resource<Post, Omit<Post, 'id'>>('posts');

    // No loading/error/data signals needed — useOne manages all of it:
    const postQuery = posts.useOne(1);
    const createMut = posts.useCreate();

    // Reactive paginated list — createQuery with reactive key re-fetches automatically on page change
    const page = signal(1);
    const listQuery = createQuery<Post[]>({
      key: () => ['posts', 'list', page()],
      fn: () => client.get<Post[]>('/posts', { params: { _limit: 3, _page: page() } }),
    });

    // -----------------------------------------------------------------------
    // Render
    // -----------------------------------------------------------------------
    return (
      <div class="client-page">
        <style>{`
          .client-page { padding: 2rem; max-width: 860px; }
          h1 { font-size: 1.75rem; font-weight: 700; margin-bottom: 0.25rem; }
          .subtitle { color: var(--color-text-secondary, #6b7280); margin-bottom: 2rem; font-size: 0.9rem; }
          .section-label { font-size: 0.7rem; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--color-text-secondary, #6b7280); margin-bottom: 0.5rem; }
          .card { background: var(--color-surface, #fff); border: 1px solid var(--color-border, #e5e7eb); border-radius: 0.75rem; padding: 1.5rem; margin-bottom: 1.25rem; }
          .card h2 { font-size: 1rem; font-weight: 600; margin-bottom: 0.5rem; }
          .card p { font-size: 0.85rem; color: var(--color-text-secondary, #6b7280); margin-bottom: 0.75rem; }
          .card code { background: var(--color-surface-alt, #f3f4f6); padding: 0.1em 0.4em; border-radius: 0.25rem; font-size: 0.8rem; }
          .btn { background: var(--color-primary, #3b82f6); color: #fff; border: none; border-radius: 0.5rem; padding: 0.45rem 1rem; cursor: pointer; font-size: 0.85rem; margin-right: 0.5rem; }
          .btn-sm { padding: 0.3rem 0.6rem; font-size: 0.8rem; }
          .btn:hover { opacity: 0.9; }
          .btn-ghost { background: transparent; color: var(--color-primary, #3b82f6); border: 1px solid var(--color-primary, #3b82f6); }
          .result { margin-top: 0.75rem; background: var(--color-surface-alt, #f9fafb); border: 1px solid var(--color-border, #e5e7eb); border-radius: 0.5rem; padding: 0.75rem 1rem; font-size: 0.8rem; font-family: monospace; white-space: pre-wrap; max-height: 180px; overflow: auto; }
          .status-row { display: flex; gap: 0.75rem; align-items: center; margin-top: 0.5rem; font-size: 0.8rem; }
          .pill { display: inline-flex; align-items: center; gap: 0.3rem; padding: 0.2rem 0.6rem; border-radius: 9999px; font-weight: 600; font-size: 0.75rem; }
          .pill-loading { background: #fef9c3; color: #854d0e; }
          .pill-error { background: #fee2e2; color: #991b1b; }
          .pill-ok { background: #dcfce7; color: #166534; }
          .pill-idle { background: var(--color-surface-alt, #f3f4f6); color: var(--color-text-secondary, #6b7280); }
          .compare-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
          .compare-grid .card { margin-bottom: 0; }
          .compare-label { font-size: 0.7rem; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; padding: 0.2rem 0.5rem; border-radius: 0.25rem; display: inline-block; margin-bottom: 0.5rem; }
          .label-manual { background: #fee2e2; color: #991b1b; }
          .label-query  { background: #dcfce7; color: #166534; }
          .page-nav { display: flex; align-items: center; gap: 0.5rem; margin-top: 0.5rem; font-size: 0.85rem; }
          @media (max-width: 640px) { .compare-grid { grid-template-columns: 1fr; } }
        `}</style>

        <h1>@liteforge/client</h1>
        <p class="subtitle">
          Zero-dependency HTTP client — standalone or wired to <code>@liteforge/query</code> for automatic caching, loading &amp; error states.
        </p>

        {/* ================================================================
            SECTION 1 — Without Query
        ================================================================ */}
        <p class="section-label">Without Query integration — manual state</p>

        <div class="card">
          <h2><code>client.get&lt;T&gt;(path)</code></h2>
          <p>
            Bare fetch — you own the loading/error/data signals.
            Every endpoint needs its own <code>try/catch/finally</code> block.
          </p>
          <button type="button" class="btn" onclick={fetchTodo}>Fetch Todo #1</button>

          <div class="status-row">
            {() => todoLoading() ? <span class="pill pill-loading">Loading…</span> : null}
            {() => todoError() !== '' ? <span class="pill pill-error">{() => todoError()}</span> : null}
            {() => !todoLoading() && todoError() === '' && todoData() !== null
              ? <span class="pill pill-ok">OK</span>
              : null}
          </div>

          {() => todoData() !== null
            ? <div class="result">{() => JSON.stringify(todoData(), null, 2)}</div>
            : null}
        </div>

        {/* ================================================================
            SECTION 2 — With Query integration
        ================================================================ */}
        <p class="section-label" style="margin-top: 1.5rem;">With Query integration — automatic caching &amp; reactive state</p>
        <p style="font-size:0.85rem;color:var(--color-text-secondary,#6b7280);margin-bottom:1rem;">
          Pass <code>{'{ query: { createQuery, createMutation } }'}</code> to <code>createClient()</code>.
          Resources get <code>.useOne()</code>, <code>.useList()</code>, <code>.useCreate()</code> etc. —
          no manual loading or error state needed.
        </p>

        {/* useOne */}
        <div class="card">
          <h2><code>posts.useOne(1)</code></h2>
          <p>Fetches <code>/posts/1</code> automatically on mount. Cached — navigating away and back won't re-fetch until stale.</p>

          <div class="status-row">
            {() => postQuery.isLoading() ? <span class="pill pill-loading">Loading…</span> : null}
            {() => postQuery.error() !== undefined ? <span class="pill pill-error">{() => postQuery.error()?.message}</span> : null}
            {() => postQuery.isFetched() && !postQuery.isLoading()
              ? <span class="pill pill-ok">Fetched</span>
              : null}
            <button type="button" class="btn btn-ghost btn-sm" onclick={() => postQuery.refetch()}>Refetch</button>
          </div>

          {() => postQuery.data() !== undefined
            ? <div class="result">{() => JSON.stringify(postQuery.data(), null, 2)}</div>
            : null}
        </div>

        {/* Reactive paginated list */}
        <div class="card">
          <h2><code>createQuery</code> with reactive key</h2>
          <p>Changing <code>page</code> updates the key → automatic re-fetch &amp; cache per page.</p>

          <div class="page-nav">
            <button
              type="button"
              class="btn btn-ghost btn-sm"
              onclick={() => page.update(p => Math.max(1, p - 1))}
            >←</button>
            <span>{() => `Page ${page()}`}</span>
            <button
              type="button"
              class="btn btn-sm"
              onclick={() => page.update(p => p + 1)}
            >→</button>
          </div>

          <div class="status-row">
            {() => listQuery.isLoading() ? <span class="pill pill-loading">Loading…</span> : null}
            {() => listQuery.error() !== undefined ? <span class="pill pill-error">{() => listQuery.error()?.message}</span> : null}
            {() => listQuery.isFetched() && !listQuery.isLoading()
              ? <span class="pill pill-ok">{() => `${listQuery.data()?.length ?? 0} posts`}</span>
              : null}
          </div>

          {() => (listQuery.data()?.length ?? 0) > 0
            ? <div class="result">
                {() => listQuery.data()!.map(p =>
                  <div style="padding: 0.25rem 0; border-bottom: 1px solid var(--color-border,#e5e7eb);">
                    <span style="font-size:0.75rem;color:var(--color-text-secondary,#6b7280);">#{p.id} </span>
                    {p.title}
                  </div>
                )}
              </div>
            : null}
        </div>

        {/* useCreate */}
        <div class="card">
          <h2><code>posts.useCreate()</code></h2>
          <p>
            Mutation — calls <code>POST /posts</code>, automatically invalidates the <code>posts</code> list cache on success.
            No try/catch, no loading signal.
          </p>
          <button
            type="button"
            class="btn"
            onclick={() => createMut.mutate({
              userId: 1,
              title: 'Hello from LiteForge Client',
              body: 'Created via posts.useCreate() — no manual loading state needed.',
            })}
          >
            {() => createMut.isLoading() ? 'Creating…' : 'Create Post'}
          </button>

          <div class="status-row">
            {() => createMut.isLoading() ? <span class="pill pill-loading">Saving…</span> : null}
            {() => createMut.error() !== undefined ? <span class="pill pill-error">{() => createMut.error()?.message}</span> : null}
            {() => createMut.data() !== undefined && !createMut.isLoading()
              ? <span class="pill pill-ok">Created — id: {() => String(createMut.data()?.id)}</span>
              : null}
          </div>

          {() => createMut.data() !== undefined
            ? <div class="result">{() => JSON.stringify(createMut.data(), null, 2)}</div>
            : null}
        </div>

      </div>
    );
  },
});
