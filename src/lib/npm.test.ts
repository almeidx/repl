import { describe, expect, it } from "vitest";
import { parseSpec } from "./npm";

describe("parseSpec", () => {
	it("accepts names with dist-tags, versions and ranges", () => {
		expect(parseSpec(" lodash ")).toEqual({ name: "lodash", version: "latest" });
		expect(parseSpec("@types/node", "24.9.1")).toEqual({ name: "@types/node", version: "24.9.1" });
		expect(parseSpec("react", "^19")).toEqual({ name: "react", version: "^19" });
		expect(parseSpec("react", "canary")).toEqual({ name: "react", version: "canary" });
		expect(parseSpec("react", "")).toEqual({ name: "react", version: "latest" });
	});

	it("rejects anything npm would treat as a path, URL, alias or shell syntax", () => {
		expect(parseSpec("")).toBeNull();
		expect(parseSpec("../lodash")).toBeNull();
		expect(parseSpec("lodash", "npm:evil")).toBeNull();
		expect(parseSpec("lodash", "github:user/repo")).toBeNull();
		expect(parseSpec("lodash", "latest && rm -rf /")).toBeNull();
		expect(parseSpec("a".repeat(215))).toBeNull();
	});
});
