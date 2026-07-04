import { describe, expect, it } from "bun:test"
import { defineTheme, defineThemes, defineTokens } from "../index"

describe("defineThemes > selector resolution", () => {
	it("defaults a non-default theme's selector to :root.{name}", () => {
		const cfg = defineThemes([
			{ name: "light", scheme: "light", default: true, tokens: {} },
			{ name: "dark", scheme: "dark", tokens: {} },
		])
		expect(cfg.themes.dark.selector).toBe(":root.dark")
	})

	it("resolves the default theme's selector to :root", () => {
		const cfg = defineThemes([{ name: "light", scheme: "light", default: true, tokens: {} }])
		expect(cfg.themes.light.selector).toBe(":root")
	})

	it("preserves an explicit selector override over the default", () => {
		const cfg = defineThemes([
			{ name: "light", scheme: "light", default: true, tokens: {} },
			{ name: "dark", scheme: "dark", selector: '[data-theme="dark"]', tokens: {} },
		])
		expect(cfg.themes.dark.selector).toBe('[data-theme="dark"]')
	})
})

describe("defineThemes > meta map", () => {
	it("keys the meta map by theme name with selector + scheme", () => {
		const cfg = defineThemes([
			{ name: "light", scheme: "light", default: true, tokens: {} },
			{ name: "dark", scheme: "dark", tokens: {} },
		])
		expect(Object.keys(cfg.themes)).toEqual(["light", "dark"])
		expect(cfg.themes.light).toEqual({ selector: ":root", scheme: "light" })
		expect(cfg.themes.dark).toEqual({ selector: ":root.dark", scheme: "dark" })
	})

	it("preserves declaration order in the list", () => {
		const cfg = defineThemes([
			{ name: "light", scheme: "light", default: true, tokens: {} },
			{ name: "dark", scheme: "dark", tokens: {} },
		])
		expect(cfg.list.map((t) => t.name)).toEqual(["light", "dark"])
	})

	it("normalizes a mix of plain specs and defineTheme() results", () => {
		const dark = defineTheme({ name: "dark", scheme: "dark", tokens: {} })
		const cfg = defineThemes([{ name: "light", scheme: "light", default: true, tokens: {} }, dark])
		expect(cfg.themes.light.selector).toBe(":root")
		expect(cfg.themes.dark.selector).toBe(":root.dark")
	})
})

describe("defineThemes > options", () => {
	it("passes reset through unchanged", () => {
		const cfg = defineThemes([{ name: "light", scheme: "light", default: true, tokens: {} }], {
			reset: ["radius", "shadow"],
		})
		expect(cfg.reset).toEqual(["radius", "shadow"])
	})

	it("leaves reset undefined when no options are given", () => {
		const cfg = defineThemes([{ name: "light", scheme: "light", default: true, tokens: {} }])
		expect(cfg.reset).toBeUndefined()
	})
})

describe("defineTokens / defineTheme", () => {
	it("defineTokens returns its input unchanged (identity)", () => {
		const t = { color: { primary: "red" } }
		expect(defineTokens(t)).toBe(t)
	})

	it("defineTheme returns its input unchanged (identity)", () => {
		const s = { name: "x", scheme: "light", tokens: {} } as const
		expect(defineTheme(s)).toBe(s)
	})
})
