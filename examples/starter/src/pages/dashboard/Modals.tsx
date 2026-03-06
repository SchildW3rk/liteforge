/**
 * Modals Page - Demonstrates @liteforge/modal usage
 *
 * Features:
 * - createModal with reactive isOpen signal
 * - confirm(), alert(), prompt() presets
 * - Size variants (sm, lg, full)
 * - Dark mode via CSS variables
 */

import { createComponent } from 'liteforge';
import { signal } from 'liteforge';
import { createModal, confirm, alert, prompt } from 'liteforge/modal';
import { useTitle } from 'liteforge/router'

// =============================================================================
// Modals Page Component
// =============================================================================

export const ModalsPage = createComponent({
  name: 'ModalsPage',

  setup() {
    const lastResult = signal<string>('—');
    useTitle('Modals Demo');
    // ── Basic modal ──────────────────────────────────────────────────────────
    const basicModal = createModal({
      config: { title: 'Basic Modal', size: 'md', closable: true },
      component: () => (
        <div>
          <p>This is a <strong>basic modal</strong> built with <code>createModal()</code>.</p>
          <p>Closes on ESC, ✕ button, or backdrop click. Content is rendered lazily — only on first <code>open()</code>.</p>
        </div>
      ),
    });

    // ── Large modal ──────────────────────────────────────────────────────────
    const lgModal = createModal({
      config: { title: 'Large Modal', size: 'lg' },
      component: () => (
        <div>
          <p>A <strong>large</strong> modal (max-width: 720px).</p>
          <p>Size options: <code>sm</code> 400px · <code>md</code> 560px · <code>lg</code> 720px · <code>xl</code> 1000px · <code>full</code> 100vw</p>
          <ul>
            <li>Keyboard accessible — Tab stays trapped inside</li>
            <li>Focus returns to trigger button on close</li>
            <li>Respects <code>[data-theme="dark"]</code></li>
          </ul>
        </div>
      ),
    });

    // ── Full-screen modal ────────────────────────────────────────────────────
    const fullModal = createModal({
      config: { title: 'Full-Screen Modal', size: 'full', closable: true },
      component: () => (
        <div class="modal-full-content">
          <p>A <strong>full-screen</strong> modal. Useful for image galleries, step wizards, or detail views.</p>
          <p>Closes on ESC or the ✕ button.</p>
        </div>
      ),
    });

    return { lastResult, basicModal, lgModal, fullModal };
  },

  component({ setup }) {
    const { lastResult, basicModal, lgModal, fullModal } = setup;
    

    const handleConfirm = async () => {
      const result = await confirm('Are you sure you want to continue?', { title: 'Confirm Action' });
      lastResult.set(`confirm() → ${result}`);
    };

    const handleAlert = async () => {
      await alert('This is an alert message. Click OK to dismiss.', { title: 'Notice' });
      lastResult.set('alert() → dismissed');
    };

    const handlePrompt = async () => {
      const value = await prompt('Enter your name:', 'World', { title: 'Input Required' });
      lastResult.set(value !== null ? `prompt() → "${value}"` : 'prompt() → cancelled');
    };

    return (
      <div class="modals-page">
        <h1>Modals</h1>
        <p class="page-description">
          Signal-based modal system from <code>@liteforge/modal</code>. Zero dependencies, focus trap, animations, dark mode.
        </p>

        {/* ── createModal ─────────────────────────────────────── */}
        <section class="demo-section">
          <h2>createModal()</h2>
          <p class="demo-description">Imperative API — open/close/toggle programmatically. Reactive <code>isOpen</code> signal.</p>

          <div class="demo-row">
            <button type="button" class="demo-btn demo-btn--primary" onclick={() => basicModal.open()}>
              Open Basic Modal (md)
            </button>
            <button type="button" class="demo-btn" onclick={() => lgModal.open()}>
              Open Large Modal (lg)
            </button>
            <button type="button" class="demo-btn" onclick={() => fullModal.open()}>
              Open Full-Screen Modal
            </button>
          </div>

          <div class="demo-status">
            <code>basicModal.isOpen: {() => String(basicModal.isOpen())}</code>
            {' | '}
            <code>lgModal.isOpen: {() => String(lgModal.isOpen())}</code>
          </div>
        </section>

        {/* ── Presets ─────────────────────────────────────────── */}
        <section class="demo-section">
          <h2>Presets</h2>
          <p class="demo-description">
            <code>confirm()</code>, <code>alert()</code>, and <code>prompt()</code> return Promises and auto-destroy.
          </p>

          <div class="demo-row">
            <button type="button" class="demo-btn demo-btn--primary" onclick={handleConfirm}>
              confirm()
            </button>
            <button type="button" class="demo-btn" onclick={handleAlert}>
              alert()
            </button>
            <button type="button" class="demo-btn" onclick={handlePrompt}>
              prompt()
            </button>
          </div>

          <div class="demo-status">
            Last result: <code>{() => lastResult()}</code>
          </div>
        </section>

        <style>{`
          .modals-page {
            padding: 20px;
          }

          .modals-page h1 {
            margin: 0 0 8px;
            font-size: 24px;
            color: var(--lf-color-text, #1e293b);
          }

          .page-description {
            color: var(--lf-color-text-muted, #64748b);
            margin: 0 0 32px;
            font-size: 14px;
          }

          .demo-section {
            margin-bottom: 40px;
            padding: 24px;
            border: 1px solid var(--lf-color-border, #e2e8f0);
            border-radius: var(--lf-radius-lg, 8px);
            background: var(--lf-color-surface, #ffffff);
          }

          .demo-section h2 {
            margin: 0 0 6px;
            font-size: 18px;
            color: var(--lf-color-text, #1e293b);
          }

          .demo-description {
            color: var(--lf-color-text-muted, #64748b);
            margin: 0 0 20px;
            font-size: 14px;
          }

          .demo-row {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin-bottom: 16px;
          }

          .demo-btn {
            padding: 8px 16px;
            border: 1px solid var(--lf-color-border-strong, #d1d5db);
            border-radius: var(--lf-radius-md, 6px);
            background: var(--lf-color-bg-subtle, #f8fafc);
            color: var(--lf-color-text, #374151);
            cursor: pointer;
            font-size: 14px;
            transition: background-color 0.15s;
          }

          .demo-btn:hover {
            background: var(--lf-color-bg-muted, #f1f5f9);
          }

          .demo-btn--primary {
            background: var(--lf-color-accent, #3b82f6);
            border-color: var(--lf-color-accent, #3b82f6);
            color: #fff;
          }

          .demo-btn--primary:hover {
            opacity: 0.9;
          }

          .demo-status {
            font-size: 13px;
            color: var(--lf-color-text-muted, #64748b);
            padding: 8px 12px;
            background: var(--lf-color-bg-subtle, #f8fafc);
            border-radius: var(--lf-radius-sm, 4px);
            border: 1px solid var(--lf-color-border, #e2e8f0);
          }

          .modal-full-content {
            min-height: 200px;
          }
        `}</style>
      </div>
    );
  },
});
