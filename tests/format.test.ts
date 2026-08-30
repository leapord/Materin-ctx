import { describe, expect, it } from "vitest";
import { FormatError, formatJsonc, formatYaml } from "../src/core/format";
import { validateDocument } from "../src/core/validate";

const SPACE2 = { indentType: "space", indentSize: 2 } as const;
const SPACE4 = { indentType: "space", indentSize: 4 } as const;
const TAB = { indentType: "tab", indentSize: 4 } as const;

describe("formatJsonc", () => {
	it("re-indents compact JSON with two spaces", () => {
		expect(formatJsonc('{"a":1}', SPACE2)).toBe('{\n  "a": 1\n}');
	});

	it("honors a four-space indent", () => {
		expect(formatJsonc('{"a":1}', SPACE4)).toBe('{\n    "a": 1\n}');
	});

	it("honors tab indentation", () => {
		expect(formatJsonc('{"a":1}', TAB)).toBe('{\n\t"a": 1\n}');
	});

	it("preserves line and block comments", () => {
		const out = formatJsonc('// header\n{"a":1 /* trailing */}', SPACE2);
		expect(out).toContain("// header");
		expect(out).toContain("/* trailing */");
	});

	it("still re-indents broken JSON instead of throwing", () => {
		const out = formatJsonc('{"a":1', SPACE2);
		expect(out).toContain('"a"');
	});
});

describe("formatYaml", () => {
	it("normalizes indentation to the requested width", () => {
		expect(formatYaml("a:\n    b: 1", { ...SPACE2, lineWidth: 0 })).toBe(
			"a:\n  b: 1\n",
		);
	});

	it("preserves comments via the document round-trip", () => {
		const out = formatYaml("# top\na: 1 # inline", {
			...SPACE2,
			lineWidth: 0,
		});
		expect(out).toContain("# top");
		expect(out).toContain("# inline");
	});

	it("wraps long lines at the configured width", () => {
		const long = `msg: ${"word ".repeat(20).trim()}`;
		const out = formatYaml(long, { ...SPACE2, lineWidth: 20 });
		expect(out.split("\n").length).toBeGreaterThan(1);
	});

	it("does not wrap when lineWidth is 0", () => {
		const long = `msg: ${"word ".repeat(20).trim()}`;
		const out = formatYaml(long, { ...SPACE2, lineWidth: 0 });
		expect(out.split("\n")).toHaveLength(2); // content + trailing newline
	});

	it("falls back to spaces for YAML even when tabs are configured", () => {
		const out = formatYaml("a:\n        b: 1", { ...TAB, lineWidth: 0 });
		expect(out).not.toContain("\t");
		expect(out).toBe("a:\n    b: 1\n");
	});

	it("throws a FormatError with position info on parse failure", () => {
		try {
			formatYaml("ok: 1\nbad: [1, 2", { ...SPACE2, lineWidth: 0 });
			expect.unreachable("formatYaml should have thrown");
		} catch (err) {
			expect(err).toBeInstanceOf(FormatError);
			const formatError = err as FormatError;
			expect(formatError.line).toBeGreaterThanOrEqual(1);
			expect(formatError.column).toBeGreaterThanOrEqual(1);
		}
	});
});

describe("validateDocument", () => {
	it("accepts valid JSON", () => {
		expect(validateDocument('{"a": 1}', "json")).toEqual({ ok: true });
	});

	it("reports position for invalid JSON", () => {
		const result = validateDocument('{\n  "a": }\n', "json");
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.message.length).toBeGreaterThan(0);
			expect(result.line).toBe(2);
			expect(result.column).toBeGreaterThanOrEqual(1);
		}
	});

	it("rejects trailing commas in strict JSON but accepts them in JSONC", () => {
		expect(validateDocument('{"a": 1,}', "json").ok).toBe(false);
		expect(validateDocument('{"a": 1,}', "jsonc").ok).toBe(true);
	});

	it("accepts valid YAML", () => {
		expect(validateDocument("a: 1\nb: two", "yaml")).toEqual({ ok: true });
	});

	it("reports line for invalid YAML", () => {
		const result = validateDocument("ok: 1\nbad: [1, 2", "yaml");
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.line).toBe(2);
		}
	});
});
