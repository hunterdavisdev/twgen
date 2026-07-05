import { describe, expect, it } from "bun:test"
import { twgen } from "../vite"

describe("twgen vite plugin", () => {
	it("returns a pre-enforced plugin with the expected hooks", () => {
		const plugin = twgen()
		expect(plugin.name).toBe("twgen")
		expect(plugin.enforce).toBe("pre")
		expect(typeof plugin.buildStart).toBe("function")
		expect(typeof plugin.configureServer).toBe("function")
	})
})
