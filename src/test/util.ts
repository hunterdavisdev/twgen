/**
 * Extract a block's body from theme-generated css output (:root, @theme, etc).
 * Assumes flat blocks (no nested braces) — true for every block twts emits.
 */
export function getBlock(css: string, selector: string): string {
	const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
	const m = css.match(new RegExp(`(?:^|\\n)${esc}\\s*\\{([^}]*)\\}`))
	if (!m) throw new Error(`no "${selector}" block in output`)
	return m[1]
}

/** Parse `--k: v;` declarations from a block body into a Map. */
export function parseDecls(block: string): Map<string, string> {
	const out = new Map<string, string>()
	for (const line of block.split("\n")) {
		const m = line.match(/^\s*(--[\w-]+)\s*:\s*(.+?);\s*$/)
		if (m) out.set(m[1], m[2])
	}
	return out
}
