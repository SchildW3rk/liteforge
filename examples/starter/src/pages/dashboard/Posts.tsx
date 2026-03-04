/**
 * Posts Page - Demonstrates @liteforge/query usage
 * 
 * Features:
 * - createQuery with JSONPlaceholder API
 * - createMutation for adding posts
 * - Loading and error states with <Show>
 * - List rendering with <For>
 * - Cache invalidation on mutation
 * - Clickable posts linking to detail page
 */

import { createComponent, Show, For } from 'liteforge';
import { signal } from 'liteforge';
import { Link } from 'liteforge/router';
import { createQuery, createMutation } from 'liteforge/query';

// =============================================================================
// Types
// =============================================================================

interface Post {
  id: number;
  userId: number;
  title: string;
  body: string;
}

interface NewPost {
  title: string;
  body: string;
  userId: number;
}

// =============================================================================
// API Functions
// =============================================================================

async function fetchPosts(): Promise<Post[]> {
  const response = await fetch('https://jsonplaceholder.typicode.com/posts?_limit=10');
  if (!response.ok) throw new Error('Failed to fetch posts');
  return response.json();
}

async function createPost(post: NewPost): Promise<Post> {
  const response = await fetch('https://jsonplaceholder.typicode.com/posts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(post),
  });
  if (!response.ok) throw new Error('Failed to create post');
  return response.json();
}

// =============================================================================
// Posts Page Component
// =============================================================================

