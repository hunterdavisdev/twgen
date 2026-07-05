/**
 * twgen core — pure, node-free. Safe to import from browser code (your token
 * files import `defineTokens` / `defineTheme` / `defineThemes` from here).
 *
 * Model: a theme is a flat bag of token values (colors + scales). The generator
 * compares each token across all themes and emits it as a literal in `@theme`
 * when it's constant, or promotes it to a `--th-*` variable (swapped per theme
 * in `:root` blocks) when it varies. So *any* token can be overridden per theme,
 * but only the ones you actually vary cost extra CSS.
 */

export type Scheme = "light" | "dark"

export interface ThemeMeta {
	selector: string
	scheme: Scheme
}

export interface FontSizeValue {
	rem: string
	/** Optional paired line-height (emits `--text-{k}--line-height`). */
	line?: string
	/** Optional paired letter-spacing (emits `--text-{k}--letter-spacing`). */
	tracking?: string
	/** Optional paired font-weight (emits `--text-{k}--font-weight`). */
	weight?: string | number
	/** Display-only (e.g. for a showcase); ignored by codegen. */
	px?: string
}

type ScaleTokens = Record<string, string | number>

/**
 * A theme's token values, keyed by canonical Tailwind v4 namespace. `text`
 * (font-size) is the one compound namespace — its values carry paired
 * line-height / letter-spacing / font-weight; the rest are flat `name → value`.
 */
export interface ThemeTokens {
	color?: ScaleTokens
	font?: ScaleTokens
	text?: Record<string, FontSizeValue>
	"font-weight"?: ScaleTokens
	tracking?: ScaleTokens
	leading?: ScaleTokens
	"tab-size"?: ScaleTokens
	breakpoint?: ScaleTokens
	container?: ScaleTokens
	spacing?: ScaleTokens
	radius?: ScaleTokens
	shadow?: ScaleTokens
	"inset-shadow"?: ScaleTokens
	"drop-shadow"?: ScaleTokens
	blur?: ScaleTokens
	perspective?: ScaleTokens
	zoom?: ScaleTokens
	aspect?: ScaleTokens
	ease?: ScaleTokens
	animate?: ScaleTokens
}

/** A Tailwind v4 theme namespace — the keys of `ThemeTokens`, and the element type of the `reset` option. */
export type Namespace = keyof ThemeTokens

export interface ThemeSpec {
	name: string
	scheme: Scheme
	/**
	 * Marks the default (base) theme — emitted under `:root`, the layer all other
	 * themes cascade from. Exactly one theme must be the default.
	 */
	default?: boolean
	/**
	 * CSS selector override. Defaults to `:root` when `default`, else `:root.{name}`.
	 * Set explicitly only for custom activation (e.g. `[data-theme="dark"]`).
	 */
	selector?: string
	/** The theme's design tokens, keyed by canonical Tailwind v4 namespace. */
	tokens: ThemeTokens
}

export interface Theme {
	name: string
	selector: string
	scheme: Scheme
	tokens: ThemeTokens
}

export interface ThemesConfig {
	themes: Record<string, ThemeMeta>
	list: readonly Theme[]
	/** Namespaces to reset (`--<ns>-*: initial`) so only your tokens exist; default: none (fully additive). */
	reset?: readonly Namespace[]
}

/**
 * Typed identity for a reusable token fragment (shared scales, color sets…).
 * Constrained to `ThemeTokens`, so top-level keys autocomplete to valid Tailwind
 * namespaces (and aliases) and a typo'd namespace is a compile error — while
 * `const` preserves the literal token names for `keyof typeof …` derivation.
 */
export function defineTokens<const T extends ThemeTokens>(tokens: T): T {
	return tokens
}

/**
 * Join conditional class names; falsy entries are dropped — e.g.
 * `cn("base", isActive && "bg-accent")`. Register "cn" under
 * `tailwindCSS.classFunctions` to get Tailwind autocomplete in its args.
 */
export function cn(...classes: (string | false | null | undefined)[]): string {
	return classes.filter(Boolean).join(" ")
}

/** Resolve a theme's CSS selector: explicit override wins, else `:root` for the default, else `:root.{name}`. */
function resolveSelector(name: string, selector: string | undefined, isDefault: boolean | undefined): string {
	if (selector) return selector
	return isDefault ? ":root" : `:root.${name}`
}

/**
 * Optional sugar for splitting themes across files: type one theme spec in
 * isolation (preserving literal token / name types via `const`) so you can
 * `export const dark = defineTheme({ ... })` and drop it into `defineThemes([...])`.
 * Returns the spec unchanged — `defineThemes` is the only thing that normalizes.
 */
