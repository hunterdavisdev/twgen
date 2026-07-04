# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`twts` is a library that turns TypeScript-defined design tokens into a Tailwind v4
`@theme` stylesheet plus a typed runtime theme-switcher. One token source drives
both the generated CSS and the TypeScript types, so they can't drift. Distributed
as a package with three importable entries (`.`, `./vite`, `./runtime`) and a CLI bin (`twts`).

## Commands

Package manager is **bun** (see `bun.lock`).

- `bun run build` — bundle to `dist/` via tsup (emits `.js` + `.d.ts` for each entry)
- `bun run dev` — tsup in watch mode
- `bun run typecheck` — `tsc --noEmit`
- `bun run check` — `biome check --write .` (format + lint + autofix; the only lint/format step)

There is **no test framework or test suite** in this repo — don't assume `bun test` exists.

## Architecture

The package has a strict **browser-safe core / node boundary** split. Respect it when adding code:

- **`src/index.ts`** — the pure, node-free core (`.` entry). Contains all types, the
  authoring API (`defineTokens`, `createTheme`, `defineThemes`), the `cn` helper, and
  `generateTheme` (the codegen). User token files import from here, so it **must never
  import `node:*` or any node-only module.**
- **`src/node.ts`** — the *only* place file IO and TS-module loading live (`readFileSync`/
  `writeFileSync`, `jiti` to import `.ts` token files). Internal; imported only by `vite.ts`
  and `cli.ts`, never by the core or runtime. `loadTokens` uses a fresh `jiti` instance per
  call (`moduleCache: false`) so watch-driven regen picks up edits.
- **`src/vite.ts`** — Vite plugin (`./vite` entry). `enforce: "pre"`; regenerates on
  `buildStart` and on watched-file change. Must run before `@tailwindcss/vite`.
- **`src/cli.ts`** — CLI bin (`twts gen --tokens … --out …`) for CI / non-Vite setups.
- **`src/runtime.ts`** — `createThemeStore` (`./runtime` entry), a Zustand store factory.
  Node-free like the core; depends on the `react`/`vite`/`zustand` peer deps (all optional).

`node.ts` is deliberately **not** a package export — it's the internal seam that keeps node
code out of anything a browser might import.

### The codegen model (the central idea)

A theme is a flat bag of token values keyed by Tailwind v4 namespace (`color`, `text`,
`radius`, …). `generateTheme` compares each token *across all themes*:

- **Constant across themes** → emitted as a literal in the `@theme` block.
- **Varies between themes** → promoted to a `--th-*` variable referenced in `@theme`, whose
  value is swapped per theme inside `:root` / `:root.<name>` palette blocks.

So any token (color *or* scale) can vary per theme, but you only pay extra CSS for the ones
that actually differ. When touching the generator, preserve these invariants (all enforced
with thrown errors in `generateTheme`):

- Exactly **one** theme must use selector `:root` — that's the default theme.
- Every token used by a non-default theme **must also exist in the default theme**, so a
  promoted `--th-*` var always has a base value to fall back to via the cascade.

### Adding a Tailwind namespace

The `NAMESPACES` registry in `src/index.ts` is the single source of truth for which Tailwind
v4 namespaces are supported (it mirrors Tailwind v4's 20 documented namespaces 1:1). Add an
entry there with a `safelist` (a utility prefix to emit `@source inline(...)` for
dynamically-built classes, or `null`) and a `subProps` mapper. `text` is the one compound
namespace — its values carry paired line-height / letter-spacing / font-weight via
`textSubProps`; every other namespace uses `single`. Whether a namespace is *reset* (locked
to only your tokens via `--<ns>-*: initial`) is a **user** choice — the `reset` option on
`defineThemes`, threaded through `ThemesConfig` — not a per-namespace flag. Default is fully
additive (no resets).

### Runtime theming

`createThemeStore` applies **two** classes to `<html>`: the theme class parsed from the
theme's selector (e.g. `.dark`) drives the palette, and a `scheme-<light|dark>` class drives
the `is-light:` / `is-dark:` custom variants. It persists the choice to `localStorage`
(`"theme"` key) and follows the OS `prefers-color-scheme` on first load.

## Gotchas

- **npm name is `twts`:** the more intuitive `tstw` was already taken on npm by an unrelated
  package, so this ships as `twts`. Keep the package name, `bin`, imports, and docs all on
  `twts` — don't "correct" it back to `tstw`.
- `src/design/theme.gen.css` (the generated output) is meant to be gitignored in consuming
  projects — it's regenerated from tokens and should never be hand-edited (it carries an
  AUTO-GENERATED header).
- Biome formatting is unusual: **tabs**, width 2, line width 120, no semicolons, double quotes,
  ES5 trailing commas. Run `bun run check` rather than matching by hand.
