import { createComponent } from 'liteforge';
import { RouterOutlet, Link } from '@liteforge/router';
import { uiStore } from './stores/ui';

export const App = createComponent({
  name: 'App',
  component() {
    return (
      <div class="app">
        <nav>
          <Link href="/" class="nav-link">Home</Link>
          <Link href="/about" class="nav-link">About</Link>
          <button
            class="theme-toggle"
            onclick={() => {
              const next = uiStore.effectiveTheme() === 'dark' ? 'light' : 'dark';
              uiStore.setTheme(next);
            }}
          >
            {() => uiStore.effectiveTheme() === 'dark' ? '☀️ Light' : '🌙 Dark'}
          </button>
        </nav>
        <main>
          {RouterOutlet()}
        </main>
      </div>
    );
  },
});
