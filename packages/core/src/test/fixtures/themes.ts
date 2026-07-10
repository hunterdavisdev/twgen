/**
 * Canonical test fixtures — the single source of truth for theme configs used
 * across the suite. Import these instead of re-declaring themes inline.
 *
 * The base config is deliberately rich enough to exercise every generator path:
 *   - color.primary/secondary — constant across themes → emitted as literals
 *   - color.text             — varies (black/white)   → promoted to a --th-* var
 *   - font.sans              — constant, safelist:null  → no @source line
 *   - text.sm                — compound, mixed-varying (rem/line constant, weight varies)
 *   - radius.md              — constant, safelist:"rounded"
 */
import { defineTheme, defineThemes, defineTokens } from "../../index"

const base = defineTokens({
	color: { primary: "red", secondary: "blue", text: "black" },
	font: { sans: "ui-sans-serif" },
	text: { sm: { rem: "1", line: "1.5", weight: 400 } },
	radius: { md: "0.5rem" },
})

export const light = defineTheme({
	name: "light",
	scheme: "light",
	default: true,
	tokens: base,
})

export const dark = defineTheme({
	name: "dark",
	scheme: "dark",
	tokens: defineTokens({
		...base,
		color: { ...base.color, text: "white" },
		// rem + line stay constant; only weight varies → proves per-sub-prop promotion.
		text: { sm: { rem: "1", line: "1.5", weight: 700 } },
	}),
})

/** The standard, valid light + dark config. */
export const lightDark = defineThemes([light, dark])

/** Same config, with `radius` reset (locks the namespace to only our tokens). */
export const withReset = defineThemes([light, dark], { reset: ["radius"] })

/** A second light theme, for the `@custom-variant` de-duplication case. */
export const lightAlt = defineTheme({
	name: "lightAlt",
	scheme: "light",
	tokens: base,
})

/** Two same-scheme themes (both light) — should emit a single `is-light` variant. */
export const twoLight = defineThemes([light, lightAlt])
