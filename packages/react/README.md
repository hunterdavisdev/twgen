# @twgen/react

React runtime theme-switcher for [**twgen**](https://github.com/hunterdavisdev/twgen) —
a typed hook that applies the active theme to `<html>`. A thin
`useSyncExternalStore` wrapper over `@twgen/core`'s `createThemeController`.

```sh
npm install @twgen/react
```

Peer dependency: `react >=18`. Depends on `@twgen/core`.

## Usage

Pass your `defineThemes(...)` result to `createThemeStore` to build a typed hook:

```ts
// src/theme.ts
import { createThemeStore } from "@twgen/react"
import { themeConfig } from "@/design/tokens"

export const useTheme = createThemeStore(themeConfig)
```

```tsx
function ThemePicker() {
  const { currentTheme, availableThemes, setTheme, scheme } = useTheme()
  return (
    <select value={currentTheme} onChange={(e) => setTheme(e.target.value)}>
      {availableThemes.map((t) => (
        <option key={t}>{t}</option>
      ))}
    </select>
  )
}
```

The hook returns `currentTheme`, `scheme` (the active theme's light/dark),
`availableThemes`, and `setTheme`. On first construction it reads the saved choice
(`localStorage`, key `"theme"`), falls back to the OS `prefers-color-scheme`, and
applies the theme + `scheme-*` classes to `<html>` — so a client-rendered app paints
the right theme before React mounts.

> Not using React? Use `createThemeController` from
> [`@twgen/core`](https://www.npmjs.com/package/@twgen/core) directly — same engine,
> no framework.

---

Full documentation: **https://github.com/hunterdavisdev/twgen**

MIT © Hunter Davis
