---
"@liteforge/toast": minor
---

feat(toast): add `styles` and `classes` config props to `ToastProvider` and per-toast options (#59)

- `ToastProvider` now accepts `styles` (inline CSS per part: container/toast/icon/close) and `classes` (extra class names per part and per type)
- Per-toast: `toast.success('msg', { class: 'my-toast', styles: { toast: 'min-width: 300px;' } })`
- Provider-level styles are applied first; per-toast overrides layer on top
- New exports: `ToastStyles`, `ToastClasses`, `ToastProviderOptions`