export const PostsPage = createComponent({
  name: 'PostsPage',

  setup() {
    // Form state
    const title = signal('');
    const body = signal('');
    const showForm = signal(false);

    // Create query for posts with staleTime (object-style API)
    const postsQuery = createQuery({
      key: 'posts',
      fn: fetchPosts,
      staleTime: 30000, // 30 seconds
      retry: 2,
    });

    // Create mutation for adding posts (object-style API)
    const addPost = createMutation<Post, NewPost>({
      fn: createPost,
      invalidate: ['posts'],
      onSuccess: (data) => {
        console.log('Post created:', data);
        // Reset form
        title.set('');
        body.set('');
        showForm.set(false);
      },
      onError: (error) => {
        console.error('Failed to create post:', error);
      },
    });

    const handleSubmit = async (e: Event) => {
      e.preventDefault();
      if (title().trim() && body().trim()) {
        await addPost.mutate({
          title: title(),
          body: body(),
          userId: 1,
        });
      }
    };

    return { title, body, showForm, postsQuery, addPost, handleSubmit };
  },

  component({ setup }) {
    const { title, body, showForm, postsQuery, addPost, handleSubmit } = setup;

    return (
      <div class="posts-page">
        {/* Header */}
        <header class="page-header">
          <div class="header-content">
            <h1>Posts</h1>
            <p class="subtitle">Data fetched from JSONPlaceholder API with @liteforge/query</p>
          </div>
          <button 
            type="button"
            class="btn btn-primary" 
            onClick={() => showForm.set(!showForm())}
          >
            {() => showForm() ? 'Cancel' : 'Add Post'}
          </button>
        </header>

        {/* Add Post Form */}
        {Show({
          when: showForm,
          children: () => (
            <form class="post-form" onSubmit={handleSubmit}>
              <input
                type="text"
                class="form-input"
                placeholder="Post title"
                value={() => title()}
                onInput={(e: Event) => title.set((e.target as HTMLInputElement).value)}
              />
              <textarea
                class="form-textarea"
                placeholder="Post body"
                value={() => body()}
                onInput={(e: Event) => body.set((e.target as HTMLTextAreaElement).value)}
              />
              <button 
                type="submit" 
                class="btn btn-success"
                disabled={() => addPost.isLoading()}
              >
                {() => addPost.isLoading() ? 'Creating...' : 'Create Post'}
              </button>
            </form>
          ),
        })}

        {/* Query Status */}
        <div class="query-status">
          {() => {
            const parts: string[] = [];
            if (postsQuery.isLoading()) parts.push('Loading...');
            if (postsQuery.isStale()) parts.push('(Stale)');
            if (postsQuery.isFetched()) parts.push('Cached');
            return parts.join(' ') || 'Ready';
          }}
          <button 
            type="button"
            class="btn btn-secondary btn-small" 
            onClick={() => postsQuery.refetch()}
          >
            Refetch
          </button>
        </div>

        {/* Content Area */}
        <div class="posts-content">
          {/* Loading State */}
          {Show({
            when: () => postsQuery.isLoading() && !postsQuery.data(),
            children: () => (
              <div class="loading-state">
                <div class="loading-spinner" />
                <p>Loading posts...</p>
              </div>
            ),
          })}

          {/* Error State */}
          {Show({
            when: () => !!postsQuery.error(),
            children: () => (
              <div class="error-state">
                <p>Error: {() => postsQuery.error()?.message}</p>
                <button 
                  type="button"
                  class="btn btn-secondary" 
                  onClick={() => postsQuery.refetch()}
                >
                  Retry
                </button>
              </div>
            ),
          })}

          {/* Posts List */}
          {Show({
            when: () => !!postsQuery.data() && postsQuery.data()!.length > 0,
            children: () => (
              <div class="posts-list">
                {For({
                  each: () => postsQuery.data() ?? [],
                  children: (post: Post) => (
                    <article class="post-card">
                      {Link({
                        href: `/dashboard/posts/${post.id}`,
                        class: 'post-link',
                        children: (
                          <div class="post-content">
                            <h3 class="post-title">{post.title}</h3>
                            <p class="post-body">{post.body}</p>
                            <span class="post-meta">Post #{post.id} by User #{post.userId}</span>
                          </div>
                        ),
                      })}
                    </article>
                  ),
                })}
              </div>
            ),
          })}

          {/* Empty State */}
          {Show({
            when: () => postsQuery.data() && postsQuery.data()!.length === 0,
            children: () => (
              <div class="empty-state">
                <p>No posts found.</p>
              </div>
            ),
          })}
        </div>

        {/* Styles */}
        <style>{`
          .posts-page { padding: 20px; max-width: 900px; }
          .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; flex-wrap: wrap; gap: 15px; }
          .header-content h1 { margin: 0 0 5px; }
          .subtitle { color: #666; margin: 0; font-size: 14px; }
          .query-status { display: flex; align-items: center; gap: 10px; font-size: 12px; color: #888; margin-bottom: 15px; }
          .post-form { background: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
          .form-input, .form-textarea { width: 100%; padding: 10px; margin-bottom: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; box-sizing: border-box; }
          .form-textarea { min-height: 100px; resize: vertical; font-family: inherit; }
          .posts-list { display: grid; gap: 15px; }
          .post-card { background: white; border: 1px solid #e0e0e0; border-radius: 8px; transition: border-color 0.2s, box-shadow 0.2s; }
          .post-card:hover { border-color: #1976d2; box-shadow: 0 2px 8px rgba(25, 118, 210, 0.15); }
          .post-link { display: block; text-decoration: none; color: inherit; }
          .post-content { padding: 15px; }
          .post-title { margin: 0 0 10px; font-size: 16px; color: #333; }
          .post-body { color: #666; font-size: 14px; line-height: 1.5; margin: 0 0 10px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
          .post-meta { font-size: 12px; color: #999; }
          .loading-state, .error-state, .empty-state { padding: 40px; text-align: center; color: #666; }
          .error-state { color: #d32f2f; }
          .loading-spinner { width: 40px; height: 40px; border: 3px solid #e0e0e0; border-top-color: #1976d2; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 15px; }
          @keyframes spin { to { transform: rotate(360deg); } }
          .btn { padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; transition: opacity 0.2s; }
          .btn:disabled { opacity: 0.6; cursor: not-allowed; }
          .btn-primary { background: #1976d2; color: white; }
          .btn-secondary { background: #e0e0e0; color: #333; }
          .btn-success { background: #388e3c; color: white; }
          .btn-small { padding: 4px 8px; font-size: 12px; }
        `}</style>
      </div>
    );
  },

  destroyed({ setup }) {
    // Clean up query when component unmounts
    setup.postsQuery.dispose();
  },
});
