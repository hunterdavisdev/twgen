import { describe, expect, it } from "bun:test"
import { defineThemes } from "@twgen/core"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { createThemeStore } from "./index"

/**
 * The runtime engine (class application, getInitial precedence, persistence,
 * subscribe) is covered in @twgen/core's createThemeController suite. Here we
 * only smoke-test the React binding: that createThemeStore returns a working
 * hook whose snapshot renders. renderToStaticMarkup drives useSyncExternalStore's
 * server-snapshot path (no DOM needed → the SSR-safe initial theme).
 */
const config = defineThemes([
	{ name: "light", scheme: "light", default: true, tokens: {} },
	{ name: "dark", scheme: "dark", tokens: {} },
])

describe("createThemeStore (react binding)", () => {
	it("returns a hook that renders the initial theme snapshot", () => {
		const useTheme = createThemeStore(config)

		function Label() {
			const { currentTheme, scheme, availableThemes } = useTheme()
			return createElement("span", { "data-scheme": scheme, "data-all": availableThemes.join(",") }, currentTheme)
		}

		const html = renderToStaticMarkup(createElement(Label))
		// No DOM/localStorage → SSR-safe initial theme is the first (default) theme.
		expect(html).toContain(">light<")
		expect(html).toContain('data-scheme="light"')
		expect(html).toContain('data-all="light,dark"')
	})
})
