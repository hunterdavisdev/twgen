<!-- Thanks for contributing to twgen! Keep PRs focused on one logical change. -->

## What & why

<!-- What does this change do, and what problem does it solve? Link any related issue. -->

Closes #

## How I verified it

<!-- How did you confirm this works? Commands run, output observed, cases covered. -->

## Checklist

- [ ] `bun run check` passes (biome format + lint)
- [ ] `bun run typecheck` passes
- [ ] `bun test` passes
- [ ] `bun run build` succeeds
- [ ] Added/updated tests for the change (incl. the generator snapshot if codegen changed)
- [ ] Respected the browser-safe core / node boundary (no `node:*` in `@twgen/core`'s `.` entry)
- [ ] No version bumps — releases are handled by maintainers in lockstep
