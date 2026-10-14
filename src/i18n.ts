import { getLanguage } from "obsidian";

/** Chinese UI strings keyed by their English source text (gettext style). */
const zh = {
	"Format": "格式化",
	"Fold all": "全部折叠",
	"Unfold all": "全部展开",
	"Save": "保存",
	"Reload": "重载",
	"Format failed: line {line}, column {column} — {message}": "格式化失败：第 {line} 行第 {column} 列 — {message}",
	"Format failed: {message}": "格式化失败：{message}",
	"Already formatted": "格式无变化",
	"Formatted (unsaved)": "已格式化（未保存）",
	"Saved": "已保存",
	"Save failed: {message}": "保存失败：{message}",
	"Valid {kind} · {lines} lines": "{kind} 有效 · {lines} 行",
	"Line {line}, column {column} — {message} (click to jump)": "第 {line} 行第 {column} 列 — {message}（点击定位）",
	"File was modified on disk. Reloading will discard unsaved changes.": "文件已在磁盘上被修改。重载将丢弃未保存的改动。",
	"File was deleted or moved. Editor contents are read-only.": "文件已被删除或移动，编辑器内容仅供查看。",
	"Character used for indentation. YAML forbids tab indentation, so YAML formatting falls back to spaces.": "缩进字符。YAML 规范禁止 Tab 缩进，YAML 格式化会退回使用空格。",
	"Spaces": "空格",
	"Tab": "Tab",
	"Indent width (number of spaces, or tab width).": "缩进宽度（空格数或 Tab 宽度）。",
	"Visually wrap long lines (does not change the file contents).": "超长行自动换行显示（不影响文件内容）。",
	"Show line numbers in the editor gutter.": "在编辑器左侧显示行号。",
	"Fold all foldable nodes when a file is opened.": "打开文件时是否折叠所有可折叠节点。",
	"Don't fold": "不折叠",
	"Maximum line width when formatting YAML. 0 means unlimited.": "格式化 YAML 时的最大行宽，0 表示不限制。",
};

const locales: Record<string, Partial<Record<keyof typeof zh, string>>> = { zh };

function lang(): string {
	// getLanguage() exists from Obsidian 1.8.7; older builds fall back to English.
	return typeof getLanguage === "function" ? getLanguage().split("-")[0] : "en";
}

/**
 * Translates an English UI string into the app language, substituting
 * `{name}` placeholders. Unknown languages fall back to the English text.
 */
export function _(
	text: keyof typeof zh,
	vars: Record<string, string | number> = {},
): string {
	const s = locales[lang()]?.[text] ?? text;
	return s.replace(/\{(\w+)\}/g, (_, name: string) => String(vars[name] ?? ""));
}
