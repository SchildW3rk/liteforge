import { createComponent, signal, effect } from 'liteforge';
import { createQuery } from '@liteforge/query';

export const QueryExample = createComponent({
  name: 'QueryExample',
  component() {
    const postId = signal(1);

    const post = createQuery({
      key: () => ['post', postId()],
      fn: () => fetch(`https://jsonplaceholder.typicode.com/posts/${postId()}`)
        .then(r => r.json()) as Promise<{ id: number; title: string; body: string }>,
      staleTime: 30_000,
    });

    const wrap = document.createElement('div');
    wrap.className = 'space-y-3';

    const nav = document.createElement('div');
    nav.className = 'flex items-center gap-2';

    const prev = document.createElement('button');
    prev.className = 'px-3 py-1 text-sm rounded border border-[var(--line-default)] hover:border-[var(--content-muted)] text-[var(--content-secondary)] transition-colors';
    prev.textContent = '← Prev';
    prev.addEventListener('click', () => postId.update(id => Math.max(1, id - 1)));

    const next = document.createElement('button');
    next.className = 'px-3 py-1 text-sm rounded border border-[var(--line-default)] hover:border-[var(--content-muted)] text-[var(--content-secondary)] transition-colors';
    next.textContent = 'Next →';
    next.addEventListener('click', () => postId.update(id => id + 1));

    const label = document.createElement('span');
    label.className = 'text-xs text-[var(--content-muted)] font-mono';
    effect(() => { label.textContent = `post #${postId()}`; });

    const status = document.createElement('div');
    status.className = 'text-xs font-medium px-2 py-0.5 rounded-full inline-block';

    const content = document.createElement('div');
    content.className = 'p-3 rounded border border-[var(--line-default)] bg-[var(--surface-raised)]/50 text-sm text-[var(--content-secondary)] min-h-16';

    effect(() => {
      if (post.isLoading()) {
        status.className = 'text-xs font-medium px-2 py-0.5 rounded-full inline-block bg-yellow-950 text-yellow-300';
        status.textContent = 'Loading…';
        content.textContent = '…';
      } else if (post.error() !== undefined) {
        status.className = 'text-xs font-medium px-2 py-0.5 rounded-full inline-block bg-red-950 text-red-300';
        status.textContent = 'Error';
        content.textContent = post.error()?.message ?? 'Unknown error';
      } else {
        status.className = 'text-xs font-medium px-2 py-0.5 rounded-full inline-block bg-emerald-950 text-emerald-300';
        status.textContent = 'Cached';
        const p = post.data();
        if (p !== undefined) {
          content.textContent = `"${(p as { title: string }).title}"`;
        }
      }
    });

    nav.appendChild(prev);
    nav.appendChild(next);
    nav.appendChild(label);
    wrap.appendChild(nav);
    wrap.appendChild(status);
    wrap.appendChild(content);
    return wrap;
  },
});
