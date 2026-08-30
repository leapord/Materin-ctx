export interface SourcePosition {
	/** 1-based line number. */
	line: number;
	/** 1-based column number. */
	column: number;
}

export type Eol = "\r\n" | "\n";

export const BOM = "﻿";

/** Converts a character offset into a 1-based line/column position. */
export function offsetToPosition(text: string, offset: number): SourcePosition {
	const end = Math.max(0, Math.min(offset, text.length));
	let line = 1;
	let lineStart = 0;
	for (let i = 0; i < end; i++) {
		if (text.charCodeAt(i) === 10 /* \n */) {
			line += 1;
			lineStart = i + 1;
		}
	}
	return { line, column: end - lineStart + 1 };
}

/** Returns the EOL style of the first line break in the text (LF when none). */
export function detectEol(text: string): Eol {
	const lf = text.indexOf("\n");
	if (lf > 0 && text.charCodeAt(lf - 1) === 13 /* \r */) {
		return "\r\n";
	}
	return "\n";
}

/** Rewrites every line break (including lone \r) to the given EOL style. */
export function applyEol(text: string, eol: Eol): string {
	const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
	if (eol === "\n") {
		return normalized;
	}
	return normalized.replace(/\n/g, "\r\n");
}

/** Removes a leading byte-order mark if present. */
export function stripBom(text: string): string {
	return text.startsWith(BOM) ? text.slice(BOM.length) : text;
}
