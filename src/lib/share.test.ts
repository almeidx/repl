import { describe, expect, it } from "vitest";
import { decodeShare, encodeShare, MAX_SHARED_CODE, MAX_SHARED_PACKAGES } from "./share";

const hashOf = (payload: unknown) => btoa(JSON.stringify(payload));

describe("shared links", () => {
	it("keeps the existing wire format", () => {
		expect(encodeShare("console.log(1)", [])).toBe(hashOf({ code: "console.log(1)" }));
		expect(encodeShare("1", [{ name: "lodash", version: "4.17.21" }])).toBe(
			hashOf({ code: "1", packages: [{ name: "lodash", version: "4.17.21" }] }),
		);
	});

	it("round-trips non-ASCII code and scoped packages", () => {
		const code = "console.log('héllo 👋')";
		const packages = [{ name: "@types/node", version: "24.9.1" }];
		expect(decodeShare({ hash: `#${encodeShare(code, packages)}`, search: "" })).toEqual({ code, packages });
	});

	it("refuses to share oversized code", () => {
		expect(() => encodeShare("x".repeat(MAX_SHARED_CODE + 1), [])).toThrow(RangeError);
	});

	it("drops malformed payloads and invalid packages", () => {
		expect(decodeShare({ hash: "#not base64!", search: "" })).toEqual({ code: null, packages: [] });
		expect(
			decodeShare({
				hash: hashOf({ code: { nested: true }, packages: [{ name: "lodash", version: "1.0.0" }] }),
				search: "",
			}),
		).toEqual({ code: null, packages: [] });
		expect(
			decodeShare({
				hash: hashOf({
					code: "",
					packages: [
						{ name: "lodash", version: "latest" },
						{ name: "../evil", version: "1.0.0" },
						null,
						{ name: "lodash", version: "4.17.21" },
					],
				}),
				search: "",
			}),
		).toEqual({ code: "", packages: [{ name: "lodash", version: "4.17.21" }] });
	});

	it("caps the number of packages", () => {
		const packages = Array.from({ length: MAX_SHARED_PACKAGES + 3 }, (_, i) => ({
			name: `pkg-${i}`,
			version: "1.0.0",
		}));
		expect(decodeShare({ hash: hashOf({ code: "", packages }), search: "" }).packages).toHaveLength(
			MAX_SHARED_PACKAGES,
		);
	});

	it("reads legacy ?pkg= links, with hash packages taking precedence", () => {
		expect(
			decodeShare({
				hash: hashOf({ code: "x", packages: [{ name: "lodash", version: "4.17.21" }] }),
				search: "?pkg=lodash@1.0.0&pkg=@types/node@24.9.1&pkg=left-pad&pkg=bad;rm",
			}),
		).toEqual({
			code: "x",
			packages: [
				{ name: "lodash", version: "4.17.21" },
				{ name: "@types/node", version: "24.9.1" },
				{ name: "left-pad", version: "latest" },
			],
		});
	});
});
