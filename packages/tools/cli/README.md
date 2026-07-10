# @twgen/cli

The `twgen` command for [**twgen**](https://github.com/hunterdavisdev/twgen) —
generates the Tailwind v4 theme CSS from your tokens. For CI and non-Vite setups
(for Vite, use [`@twgen/vite`](https://www.npmjs.com/package/@twgen/vite) instead).

```sh
npm install -D @twgen/cli
# or run without installing:
npx @twgen/cli gen --tokens src/design/tokens.ts --out src/design/theme.gen.css
```

Depends on `@twgen/core`.

## Usage

```sh
twgen gen [--tokens <path>] [--out <path>]
```

| Flag | Default | Description |
| --- | --- | --- |
| `--tokens` | `src/design/tokens.ts` | Path to your tokens module (exports a `defineThemes(...)` result — default export or named `themes`). |
| `--out` | `src/design/theme.gen.css` | Path to write the generated CSS. Gitignore it. |

The command exits non-zero on error, and is a no-op (leaving the file untouched) when
the generated output already matches what's on disk — safe to run in CI.

---

Full documentation: **https://github.com/hunterdavisdev/twgen**

MIT © Hunter Davis
