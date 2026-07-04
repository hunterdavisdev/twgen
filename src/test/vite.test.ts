import { describe, expect, it } from "bun:test"
import { twts } from "../vite"

describe("twts vite plugin", () => {
	it("returns a pre-enforced plugin with the expected hooks", () => {
		const plugin = twts()
		expect(plugin.name).toBe("twts")
		expect(plugin.enforce).toBe("pre")
		expect(typeof plugin.buildStart).toBe("function")
		expect(typeof plugin.configureServer).toBe("function")
	})
})
