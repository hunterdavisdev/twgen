# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`twgen` turns TypeScript-defined design tokens into a Tailwind v4 `@theme` stylesheet
plus a typed runtime theme-switcher. One token source drives both the generated CSS and
the TypeScript types, so they can't drift. It's a **bun-workspace monorepo** publishing a
suite of scoped packages under `@twgen/*`.

## Commands (run from the repo root)

Package manager is **bun** (see `bun.lock`). Packages are grouped by role:
`packages/core`, `packages/adapters/*` (framework runtime bindings — `react`), and
`packages/tools/*` (build-time — `vite`, `cli`). Folders are organizational only; each
still publishes as `@twgen/<name>` regardless of location.

- `bun run build` — builds every package via tsup, `@twgen/core` first (others depend on it)
- `bun run typecheck` — `tsc --noEmit` over all packages (one root tsconfig; `@twgen/core`
  — the only cross-package dependency — resolves to its `src` via `paths`, so tests/typecheck
  run against source, no build needed)
- `bun test` — the bun:test suite (tests live in each package's `src/`)
- `bun run check` — `biome check --write .` (format + lint + autofix; the only lint/format step)

## Architecture

Four packages, with a strict **browser-safe core / node boundary** split. Respect it when adding code:

- **`@twgen/core`** (`packages/core/`) — two entries:
  - `src/index.ts` (`.`) — the pure, node-free core: all types, the authoring API
    (`defineTokens`, `defineTheme`, `defineThemes`), the `cn` helper, `generateTheme`
    (the codegen), and `createThemeController` (the framework-agnostic runtime
    theme-switcher — pure DOM + `localStorage`, no node). User token files import this, so
    it **must never import `node:*`.** DOM globals are fine (guarded with `typeof` checks).
  - `src/node.ts` (`@twgen/core/node`) — the *only* place file IO + TS-module loading live
    (`readFileSync`/`writeFileSync`, `jiti`). Node-only subpath; imported by `@twgen/vite`
    and `@twgen/cli`, never by the core index or `@twgen/react`. `loadTokens` uses a fresh
    `jiti` per call (`moduleCache: false`) so watch-driven regen picks up edits.
- **`@twgen/vite`** (`packages/tools/vite/src/index.ts`) — Vite plugin. `enforce: "pre"`;
  regenerates on `buildStart` and on watched-file change. Must run before `@tailwindcss/vite`.
  Depends on `@twgen/core`; peer `vite`.
- **`@twgen/cli`** (`packages/tools/cli/src/index.ts`) — the `twgen` bin (`twgen gen --tokens … --out …`)
  for CI / non-Vite setups. Depends on `@twgen/core`.
- **`@twgen/react`** (`packages/adapters/react/src/index.ts`) — `createThemeStore`, a thin
  `useSyncExternalStore` binding over the core's `createThemeController` (no store lib of its
  own). Node-free like the core; depends on `@twgen/core`; peer `react` only. Vanilla
  consumers skip this package and use `createThemeController` from `@twgen/core` directly.

The browser-safe boundary is now the `@twgen/core/node` **subpath**: the core index stays
pure, and only build-time consumers reach for `/node`. Each package externalizes `@twgen/*`
(and peers) at build, so nothing gets bundled into another.

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

The `NAMESPACES` registry in `packages/core/src/index.ts` is the single source of truth for which Tailwind
v4 namespaces are supported (it mirrors Tailwind v4's 20 documented namespaces 1:1). Add an
entry there with a `safelist` (a utility prefix to emit `@source inline(...)` for
dynamically-built classes, or `null`) and a `subProps` mapper. `text` is the one compound
namespace — its values carry paired line-height / letter-spacing / font-weight via
`textSubProps`; every other namespace uses `single`. Whether a namespace is *reset* (locked
to only your tokens via `--<ns>-*: initial`) is a **user** choice — the `reset` option on
`defineThemes`, threaded through `ThemesConfig` — not a per-namespace flag. Default is fully
additive (no resets).

### Runtime theming

`createThemeController` (in `@twgen/core`) is the engine: it applies **two** classes to
`<html>` — the theme class parsed from the theme's selector (e.g. `.dark`) drives the
palette, and a `scheme-<light|dark>` class drives the `is-light:` / `is-dark:` custom
variants. It persists the choice to `localStorage` (`"theme"` key), follows the OS
`prefers-color-scheme` on first load, and exposes `getSnapshot`/`setTheme`/`subscribe`
(snapshot is reference-stable until a change, so it drops straight into
`useSyncExternalStore`). Vanilla consumers use it directly; `@twgen/react`'s
`createThemeStore` is the `useSyncExternalStore` wrapper. Its behavioral suite lives in
`packages/core/src/test/theme-controller.test.ts`.
