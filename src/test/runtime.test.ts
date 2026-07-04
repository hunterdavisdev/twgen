import { afterEach, describe, expect, it } from "bun:test"
import { Window } from "happy-dom"
import { defineThemes } from "../index"
import { createThemeStore } from "../runtime"

/**
 * Install a controllable DOM on globalThis: a real happy-dom document (so
 * classList actually works) plus a fake localStorage and a matchMedia we can
 * point at "prefers dark" on demand. Returns handles + a store of writes.
 */
function installDom({ prefersDark = false, saved }: { prefersDark?: boolean; saved?: string } = {}) {
	const win = new Window()
	const store = new Map<string, string>()
	if (saved !== undefined) store.set("theme", saved)

	const localStorage = {
		getItem: (k: string) => store.get(k) ?? null,
		setItem: (k: string, v: string) => void store.set(k, v),
		removeItem: (k: string) => void store.delete(k),
	}
	;(win as unknown as { matchMedia: (q: string) => { matches: boolean } }).matchMedia = (q: string) => ({
		matches: q.includes("dark") ? prefersDark : false,
	})

	const g = globalThis as Record<string, unknown>
	g.document = win.document
	g.window = win
	g.localStorage = localStorage
	return { root: win.document.documentElement, store }
}

function clearDom() {
	const g = globalThis as Record<string, unknown>
	g.document = undefined
	g.window = undefined
	g.localStorage = undefined
}

afterEach(clearDom)

const config = defineThemes([
	{ name: "light", scheme: "light", default: true, tokens: {} },
	{ name: "dark", scheme: "dark", tokens: {} },
])
const lightOnly = defineThemes([{ name: "light", scheme: "light", default: true, tokens: {} }])

describe("createThemeStore > applyTheme", () => {
	it("applies the theme class + scheme class to <html>", () => {
		const { root } = installDom()
		const store = createThemeStore(config)
		store.getState().setTheme("dark")
		expect(root.classList.contains("dark")).toBe(true)
		expect(root.classList.contains("scheme-dark")).toBe(true)
	})

	it("adds no palette class for a :root (default) theme, only the scheme class", () => {
		const { root } = installDom()
		const store = createThemeStore(config)
		store.getState().setTheme("light")
		// light's selector is ":root" → no palette class, just scheme-light.
		expect(root.classList.contains("scheme-light")).toBe(true)
		expect(root.classList.contains("light")).toBe(false)
	})

	it("removes stale classes on switch (light → dark → light leaves no leftovers)", () => {
		const { root } = installDom()
		const store = createThemeStore(config)
		store.getState().setTheme("dark")
		store.getState().setTheme("light")
		expect(root.classList.contains("dark")).toBe(false)
		expect(root.classList.contains("scheme-dark")).toBe(false)
		expect(root.classList.contains("scheme-light")).toBe(true)
	})

	it("parses a hyphenated theme class from the selector", () => {
		const { root } = installDom()
		const hc = defineThemes([
			{ name: "light", scheme: "light", default: true, tokens: {} },
			{ name: "hi-contrast", scheme: "dark", tokens: {} },
		])
		const store = createThemeStore(hc)
		store.getState().setTheme("hi-contrast")
		expect(root.classList.contains("hi-contrast")).toBe(true)
	})
})

describe("createThemeStore > getInitial precedence", () => {
	it("uses a valid saved theme over the OS preference", () => {
		installDom({ saved: "dark", prefersDark: false })
		expect(createThemeStore(config).getState().currentTheme).toBe("dark")
	})

	it("ignores an invalid saved theme name", () => {
		installDom({ saved: "bogus", prefersDark: false })
		expect(createThemeStore(config).getState().currentTheme).toBe("light")
	})

	it("follows prefers-color-scheme: dark when a dark theme exists", () => {
		installDom({ prefersDark: true })
		expect(createThemeStore(config).getState().currentTheme).toBe("dark")
	})

	it("falls back to the first theme when prefers-dark but no dark theme exists", () => {
		installDom({ prefersDark: true })
		expect(createThemeStore(lightOnly).getState().currentTheme).toBe("light")
	})
})

describe("createThemeStore > setTheme", () => {
	it("updates currentTheme + scheme and persists to localStorage", () => {
		const { store } = installDom()
		const s = createThemeStore(config)
		s.getState().setTheme("dark")
		expect(s.getState().currentTheme).toBe("dark")
		expect(s.getState().scheme).toBe("dark")
		expect(store.get("theme")).toBe("dark")
	})

	it("exposes availableThemes in declaration order", () => {
		installDom()
		expect(createThemeStore(config).getState().availableThemes).toEqual(["light", "dark"])
	})
})

describe("createThemeStore > SSR safety", () => {
	it("constructs without a document/window/localStorage", () => {
		clearDom()
		const make = () => createThemeStore(config)
		let s: ReturnType<typeof make> | undefined
		expect(() => {
			s = make()
		}).not.toThrow()
		expect(s?.getState().currentTheme).toBe("light")
	})
})
