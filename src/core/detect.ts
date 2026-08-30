/** Document kinds this plugin can take over. */
export type DocKind = "json" | "jsonc" | "yaml";

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
	if (ext === "json") {
		return "json";
	}
	if (ext === "jsonc") {
		return "jsonc";
	}
	if (ext === "yaml" || ext === "yml") {
		return "yaml";
	}
	return null;
}
