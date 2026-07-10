#!/usr/bin/env node
/**
 * twgen CLI — for CI / non-Vite setups.
 *   twgen gen [--tokens src/design/tokens.ts] [--out src/design/theme.gen.css]
 */
import { resolve } from "node:path"
import { writeTheme } from "@twgen/core/node"

const args = process.argv.slice(2)

const flag = (name: string, fallback: string): string => {
	const i = args.indexOf(`--${name}`)
	return i !== -1 && args[i + 1] ? args[i + 1] : fallback
}

const run = async () => {
	if (args[0] !== "gen") {
		console.error("Usage: twgen gen [--tokens <path>] [--out <path>]")
		process.exit(1)
	}
	const tokensPath = resolve(process.cwd(), flag("tokens", "src/design/tokens.ts"))
	const outPath = resolve(process.cwd(), flag("out", "src/design/theme.gen.css"))

	try {
		const changed = await writeTheme(tokensPath, outPath)
		console.log(changed ? `✓ twgen: wrote ${outPath}` : "✓ twgen: already up to date")
	} catch (err) {
		console.error(`[twgen] ${(err as Error).message}`)
		process.exit(1)
	}
}

run()
