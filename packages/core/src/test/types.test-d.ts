/**
 * Type-level tests — the types are half the product. Not run by `bun test`
 * (the filename doesn't match `*.test.ts`); enforced by `bun run typecheck`,
 * which type-checks everything under `src`. A failed assertion (a wrong
 * `Equal`, or an `@ts-expect-error` that no longer errors) fails the typecheck.
 */
import { defineTheme, defineThemes, defineTokens, type Namespace } from "../index"

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false
type Expect<T extends true> = T

// ── Theme-name union is derived exactly from the specs ───────────────────────
const cfg = defineThemes([
	{ name: "light", scheme: "light", default: true, tokens: {} },
	{ name: "dark", scheme: "dark", tokens: {} },
])
export type _Names = Expect<Equal<keyof typeof cfg.themes, "light" | "dark">>

// ── Namespace is the union of ThemeTokens keys ───────────────────────────────
export type _Namespace = Expect<Equal<Extract<Namespace, "color" | "radius">, "color" | "radius">>

// ── Negative: a typo'd namespace is a compile error ──────────────────────────
defineTheme({
	name: "x",
	scheme: "light",
	// @ts-expect-error — "colors" is not a Tailwind namespace (it's "color")
	tokens: { colors: { primary: "red" } },
})

// ── Negative: an invalid scheme is a compile error ───────────────────────────
// @ts-expect-error — scheme must be "light" | "dark"
defineTheme({ name: "x", scheme: "blue", tokens: {} })

// ── Negative: reset accepts only valid namespace names ───────────────────────
defineThemes([{ name: "light", scheme: "light", default: true, tokens: {} }], {
	// @ts-expect-error — "radiuss" is not a valid namespace
	reset: ["radiuss"],
})

// ── defineTokens preserves literal token names for keyof derivation ───────────
const tokens = defineTokens({ color: { primary: "red", accent: "blue" } })
export type _TokenNames = Expect<Equal<keyof (typeof tokens)["color"], "primary" | "accent">>
