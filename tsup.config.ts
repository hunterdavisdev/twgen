import { defineConfig } from "tsup"

export default defineConfig({
	entry: ["src/index.ts", "src/vite.ts", "src/runtime.ts", "src/cli.ts"],
	format: ["esm"],
	dts: true,
	clean: true,
	target: "es2023",
})
