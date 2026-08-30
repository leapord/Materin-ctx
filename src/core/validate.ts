import { parse as parseJsonc, type ParseError } from "jsonc-parser";
import { parseDocument } from "yaml";
import type { DocKind } from "./detect";
import { offsetToPosition } from "./position";
import { yamlErrorToFormatError } from "./format";

export type ValidationResult =
	| { ok: true }
	| { ok: false; message: string; line: number; column: number };

/**
 * Syntax-checks a document without mutating it. json/jsonc are checked with
 * jsonc-parser (jsonc allows trailing commas); yaml goes through parseDocument.
 */
export function validateDocument(
	text: string,
	kind: DocKind,
): ValidationResult {
	if (kind === "yaml") {
		const doc = parseDocument(text);
		if (doc.errors.length === 0) {
			return { ok: true };
		}
		const error = yamlErrorToFormatError(text, doc.errors[0]);
		return {
			ok: false,
			message: error.message,
			line: error.line,
			column: error.column,
		};
	}
	const errors: ParseError[] = [];
	parseJsonc(text, errors, { allowTrailingComma: kind === "jsonc" });
	if (errors.length === 0) {
		return { ok: true };
	}
	// ParseError carries an error code only (a const enum — no reverse mapping
	// at runtime), so keep the message generic and lean on the position.
	const { line, column } = offsetToPosition(text, errors[0].offset);
	return {
		ok: false,
		message: "Invalid JSON syntax",
		line,
		column,
	};
}
