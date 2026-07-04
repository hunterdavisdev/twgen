/**
 * twts Vite plugin — regenerates the theme CSS from your tokens on build and
 * (in dev) whenever the tokens file changes, triggering HMR.
 *
 *   import { twts } from "@hunterdavisdev/twts/vite"
 *   plugins: [twts(), tailwindcss()]   // place before @tailwindcss/vite
 */
import { resolve } from "node:path"
import type { Plugin } from "vite"
import { writeTheme } from "./node"

export interface TwtsOptions {
	/** Path to the tokens module. Default: "src/design/tokens.ts". */
	tokens?: string
	/** Path to the generated CSS (gitignore it). Default: "src/design/theme.gen.css". */
	out?: string
}

export function twts(options: TwtsOptions = {}): Plugin {
	const tokensPath = resolve(process.cwd(), options.tokens ?? "src/design/tokens.ts")
	const outPath = resolve(process.cwd(), options.out ?? "src/design/theme.gen.css")

	const regen = async () => {
		try {
			await writeTheme(tokensPath, outPath)
		} catch (err) {
			console.error(`[twts] ${(err as Error).message}`)
		}
	}

	return {
		name: "twts",
		enforce: "pre",
		async buildStart() {
			await regen()
		},
		configureServer(server) {
			server.watcher.add(tokensPath)
			server.watcher.on("change", async (file) => {
				if (resolve(file) === tokensPath) await regen()
			})
		},
	}
}

export default twts
