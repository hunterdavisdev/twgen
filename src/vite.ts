/**
 * twgen Vite plugin — regenerates the theme CSS from your tokens on build and
 * (in dev) whenever the tokens file changes, triggering HMR.
 *
 *   import { twgen } from "twgen/vite"
 *   plugins: [twgen(), tailwindcss()]   // place before @tailwindcss/vite
 */
import { resolve } from "node:path"
import type { Plugin } from "vite"
import { writeTheme } from "./node"

export interface TwgenOptions {
	/** Path to the tokens module. Default: "src/design/tokens.ts". */
	tokens?: string
	/** Path to the generated CSS (gitignore it). Default: "src/design/theme.gen.css". */
	out?: string
}

export function twgen(options: TwgenOptions = {}): Plugin {
	const tokensPath = resolve(process.cwd(), options.tokens ?? "src/design/tokens.ts")
	const outPath = resolve(process.cwd(), options.out ?? "src/design/theme.gen.css")

	const regen = async () => {
		try {
			await writeTheme(tokensPath, outPath)
		} catch (err) {
			console.error(`[twgen] ${(err as Error).message}`)
		}
	}

	return {
		name: "twgen",
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

export default twgen
