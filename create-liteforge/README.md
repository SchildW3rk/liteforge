# create-liteforge

Scaffold a new [LiteForge](https://github.com/SchildW3rk/liteforge) project in seconds.

## Usage

```bash
# npm
npm create liteforge@latest my-app

# npx
npx create-liteforge my-app

# pnpm
pnpm create liteforge my-app

# bun
bun create liteforge my-app
```

Then follow the printed steps:

```bash
cd my-app
npm install
npm run dev
```

## What you get

The generated project includes:

- **LiteForge** (`liteforge`) — signals-based reactivity, JSX, `createComponent`, `Show`, `For`, `Switch`
- **Router** (`@liteforge/router`) — client-side routing with `createRouter`, `RouterOutlet`, `Link`, nested routes
- **Modal** (`@liteforge/modal`) — `createModal`, `ModalProvider`, `confirm()` / `alert()` presets
- **Zod** — schema validation (used with `@liteforge/form`)
- **Vite** + **TypeScript** — fast dev server, full strict-mode TypeScript config
- **`@liteforge/vite-plugin`** — JSX transform to direct DOM ops, no virtual DOM

### Project structure

```
my-app/
  src/
    main.tsx        # App bootstrap with router + modal provider
    App.tsx         # Root layout component
    router.ts       # Route definitions
    styles.css      # Global styles
    pages/
      Home.tsx
      About.tsx
    stores/
      ui.ts         # Example signal store
  index.html
  vite.config.ts
  tsconfig.json
```

## Requirements

Node.js >= 18

## License

MIT — [SchildW3rk](https://github.com/SchildW3rk)
