#!/usr/bin/env node
/**
 * twts CLI — for CI / non-Vite setups.
 *   twts gen [--tokens src/design/tokens.ts] [--out src/design/theme.gen.css]
 */
import { resolve } from "node:path"
import { writeTheme } from "./node"

const args = process.argv.slice(2)

const flag = (name: string, fallback: string): string => {
	const i = args.indexOf(`--${name}`)
	return i !== -1 && args[i + 1] ? args[i + 1] : fallback
}

const run = async () => {
	if (args[0] !== "gen") {
		console.error("Usage: twts gen [--tokens <path>] [--out <path>]")
		process.exit(1)
	}
	const tokensPath = resolve(process.cwd(), flag("tokens", "src/design/tokens.ts"))
	const outPath = resolve(process.cwd(), flag("out", "src/design/theme.gen.css"))

	try {
		const changed = await writeTheme(tokensPath, outPath)
		console.log(changed ? `✓ twts: wrote ${outPath}` : "✓ twts: already up to date")
	} catch (err) {
		console.error(`[twts] ${(err as Error).message}`)
		process.exit(1)
	}
}

run()
