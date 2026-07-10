/**
 * Internal node-only helpers (file IO + TS loading). Imported only by the
 * `vite` and `cli` entries — never by the browser-safe core.
 */
import { readFileSync, writeFileSync } from "node:fs"
import { createJiti } from "jiti"
import { generateTheme, type ThemesConfig } from "./index"

/** Load a themes config from a path; accepts default or named `themes` export. */
export async function loadTokens(absPath: string): Promise<ThemesConfig> {
	// Fresh jiti each call so watch-driven regeneration picks up edits.
	const jiti = createJiti(import.meta.url, { moduleCache: false })
	const mod = (await jiti.import(absPath)) as { default?: ThemesConfig; themes?: ThemesConfig }
	// jiti's CJS interop synthesizes a truthy `mod.default` (the whole namespace) even when
	// the module has no real `export default`, so we can't rely on `mod.default ?? mod.themes`
	// — a named-`themes`-only module would wrongly pick the namespace. `"default" in mod`
	// (the proxy's `has` trap) reflects only real exports, so use it to gate the default.
	const config = ("default" in mod ? mod.default : undefined) ?? mod.themes
	if (!config) {
		throw new Error(`twgen: ${absPath} must export a defineThemes([...]) result (default export, or named \`themes\`)`)
	}
	return config
}

/** Regenerate `outPath` from `tokensPath`. Returns true if the file changed. */
export async function writeTheme(tokensPath: string, outPath: string): Promise<boolean> {
	const config = await loadTokens(tokensPath)
	const next = generateTheme(config)
	let current = ""
	try {
		current = readFileSync(outPath, "utf8")
	} catch {
		// file doesn't exist yet — treat as changed
	}
	if (next === current) return false
	writeFileSync(outPath, next)
	return true
}
