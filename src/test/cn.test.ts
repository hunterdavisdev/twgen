import { describe, expect, it } from "bun:test"
import { cn } from "../index"

describe("cn", () => {
	it("joins truthy classes with a single space", () => {
		expect(cn("a", "b", "c")).toBe("a b c")
	})

	it("drops falsy entries (false / null / undefined)", () => {
		expect(cn("a", false, null, undefined, "b")).toBe("a b")
	})

	it("returns an empty string when everything is falsy", () => {
		expect(cn(false, null, undefined)).toBe("")
	})

	it("supports the conditional-class idiom", () => {
		const isActive = false
		expect(cn("base", isActive && "active")).toBe("base")
	})
})
