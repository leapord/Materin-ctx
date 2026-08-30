import { applyEdits, format as jsoncFormat } from "jsonc-parser";
import { parseDocument } from "yaml";
import { offsetToPosition } from "./position";

/** Indentation options shared by every formatter. */
export interface IndentOptions {
	indentType: "space" | "tab";
	indentSize: number;
}

export interface YamlFormatOptions extends IndentOptions {
	/** Maximum line width; 0 disables wrapping. */
	lineWidth: number;
}

/** A formatting failure carrying a 1-based source position. */
export class FormatError extends Error {
	public readonly line: number;
	public readonly column: number;

	constructor(message: string, line: number, column: number) {
		super(message);
		this.name = "FormatError";
		this.line = line;
		this.column = column;
	}
}

/**
 * Re-indents JSON / JSONC. Error-tolerant and comment-preserving:
 * the text is re-indented in place, never re-serialized from a parse tree.
 */
export function formatJsonc(text: string, opts: IndentOptions): string {
	const edits = jsoncFormat(text, undefined, {
		insertSpaces: opts.indentType !== "tab",
		tabSize: opts.indentSize,
	});
	return applyEdits(text, edits);
}

/**
 * Re-indents YAML via a Document round-trip, which keeps comments intact.
 * YAML forbids tab indentation, so tab config falls back to indentSize spaces.
 */
export function formatYaml(text: string, opts: YamlFormatOptions): string {
	const doc = parseDocument(text);
	if (doc.errors.length > 0) {
		throw yamlErrorToFormatError(text, doc.errors[0]);
	}
	return doc.toString({
		indent: opts.indentSize,
		lineWidth: opts.lineWidth,
	});
}

/** Converts a yaml YAMLError (pos is a [start, end] offset tuple) into a FormatError. */
export function yamlErrorToFormatError(
	text: string,
	err: unknown,
): FormatError {
	const pos = (err as { pos?: unknown } | null)?.pos;
	let start = 0;
	if (Array.isArray(pos) && typeof pos[0] === "number") {
		start = pos[0];
	}
	const message = err instanceof Error ? err.message : String(err);
	const { line, column } = offsetToPosition(text, start);
	return new FormatError(message, line, column);
}