export function defineTheme<const S extends ThemeSpec>(spec: S): S {
	return spec
}

type ThemeMetaMap<T extends readonly ThemeSpec[]> = { [K in T[number]["name"]]: ThemeMeta }

/**
 * Aggregate theme specs into the config the codegen + runtime consume — the one
 * required call, and the only place a spec is normalized (`selector` resolved from
 * `default` / `name`, meta split from the token bag). Pass `{ reset: [...] }` to lock
 * those namespaces to only your tokens (emits `--<ns>-*: initial`); by default every
 * namespace is additive.
 */
export function defineThemes<const T extends readonly ThemeSpec[]>(
	entries: T,
	options?: { reset?: readonly Namespace[] }
): { themes: ThemeMetaMap<T>; list: readonly Theme[]; reset?: readonly Namespace[] } {
	const list: Theme[] = entries.map(({ name, selector, scheme, default: isDefault, tokens }) => ({
		name,
		selector: resolveSelector(name, selector, isDefault),
		scheme,
		tokens,
	}))
	const themes = {} as Record<string, ThemeMeta>
	for (const t of list) themes[t.name] = { selector: t.selector, scheme: t.scheme }
	return { themes: themes as ThemeMetaMap<T>, list, reset: options?.reset }
}

// ── Generation ──────────────────────────────────────────────────────────────

interface SubProp {
	/** Suffix on the Tailwind token, e.g. "" or "--line-height". */
	suffix: string
	/** Suffix on the `--th-*` variable, e.g. "" or "-line". */
	thSuffix: string
	value: string
}

interface NamespaceDef {
	/** Canonical `@theme` var prefix + utility namespace, e.g. "color" → `--color-*`. */
	ns: string
	/** Utility prefix to safelist for dynamically-built classes, or null. */
	safelist: string | null
	comment: string
	subProps: (value: never) => SubProp[]
}

const single = (value: string | number): SubProp[] => [{ suffix: "", thSuffix: "", value: String(value) }]

const textSubProps = (v: FontSizeValue): SubProp[] => {
	const out: SubProp[] = [{ suffix: "", thSuffix: "", value: v.rem }]
	if (v.line) out.push({ suffix: "--line-height", thSuffix: "-line", value: v.line })
	if (v.tracking) out.push({ suffix: "--letter-spacing", thSuffix: "-tracking", value: v.tracking })
	if (v.weight !== undefined) out.push({ suffix: "--font-weight", thSuffix: "-weight", value: String(v.weight) })
	return out
}

/**
 * The full Tailwind v4 namespace registry. Built-in namespaces get their
 * utilities from Tailwind for free — twgen only emits the `@theme` vars (plus the
 * per-theme `--th-*` swap and an optional safelist). A namespace is skipped
 * entirely if no theme defines tokens for it.
 */
const NAMESPACES: NamespaceDef[] = [
	{ ns: "color", safelist: "bg", comment: "Colors", subProps: single },
	{ ns: "font", safelist: null, comment: "Font family", subProps: single },
	{
		ns: "text",
		safelist: "text",
		comment: "Font size (+ paired line-height / letter-spacing / font-weight)",
		subProps: textSubProps,
	},
	{ ns: "font-weight", safelist: "font", comment: "Font weight", subProps: single },
	{ ns: "tracking", safelist: "tracking", comment: "Letter spacing", subProps: single },
	{ ns: "leading", safelist: "leading", comment: "Line height", subProps: single },
	{ ns: "tab-size", safelist: null, comment: "Tab size", subProps: single },
	{ ns: "breakpoint", safelist: null, comment: "Breakpoints", subProps: single },
	{ ns: "container", safelist: null, comment: "Containers", subProps: single },
	{ ns: "spacing", safelist: null, comment: "Spacing", subProps: single },
	{ ns: "radius", safelist: "rounded", comment: "Radius", subProps: single },
	{ ns: "shadow", safelist: "shadow", comment: "Shadow / elevation", subProps: single },
	{ ns: "inset-shadow", safelist: "inset-shadow", comment: "Inset shadow", subProps: single },
	{ ns: "drop-shadow", safelist: "drop-shadow", comment: "Drop shadow", subProps: single },
	{ ns: "blur", safelist: "blur", comment: "Blur", subProps: single },
	{ ns: "perspective", safelist: "perspective", comment: "Perspective", subProps: single },
	{ ns: "zoom", safelist: "zoom", comment: "Zoom", subProps: single },
	{ ns: "aspect", safelist: "aspect", comment: "Aspect ratio", subProps: single },
	{ ns: "ease", safelist: "ease", comment: "Easing", subProps: single },
	{ ns: "animate", safelist: "animate", comment: "Animation", subProps: single },
]

