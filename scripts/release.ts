#!/usr/bin/env bun
/**
 * Lockstep release: bump every @twgen/* package to one version, verify, publish, tag.
 *
 *   bun run release <patch|minor|major|x.y.z> [--dry-run]
 *
 * All four packages always move together (see the lockstep decision). `workspace:*`
 * inter-deps are rewritten to the exact version by `bun publish`, and each package's
 * `prepublishOnly` rebuilds its (gitignored) dist — so a matched, tested set ships.
 */
import { readFileSync, writeFileSync } from "node:fs"
import { $ } from "bun"

// Publish order: core first (the others depend on it), then the rest.
const PACKAGES = [
	{ name: "core", dir: "core" },
	{ name: "react", dir: "adapters/react" },
	{ name: "vite", dir: "tools/vite" },
	{ name: "cli", dir: "tools/cli" },
]
const root = new URL("..", import.meta.url).pathname
const pkgDir = (dir: string) => `${root}packages/${dir}`
const manifest = (dir: string) => `${pkgDir(dir)}/package.json`

const arg = process.argv[2]
const dryRun = process.argv.includes("--dry-run")

if (!arg) {
	console.error("Usage: bun run release <patch|minor|major|x.y.z> [--dry-run]")
	process.exit(1)
}

function nextVersion(current: string, bump: string): string {
	if (/^\d+\.\d+\.\d+$/.test(bump)) return bump
	const [major, minor, patch] = current.split(".").map(Number)
	if (bump === "major") return `${major + 1}.0.0`
	if (bump === "minor") return `${major}.${minor + 1}.0`
	if (bump === "patch") return `${major}.${minor}.${patch + 1}`
	console.error(`Invalid version/bump: "${bump}" (expected patch|minor|major|x.y.z)`)
	return process.exit(1)
}

const current = JSON.parse(readFileSync(manifest("core"), "utf8")).version as string
const version = nextVersion(current, arg)
console.log(`\n▶ Releasing @twgen/* ${current} → ${version}${dryRun ? "  (dry run)" : ""}\n`)

// Refuse to release on top of uncommitted changes, so the release commit is only the bump.
const status = (await $`git status --porcelain`.text()).trim()
if (status && !dryRun) {
	console.error("✗ Working tree is dirty — commit or stash first, then release.")
	process.exit(1)
}

// Verify BEFORE touching anything, so a failure leaves the repo untouched.
console.log("• Verifying (typecheck + test + build)…")
await $`bun run typecheck`
await $`bun test`
await $`bun run build`

if (dryRun) {
	console.log("\n• Dry run — publishing with --dry-run, no version bump, no tag:\n")
	for (const pkg of PACKAGES) await $`bun publish --dry-run`.cwd(pkgDir(pkg.dir))
	console.log(`\n✓ Dry run complete. Would release ${version}.`)
	process.exit(0)
}

// Bump every package to the same version.
for (const pkg of PACKAGES) {
	const path = manifest(pkg.dir)
	const json = JSON.parse(readFileSync(path, "utf8"))
	json.version = version
	writeFileSync(path, `${JSON.stringify(json, null, "\t")}\n`)
	console.log(`• Bumped @twgen/${pkg.name} → ${version}`)
}

/**
 * The @twgen/cli, @twgen/react, and @twgen/vite packages all depend on @twgen/core with `workspace:*` version
 * directives. `bun publish` rewrites these using the lockfile's resolved version, but a plain
 * `bun install` (even using --force) does not refresh a workspace package's own version.
 * Easy way out is to just delete the lockfile and run `bun install` again. Might need to find an
 * alternative approach if the project's dependency graph becomes more complex.
 */
console.log("• Regenerating lockfile…")
await $`rm -f ${root}bun.lock`
await $`bun install`

// Publish, core first. prepublishOnly rebuilds dist per package.
console.log("")
for (const pkg of PACKAGES) {
	console.log(`• Publishing @twgen/${pkg.name}…`)
	await $`bun publish`.cwd(pkgDir(pkg.dir))
}

// Commit the bump and tag the release.
await $`git add -A`
await $`git commit -m ${`release: v${version}`}`
await $`git tag ${`v${version}`}`

console.log(`\n✓ Released v${version}. Push it with:\n    git push --follow-tags\n`)
