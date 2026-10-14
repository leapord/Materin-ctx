/** Document kinds this plugin can take over. */
export type DocKind = "json" | "jsonc" | "yaml";

/** File extensions this plugin claims, mapped to their document kind. */
export const EXTENSION_KINDS: Record<string, DocKind> = {
	json: "json",
	jsonc: "jsonc",
	yaml: "yaml",
	yml: "yaml",
};

/**
 * Maps a vault file path to the document kind handled by this plugin.
 * Returns null for files the plugin should not claim.
 */
export function detectKind(path: string): DocKind | null {
	const base = path.split("/").pop() ?? "";
	if (base.startsWith(".")) {
		// dotfiles such as ".json" carry no real extension
		return null;
	}
	const dot = base.lastIndexOf(".");
	if (dot < 0) {
		return null;
	}
	const ext = base.slice(dot + 1).toLowerCase();
	return EXTENSION_KINDS[ext] ?? null;
}
