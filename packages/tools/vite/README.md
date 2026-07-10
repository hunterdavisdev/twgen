# @twgen/vite

Vite plugin for [**twgen**](https://github.com/hunterdavisdev/twgen) — regenerates the
Tailwind v4 theme CSS from your tokens on build and on HMR whenever the tokens file
changes.

```sh
npm install -D @twgen/vite
```

Peer dependency: `vite >=5`. Depends on `@twgen/core`.

## Usage

Add it **before** `@tailwindcss/vite` (it runs with `enforce: "pre"`):

```ts
// vite.config.ts
import { defineConfig } from "vite"
import { twgen } from "@twgen/vite"
import tailwindcss from "@tailwindcss/vite"

export default defineConfig({
  plugins: [twgen(), tailwindcss()],
})
```

```css
/* src/index.css */
@import "tailwindcss";
@import "./design/theme.gen.css"; /* generated; gitignore it */
```

### Options

```ts
twgen({
  tokens: "src/design/tokens.ts",       // path to your tokens module
  out: "src/design/theme.gen.css",      // path to the generated CSS (gitignore it)
})
```

Both default to the values shown. The plugin regenerates on `buildStart` and, in dev,
whenever the tokens file changes (triggering HMR).

---

Full documentation: **https://github.com/hunterdavisdev/twgen**

MIT © Hunter Davis
