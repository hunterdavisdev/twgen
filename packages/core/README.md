# @twgen/core

The core of [**twgen**](https://github.com/hunterdavisdev/twgen) — type-safe design
tokens → Tailwind v4 `@theme` codegen, plus a framework-agnostic runtime
theme-switcher. Pure and browser-safe (no `node:*` imports); your token files import
from here.

**Requires Tailwind CSS v4.**

```sh
npm install @twgen/core
```

## What's in it

- **Authoring API** — `defineTokens`, `defineTheme`, `defineThemes` to declare your
  tokens, keyed by canonical Tailwind v4 namespace.
- **`generateTheme`** — the codegen that turns a themes config into the Tailwind v4
  stylesheet (`@theme` block, per-theme palette, `is-light:`/`is-dark:` variants,
  safelist). Usually driven for you by [`@twgen/vite`](https://www.npmjs.com/package/@twgen/vite)
  or [`@twgen/cli`](https://www.npmjs.com/package/@twgen/cli).
- **`createThemeController`** — a dependency-free DOM theme-switcher: applies the
  theme + `scheme-*` classes to `<html>`, persists to `localStorage`, follows the OS
  `prefers-color-scheme`. Exposes `getSnapshot` / `getTheme` / `setTheme` /
  `subscribe`. Use it directly for vanilla apps, or via
  [`@twgen/react`](https://www.npmjs.com/package/@twgen/react).
- **`cn`** — a tiny conditional class-name joiner.

```ts
import { defineThemes, createThemeController } from "@twgen/core"

export const themeConfig = defineThemes([
  { name: "light", scheme: "light", default: true, tokens: base },
  { name: "dark", scheme: "dark", tokens: { ...base, color: { ...base.color, accent: "#60a5fa" } } },
])

const theme = createThemeController(themeConfig)
theme.setTheme("dark")
```

## Node-only subpath

File IO + TS-module loading (used by the Vite plugin and CLI) live in the separate
`@twgen/core/node` subpath — never imported by the browser-safe core.

---

Full documentation, generator model, and examples: **https://github.com/hunterdavisdev/twgen**

MIT © Hunter Davis
