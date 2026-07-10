# Contributing to twgen

Thanks for your interest in improving twgen! This is a bun-workspace monorepo that
publishes the `@twgen/*` suite. This guide covers local setup, the dev loop, and the
conventions to follow so your change lands smoothly.

## Prerequisites

- **[Bun](https://bun.sh) ≥ 1.2** — the package manager and test runner (see `bun.lock`).
- **Node ≥ 18** — the published packages target this.

## Setup

```sh
git clone https://github.com/hunterdavisdev/twgen.git
cd twgen
bun install
```

## The dev loop

All commands run from the repo root:

| Command | What it does |
| --- | --- |
| `bun run build` | Builds every package via tsup (`@twgen/core` first — the others depend on it). |
| `bun run typecheck` | `tsc --noEmit` across all packages. One root tsconfig maps `@twgen/*` to package `src` via `paths`, so this runs against **source** — no build needed. |
| `bun test` | The `bun:test` suite. Tests live next to the code, in each package's `src/`. |
| `bun run check` | `biome check --write .` — format + lint + autofix. **The only lint/format step.** |

Before opening a PR, make sure all four pass:

```sh
bun run check && bun run typecheck && bun test && bun run build
```

CI runs the same gates (`biome ci`, typecheck, test, build) on every pull request.

## Architecture you need to respect

Four packages, split by a strict **browser-safe core / node boundary**. Keep it intact:

- **`@twgen/core`** (`packages/core/`) — two entries:
  - `src/index.ts` (`.`) — pure and **node-free**: all types, the authoring API
    (`defineTokens` / `defineTheme` / `defineThemes`), the `cn` helper, `generateTheme`
    (the codegen), and `createThemeController` (the DOM runtime theme-switcher). User token
    files import this, so it **must never import `node:*`.** DOM globals are OK, but guard
    them (`typeof document !== "undefined"`) for SSR safety.
  - `src/node.ts` (`@twgen/core/node`) — the **only** place file IO + TS-module loading live.
    Imported by `@twgen/vite` and `@twgen/cli`, never by the core index or `@twgen/react`.
- **`@twgen/vite`** — Vite plugin. Peer `vite`.
- **`@twgen/cli`** — the `twgen` bin.
- **`@twgen/react`** — a thin `useSyncExternalStore` binding over `createThemeController`. Peer `react`.

The codegen has hard invariants (enforced with thrown errors in `generateTheme`): exactly one
theme must be the default (`:root`), and every token used by a non-default theme must exist in
the default theme. When touching the generator, preserve these and update the snapshot tests.

Adding a Tailwind namespace? Extend the `NAMESPACES` registry in `packages/core/src/index.ts` —
it's the single source of truth and mirrors Tailwind v4's namespaces 1:1.

> For a deeper architectural tour, see [`CLAUDE.md`](./CLAUDE.md).

## Code style

- **Biome** owns formatting and linting — run `bun run check` and commit the result. Don't
  hand-format against it. (Tabs, double quotes, no semicolons, 120-col; all configured in
  `biome.json`.)
- Match the surrounding code: the existing packages favor small, well-commented functions.
- Add or update tests for any behavior change. Generator changes usually touch the snapshot in
  `packages/core/src/test/__snapshots__/`.

## Pull requests

1. Fork and branch off `main` (e.g. `feat/…`, `fix/…`).
2. Make the change, add tests, and get all four gates green.
3. Keep PRs focused — one logical change per PR.
4. Fill out the PR template describing the change and how you verified it.

Packages are released in **lockstep** (all four bump to one version together), so you don't
need to touch version numbers — maintainers handle releases via `bun run release`.

## Reporting bugs & requesting features

Open an issue using the templates. For bugs, a minimal reproduction (a tiny tokens file + the
generated output you got vs. expected) is worth a thousand words.

## License

By contributing, you agree that your contributions are licensed under the [MIT License](./LICENSE).
