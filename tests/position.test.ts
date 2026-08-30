import { describe, expect, it } from "vitest";
import {
	applyEol,
	detectEol,
	offsetToPosition,
	stripBom,
} from "../src/core/position";

describe("offsetToPosition", () => {
	it("returns 1-based line and column", () => {
		expect(offsetToPosition("ab\ncd", 0)).toEqual({ line: 1, column: 1 });
		expect(offsetToPosition("ab\ncd", 2)).toEqual({ line: 1, column: 3 });
	});

	it("moves to the next line after a newline", () => {
		expect(offsetToPosition("ab\ncd", 3)).toEqual({ line: 2, column: 1 });
		expect(offsetToPosition("ab\ncd", 4)).toEqual({ line: 2, column: 2 });
	});

	it("counts the \r of a CRLF pair as part of the previous line", () => {
		expect(offsetToPosition("a\r\nb", 2)).toEqual({ line: 1, column: 3 });
		expect(offsetToPosition("a\r\nb", 3)).toEqual({ line: 2, column: 1 });
		expect(offsetToPosition("a\r\nb", 4)).toEqual({ line: 2, column: 2 });
	});

	it("clamps out-of-range offsets to the end of the text", () => {
		expect(offsetToPosition("ab", 99)).toEqual({ line: 1, column: 3 });
	});
});

describe("detectEol", () => {
	it("detects CRLF on first occurrence", () => {
		expect(detectEol("a\r\nb\nc")).toBe("\r\n");
	});

	it("detects LF", () => {
		expect(detectEol("a\nb")).toBe("\n");
	});

	it("defaults to LF for empty or single-line text", () => {
		expect(detectEol("")).toBe("\n");
		expect(detectEol("abc")).toBe("\n");
	});
});

describe("applyEol", () => {
	it("rewrites LF text to CRLF", () => {
		expect(applyEol("a\nb\nc", "\r\n")).toBe("a\r\nb\r\nc");
	});

	it("leaves text untouched when the EOL already matches", () => {
		expect(applyEol("a\nb", "\n")).toBe("a\nb");
	});
});

describe("stripBom", () => {
	it("strips a leading BOM", () => {
		expect(stripBom("﻿{}")).toBe("{}");
	});

	it("keeps text without a BOM untouched", () => {
		expect(stripBom("{}")).toBe("{}");
	});
});
