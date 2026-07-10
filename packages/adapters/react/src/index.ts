/**
 * twgen React runtime — `createThemeStore(config)` returns a typed hook that
 * manages the active theme. It's a thin `useSyncExternalStore` binding over
 * `@twgen/core`'s framework-agnostic `createThemeController`, which owns the DOM
 * (applies the theme + `.scheme-*` classes to <html>, persists to localStorage,
 * follows the OS on first load). Pass it the whole `defineThemes(...)` result.
 *
 *   import { createThemeStore } from "@twgen/react"
 *   export const useTheme = createThemeStore(themeConfig)
 */

import { createThemeController, type Scheme, type ThemeMeta } from "@twgen/core"
import { useSyncExternalStore } from "react"

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
	const controller = createThemeController(config)

	return function useTheme(): ThemeStoreState<Theme> {
		// getSnapshot doubles as the server snapshot: it never touches the DOM and
		// returns the same reference-stable value, so SSR renders the initial theme.
		const snap = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot)
		return {
			currentTheme: snap.currentTheme,
			scheme: snap.scheme,
			availableThemes: snap.availableThemes,
			setTheme: controller.setTheme,
		}
	}
}
