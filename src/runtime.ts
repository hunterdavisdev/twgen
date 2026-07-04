/**
 * twts runtime — `createThemeStore(config)` returns a typed Zustand hook that
 * manages the active theme: applies the theme class (palette) + `.scheme-*`
 * class (variants) to <html>, persists to localStorage, and follows the OS on
 * first load. Pass it the whole `defineThemes(...)` result.
 *
 *   import { createThemeStore } from "@hunterdavisdev/twts/runtime"
 *   export const useThemeStore = createThemeStore(themeConfig)
 */
import { create } from "zustand"
import type { Scheme, ThemeMeta } from "./index"

export interface ThemeStoreState<Theme extends string> {
	/** The active theme. */
	currentTheme: Theme
	/** The active theme's color-scheme — handy for sun/moon toggles. */
	scheme: Scheme
	/** All theme names, in declaration order (build a toggle or dropdown from these). */
	availableThemes: readonly Theme[]
	setTheme: (theme: Theme) => void
}

/** Accepts the `defineThemes(...)` result (anything exposing a `themes` meta map). */
export function createThemeStore<T extends { themes: Record<string, ThemeMeta> }>(config: T) {
	type Theme = keyof T["themes"] & string
	const meta = config.themes
	const names = Object.keys(meta) as Theme[]

	const themeClass = (theme: Theme): string | null => meta[theme].selector.match(/\.([\w-]+)/)?.[1] ?? null
	const allThemeClasses = names.map(themeClass).filter((c): c is string => c !== null)
	const allSchemeClasses = [...new Set(names.map((t) => `scheme-${meta[t].scheme}`))]

	function applyTheme(theme: Theme) {
		if (typeof document === "undefined") return
		const root = document.documentElement
		root.classList.remove(...allThemeClasses, ...allSchemeClasses)
		const cls = themeClass(theme)
		if (cls) root.classList.add(cls)
		root.classList.add(`scheme-${meta[theme].scheme}`)
	}

	function getInitial(): Theme {
		if (typeof localStorage !== "undefined") {
			const saved = localStorage.getItem("theme")
			if (saved && names.includes(saved as Theme)) return saved as Theme
		}
		const prefersDark = typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches
		const dark = names.find((n) => meta[n].scheme === "dark")
		return prefersDark && dark ? dark : names[0]
	}

	const initial = getInitial()
	applyTheme(initial)

	return create<ThemeStoreState<Theme>>((set) => ({
		currentTheme: initial,
		scheme: meta[initial].scheme,
		availableThemes: names,
		setTheme: (theme) => {
			applyTheme(theme)
			if (typeof localStorage !== "undefined") localStorage.setItem("theme", theme)
			set({ currentTheme: theme, scheme: meta[theme].scheme })
		},
	}))
}
