// No imports — pure string constants

export const SETUP_CODE = `import { defineStore } from '@liteforge/store';

const userStore = defineStore('users', {
  state: {
    currentUser: null as User | null,
    list:        [] as User[],
    loading:     false,
  },
  getters: (state) => ({
    isLoggedIn: () => state.currentUser() !== null,
    userCount:  () => state.list().length,
  }),
  actions: (state) => ({
    async fetchUsers() {
      state.loading.set(true);
      state.list.set(await fetch('/api/users').then(r => r.json()));
      state.loading.set(false);
    },
    logout() {
      state.currentUser.set(null);
    },
  }),
});

// Usage
userStore.fetchUsers();
userStore.isLoggedIn()  // Signal<boolean> — auto-tracks
userStore.list()        // Signal<User[]>`;

export const LIVE_CODE = `const counter = defineStore('counter', {
  state: { count: 0 },
  getters: (state) => ({
    isNegative: () => state.count() < 0,
  }),
  actions: (state) => ({
    increment() { state.count.update(n => n + 1); },
    decrement() { state.count.update(n => n - 1); },
    reset()     { state.count.set(0); },
  }),
});

// Reactive read:
counter.count()       // Signal — auto-updates in JSX
counter.isNegative()  // computed getter

// Actions:
counter.increment();
counter.decrement();
counter.reset();`;

export const PLUGINS_CODE = `import { defineStorePlugin, storeRegistry } from '@liteforge/store';

// Logger plugin
const loggerPlugin = defineStorePlugin({
  onAction(storeName, actionName, args) {
    console.log(\`[\${storeName}] \${actionName}\`, args);
  },
});

// Apply to a store
const myStore = defineStore('example', {
  state: { count: 0 },
  actions: (state) => ({
    increment() { state.count.update(n => n + 1); },
  }),
  plugins: [loggerPlugin],
});

// Global registry — inspect all stores
const allStores = storeRegistry.getAll();
const store = storeRegistry.get('example');`;

export const TIME_TRAVEL_CODE = `import { devtoolsPlugin } from '@liteforge/devtools';

// Time-travel is built into devtools:
// 1. Integrate devtoolsPlugin() in createApp()
// 2. Open DevTools panel (default shortcut: Alt+D)
// 3. Switch to the Stores tab
// 4. Click any history entry to rewind state

// Manual snapshot/restore via store internals:
const snap = myStore.$snapshot();   // { count: 5 }
myStore.$restore(snap);             // rewind to that value`;
