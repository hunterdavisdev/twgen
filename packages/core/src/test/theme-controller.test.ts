import { afterEach, describe, expect, it } from "bun:test"
import { Window } from "happy-dom"
import { createThemeController, defineThemes } from "../index"

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

describe("createThemeController > applyTheme", () => {
	it("applies the theme class + scheme class to <html>", () => {
		const { root } = installDom()
		createThemeController(config).setTheme("dark")
		expect(root.classList.contains("dark")).toBe(true)
		expect(root.classList.contains("scheme-dark")).toBe(true)
	})

	it("adds no palette class for a :root (default) theme, only the scheme class", () => {
		const { root } = installDom()
		createThemeController(config).setTheme("light")
		// light's selector is ":root" → no palette class, just scheme-light.
		expect(root.classList.contains("scheme-light")).toBe(true)
		expect(root.classList.contains("light")).toBe(false)
	})

	it("removes stale classes on switch (light → dark → light leaves no leftovers)", () => {
		const { root } = installDom()
		const c = createThemeController(config)
		c.setTheme("dark")
		c.setTheme("light")
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
		createThemeController(hc).setTheme("hi-contrast")
		expect(root.classList.contains("hi-contrast")).toBe(true)
	})
})

describe("createThemeController > getInitial precedence", () => {
	it("uses a valid saved theme over the OS preference", () => {
		installDom({ saved: "dark", prefersDark: false })
		expect(createThemeController(config).getSnapshot().currentTheme).toBe("dark")
	})

	it("ignores an invalid saved theme name", () => {
		installDom({ saved: "bogus", prefersDark: false })
		expect(createThemeController(config).getSnapshot().currentTheme).toBe("light")
	})

	it("follows prefers-color-scheme: dark when a dark theme exists", () => {
		installDom({ prefersDark: true })
		expect(createThemeController(config).getSnapshot().currentTheme).toBe("dark")
	})

	it("falls back to the first theme when prefers-dark but no dark theme exists", () => {
		installDom({ prefersDark: true })
		expect(createThemeController(lightOnly).getSnapshot().currentTheme).toBe("light")
	})
})

describe("createThemeController > setTheme", () => {
	it("updates the snapshot + persists to localStorage", () => {
		const { store } = installDom()
		const c = createThemeController(config)
		c.setTheme("dark")
		expect(c.getSnapshot().currentTheme).toBe("dark")
		expect(c.getSnapshot().scheme).toBe("dark")
		expect(c.getTheme()).toBe("dark")
		expect(store.get("theme")).toBe("dark")
	})

	it("exposes availableThemes in declaration order", () => {
		installDom()
		expect(createThemeController(config).availableThemes).toEqual(["light", "dark"])
	})

	it("returns a reference-stable snapshot until the theme changes", () => {
		installDom()
		const c = createThemeController(config)
		const first = c.getSnapshot()
		expect(c.getSnapshot()).toBe(first) // same ref — safe for useSyncExternalStore
		c.setTheme("dark")
		expect(c.getSnapshot()).not.toBe(first) // new ref after a real change
	})
})

describe("createThemeController > subscribe", () => {
	it("notifies subscribers on change and stops after unsubscribe", () => {
		installDom()
		const c = createThemeController(config)
		let hits = 0
		const unsub = c.subscribe(() => hits++)
		c.setTheme("dark")
		expect(hits).toBe(1)
		c.setTheme("dark") // no-op: already dark → no notification
		expect(hits).toBe(1)
		unsub()
		c.setTheme("light")
		expect(hits).toBe(1)
	})
})

describe("createThemeController > SSR safety", () => {
	it("constructs without a document/window/localStorage", () => {
		clearDom()
		let c: ReturnType<typeof createThemeController> | undefined
		expect(() => {
			c = createThemeController(config)
		}).not.toThrow()
		expect(c?.getSnapshot().currentTheme).toBe("light")
	})
})