const subPropsOf = (def: NamespaceDef, value: unknown): SubProp[] => def.subProps(value as never)

/** A theme's tokens for a namespace (by canonical key). */
function familyTokens(theme: Theme, def: NamespaceDef): Record<string, unknown> {
	return ((theme.tokens as Record<string, unknown>)[def.ns] ?? {}) as Record<string, unknown>
}

function buildVariants(schemes: Scheme[]): string {
	const uniq = [...new Set(schemes)]
	return uniq.map((s) => `@custom-variant is-${s} (&:where(.scheme-${s}, .scheme-${s} *));`).join("\n")
}

const HEADER = "/* AUTO-GENERATED by twgen — do not edit; regenerated from your tokens. */"

/** Generate the full theme stylesheet (variants + palette + @theme + safelist). */
export function generateTheme(config: ThemesConfig): string {
	const themes = config.list
	if (themes.length === 0) throw new Error("twgen: no themes defined")
	const defaults = themes.filter((t) => t.selector === ":root")
	if (defaults.length === 0)
		throw new Error('twgen: no default theme — mark exactly one theme `default: true` (or give it selector ":root")')
	if (defaults.length > 1)
		throw new Error('twgen: more than one default theme — only one theme may be `default: true` (selector ":root")')
	const base = defaults[0]
	const resetSet = new Set<string>(config.reset ?? [])

	const thLines: Record<string, string[]> = {}
	for (const t of themes) thLines[t.name] = []

	const themeSections: string[] = []
	const resets: string[] = []
	const safelist: string[] = []

	for (const def of NAMESPACES) {
		const baseFamily = familyTokens(base, def)
		const keys = Object.keys(baseFamily)
		const known = new Set(keys)

		// Every token used by a non-default theme must exist in the default theme,
		// so promoted vars always have a base value to fall back to.
		for (const t of themes) {
			for (const k of Object.keys(familyTokens(t, def))) {
				if (!known.has(k)) {
					throw new Error(`twgen: ${def.ns} token "${k}" is set in theme "${t.name}" but missing from the default theme`)
				}
			}
		}
		if (keys.length === 0) continue

		if (resetSet.has(def.ns)) resets.push(`--${def.ns}-*: initial;`)
		if (def.safelist) safelist.push(`@source inline("${def.safelist}-{${keys.join(",")}}");`)

		const lines: string[] = [`\t/* ${def.comment} */`]
		for (const key of keys) {
			for (const sub of subPropsOf(def, baseFamily[key])) {
				const defaultValue = sub.value
				let varies = false
				const overrides: { name: string; value: string }[] = []

				for (const t of themes) {
					if (t.name === base.name) continue
					const fm = familyTokens(t, def)
					if (!(key in fm)) continue // inherits default via the cascade
					const match = subPropsOf(def, fm[key]).find((s) => s.suffix === sub.suffix)
					if (!match || match.value === defaultValue) continue
					varies = true
					overrides.push({ name: t.name, value: match.value })
				}

				const prop = `--${def.ns}-${key}${sub.suffix}`
				if (varies) {
					const thVar = `--th-${def.ns}-${key}${sub.thSuffix}`
					lines.push(`\t${prop}: var(${thVar});`)
					thLines[base.name].push(`${thVar}: ${defaultValue};`)
					for (const o of overrides) thLines[o.name].push(`${thVar}: ${o.value};`)
				} else {
					lines.push(`\t${prop}: ${defaultValue};`)
				}
			}
		}
		themeSections.push(lines.join("\n"))
	}

	const palette = themes
		.map((t) => {
			const l = [`${t.selector} {`]
			for (const line of thLines[t.name]) l.push(`\t${line}`)
			l.push(`\tcolor-scheme: ${t.scheme};`)
			l.push("}")
			return l.join("\n")
		})
		.join("\n\n")

	const themeBlock: string[] = ["@theme {"]
	if (resets.length) {
		themeBlock.push("\t/* Reset namespaces we fully control, so only our tokens exist */")
		for (const r of resets) themeBlock.push(`\t${r}`)
		themeBlock.push("")
	}
	themeBlock.push(themeSections.join("\n\n"))
	themeBlock.push("}")

	const blocks = [
		HEADER,
		buildVariants(themes.map((t) => t.scheme)),
		palette,
		themeBlock.join("\n"),
		safelist.join("\n"),
	]
	return `${blocks.filter(Boolean).join("\n\n")}\n`
}
