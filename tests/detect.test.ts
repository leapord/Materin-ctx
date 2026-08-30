import { describe, expect, it } from "vitest";
import { detectKind } from "../src/core/detect";

describe("detectKind", () => {
	it("detects json by extension", () => {
		expect(detectKind("config.json")).toBe("json");
	});

	it("is case-insensitive", () => {
		expect(detectKind("CONFIG.JSON")).toBe("json");
		expect(detectKind("data.Yml")).toBe("yaml");
	});

	it("handles dotted file names", () => {
		expect(detectKind("my.config.json")).toBe("json");
	});

	it("detects yaml and yml", () => {
		expect(detectKind("a/b/c.yaml")).toBe("yaml");
		expect(detectKind("a.yml")).toBe("yaml");
	});

	it("detects jsonc", () => {
		expect(detectKind("settings.jsonc")).toBe("jsonc");
	});

	it("returns null for unknown extensions", () => {
		expect(detectKind("readme.md")).toBeNull();
	});

	it("returns null when there is no extension", () => {
		expect(detectKind("json")).toBeNull();
		expect(detectKind("a/b/Makefile")).toBeNull();
	});

	it("returns null for dotfiles without a real extension", () => {
		expect(detectKind(".json")).toBeNull();
		expect(detectKind(".yaml")).toBeNull();
	});
});
