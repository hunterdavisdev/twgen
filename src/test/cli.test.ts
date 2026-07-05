import { describe, expect, it } from "bun:test"
import { existsSync, mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

const cli = join(import.meta.dir, "..", "cli.ts")
const tokens = join(import.meta.dir, "fixtures", "modules", "default-export.ts")
const broken = join(import.meta.dir, "fixtures", "modules", "neither-export.ts")

function run(args: string[]) {
	// Run the CLI source directly under bun — no build step needed.
	return Bun.spawnSync(["bun", cli, ...args], { stdout: "pipe", stderr: "pipe" })
}

describe("twgen CLI", () => {
	it("writes the output file and exits 0 on `gen`", () => {
		const dir = mkdtempSync(join(tmpdir(), "twgen-cli-"))
		const out = join(dir, "theme.gen.css")
		try {
			const proc = run(["gen", "--tokens", tokens, "--out", out])
			expect(proc.exitCode).toBe(0)
			expect(existsSync(out)).toBe(true)
		} finally {
			rmSync(dir, { recursive: true, force: true })
		}
	})

	it("exits 1 on missing/unknown subcommand", () => {
		expect(run([]).exitCode).toBe(1)
		expect(run(["nope"]).exitCode).toBe(1)
	})

	it("exits 1 when the tokens module is invalid", () => {
		const dir = mkdtempSync(join(tmpdir(), "twgen-cli-"))
		try {
			const proc = run(["gen", "--tokens", broken, "--out", join(dir, "x.css")])
			expect(proc.exitCode).toBe(1)
			expect(proc.stderr.toString()).toContain("[twgen]")
		} finally {
			rmSync(dir, { recursive: true, force: true })
		}
	})
})
