/**
 * Post Detail Page - Demonstrates reactive query keys with @liteforge/query
 * 
 * Features:
 * - Reactive query key based on route params: `() => ['post', postId]`
 * - Automatic refetch when route params change
 * - Comments query demonstrating dependent queries
 * - Navigation back to posts list
 */

import { createComponent, Show, For } from 'liteforge';
import { Link, useParam } from 'liteforge/router';

// =============================================================================
// Types
// =============================================================================

interface Post {
  id: number;
  userId: number;
  title: string;
  body: string;
}

interface Comment {
  id: number;
  postId: number;
  name: string;
  email: string;
  body: string;
}

// =============================================================================
// API Functions
// =============================================================================

async function fetchPost(id: string): Promise<Post> {
  const response = await fetch(`https://jsonplaceholder.typicode.com/posts/${id}`);
  if (!response.ok) throw new Error('Failed to fetch post');
  return response.json();
}

async function fetchComments(postId: string): Promise<Comment[]> {
  const response = await fetch(`https://jsonplaceholder.typicode.com/posts/${postId}/comments`);
  if (!response.ok) throw new Error('Failed to fetch comments');
  return response.json();
}

// =============================================================================
// Post Detail Page Component
// =============================================================================

export const PostDetailPage = createComponent({
  name: 'PostDetailPage',

  setup({ use }) {
    const { createQuery } = use('query');
    const postId = useParam('id');

    const postQuery = createQuery({
      key: () => ['post', postId()],
      fn: () => fetchPost(postId()!),
      staleTime: 60000,
      retry: 2,
    });

    const commentsQuery = createQuery({
      key: () => ['comments', postId()],
      fn: () => fetchComments(postId()!),
      staleTime: 30000,
      retry: 1,
    });

    return { postId, postQuery, commentsQuery };
  },

  component({ setup }) {
    const { postId, postQuery, commentsQuery } = setup;

    return (
      <div class="post-detail-page">
        {/* Back Button */}
        {Link({
          href: '/dashboard/posts',
          class: 'btn btn-secondary back-btn',
          children: '\u2190 Back to Posts',
        })}

        {/* Post ID Indicator (reactive) */}
        <div class="post-id-indicator">
          {() => `Viewing Post #${postId()}`}
        </div>

        {/* Main Content */}
        <div class="post-detail-content">
          {/* Loading State */}
          {Show({
            when: postQuery.isLoading() && !postQuery.data(),
            children: () => (
              <div class="loading-state">
                <div class="loading-spinner" />
                <p>Loading post...</p>
              </div>
            ),
          })}

          {/* Error State */}
          {Show({
            when: () => !!postQuery.error(),
            children: () => (
              <div class="error-state">
                <p>Error: {() => postQuery.error()?.message ?? 'Unknown error'}</p>
                <button 
                  type="button"
                  class="btn btn-secondary" 
                  onClick={() => postQuery.refetch()}
                >
                  Retry
                </button>
              </div>
            ),
          })}

          {/* Post Content */}
          {Show({
            when: !!postQuery.data(),
            children: () => (
              <article class="post-article">
                <h1 class="post-title">{() => postQuery.data()?.title ?? ''}</h1>
                <div class="post-meta">
                  {() => {
                    const post = postQuery.data();
                    return post ? `Post #${post.id} by User #${post.userId}` : '';
                  }}
                </div>
                <div class="post-body">{() => postQuery.data()?.body ?? ''}</div>
                <div class="query-status">
                  {() => {
                    const parts: string[] = [];
                    if (postQuery.isStale()) parts.push('Stale');
                    if (postQuery.isFetched()) parts.push('Cached');
                    return parts.length > 0 ? `(${parts.join(', ')})` : '';
                  }}
                </div>
              </article>
            ),
          })}
        </div>

        {/* Comments Section */}
        <section class="comments-section">
          <h2>Comments</h2>

          {/* Comments Loading */}
          {Show({
            when: commentsQuery.isLoading() && !commentsQuery.data(),
            children: () => (
              <div class="loading-state small">
                <p>Loading comments...</p>
              </div>
            ),
          })}

          {/* Comments List */}
          {Show({
            when: !!commentsQuery.data() && commentsQuery.data()!.length > 0,
            children: () => (
              <div class="comments-list">
                {For({
                  each: commentsQuery.data() ?? [],
                  children: (comment) => (
                    <div class="comment-card">
                      <div class="comment-header">
                        <strong class="comment-name">{comment.name}</strong>
                        <span class="comment-email">{comment.email}</span>
                      </div>
                      <p class="comment-body">{comment.body}</p>
                    </div>
                  ),
                })}
              </div>
            ),
          })}

          {/* No Comments State */}
          {Show({
            when: commentsQuery.data() && commentsQuery.data()!.length === 0,
            children: () => (
              <div class="empty-state">
                <p>No comments yet.</p>
              </div>
            ),
          })}
        </section>

        {/* Styles */}
        <style>{`
          .post-detail-page { padding: 20px; max-width: 800px; }
          .back-btn { display: inline-block; margin-bottom: 20px; text-decoration: none; }
          .post-id-indicator { font-size: 12px; color: #888; margin-bottom: 10px; }
          .post-article { background: white; border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; margin-bottom: 30px; }
          .post-title { margin: 0 0 10px; font-size: 24px; color: #333; }
          .post-meta { font-size: 12px; color: #666; margin-bottom: 15px; }
          .post-body { color: #444; font-size: 16px; line-height: 1.6; white-space: pre-wrap; }
          .query-status { font-size: 11px; color: #999; margin-top: 15px; }
          .comments-section { margin-top: 30px; }
          .comments-section h2 { font-size: 18px; margin-bottom: 15px; color: #333; }
          .comments-list { display: grid; gap: 12px; }
          .comment-card { background: #f9f9f9; border: 1px solid #eee; border-radius: 6px; padding: 12px; }
          .comment-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; flex-wrap: wrap; gap: 5px; }
          .comment-name { color: #333; font-size: 14px; }
          .comment-email { color: #888; font-size: 12px; }
          .comment-body { color: #555; font-size: 13px; line-height: 1.5; margin: 0; }
          .loading-state, .error-state, .empty-state { padding: 30px; text-align: center; color: #666; }
          .loading-state.small { padding: 15px; }
          .error-state { color: #d32f2f; }
          .loading-spinner { width: 40px; height: 40px; border: 3px solid #e0e0e0; border-top-color: #1976d2; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 15px; }
          @keyframes spin { to { transform: rotate(360deg); } }
          .btn { padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; }
          .btn-secondary { background: #e0e0e0; color: #333; }
          .btn-secondary:hover { background: #d0d0d0; }
        `}</style>
      </div>
    );
  },

});
