import { beforeEach } from 'vitest'

// Catch happy-dom script loading errors that don't affect tests.
// Happy-DOM tries to execute Vite's <script> tags which fails in Node environment.

const createMemoryStorage = (): Storage => {
  const store = new Map<string, string>()

  return {
    get length() {
      return store.size
    },
    clear() {
      store.clear()
    },
    getItem(key: string) {
      return store.get(String(key)) ?? null
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null
    },
    removeItem(key: string) {
      store.delete(String(key))
    },
    setItem(key: string, value: string) {
      store.set(String(key), String(value))
    },
  }
}

const getUsableStorage = (key: 'localStorage' | 'sessionStorage'): Storage => {
  try {
    const storage = typeof window !== 'undefined' ? window[key] : undefined
    if (storage && typeof storage.clear === 'function') return storage
  } catch {
    // Fall through to the in-memory test storage.
  }

  return createMemoryStorage()
}

const installBrowserStorageGlobals = (): void => {
  if (typeof document === 'undefined') return

  const install = (key: 'localStorage' | 'sessionStorage') => {
    const current = globalThis[key]
    if (current && typeof current.clear === 'function') return

    const storage = getUsableStorage(key)
    if (globalThis[key] === storage && typeof globalThis[key]?.clear === 'function') return

    // Node 25 exposes a non-browser localStorage global in some environments.
    // Browser tests should use happy-dom's Storage implementation instead.
    Object.defineProperty(globalThis, key, {
      value: storage,
      configurable: true,
      writable: true,
    })

    if (typeof window !== 'undefined') {
      Object.defineProperty(window, key, {
        value: storage,
        configurable: true,
        writable: true,
      })
    }
  }

  install('localStorage')
  install('sessionStorage')
}

installBrowserStorageGlobals()

beforeEach(() => {
  installBrowserStorageGlobals()
})

const isHappyDomScriptError = (err: unknown): boolean => {
  if (!(err instanceof Error)) return false
  return (
    err.message.includes('Cannot use import statement outside a module') ||
    err.message.includes('JavaScript file loading is disabled')
  )
}

process.on('unhandledRejection', (reason) => {
  if (isHappyDomScriptError(reason)) return
  // Let vitest handle other rejections
})

process.on('uncaughtException', (err) => {
  if (isHappyDomScriptError(err)) return
  // For real errors, log and let the test fail naturally
  console.error('Uncaught exception:', err)
})
