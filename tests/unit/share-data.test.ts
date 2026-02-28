import { describe, expect, it } from "vitest";
import { decodeShareData, encodeShareData, parsePackagesFromSearch } from "../../src/lib/utils/share-data";
import { MAX_SHARE_CODE_CHARS } from "../../src/lib/utils/validation";

describe("share-data utils", () => {
	it("encodes and decodes share payload with installed packages only", () => {
		const encoded = encodeShareData("console.log(1)", [
			{ name: "lodash", version: "4.17.21", status: "installed" },
			{ name: "bad-package", version: "1.0.0", status: "error" },
			{ name: "installing-package", version: "2.0.0", status: "installing" },
		]);

		expect(decodeShareData(encoded)).toEqual({
			code: "console.log(1)",
			packages: [{ name: "lodash", version: "4.17.21" }],
		});
	});

	it("returns null for invalid share data", () => {
		expect(decodeShareData("not-base64-data")).toBeNull();
	});

	it("rejects oversized share payloads during encoding", () => {
		expect(() => encodeShareData("x".repeat(MAX_SHARE_CODE_CHARS + 1), [])).toThrowError(RangeError);
	});

	it("returns null for payloads with invalid shape", () => {
		const invalidShape = btoa(JSON.stringify({ code: { invalid: true } }));
		expect(decodeShareData(invalidShape)).toBeNull();
	});

	it("parses packages from legacy search params including scoped packages", () => {
		expect(parsePackagesFromSearch("?pkg=lodash@4.17.21&pkg=@types/node@24.9.1&pkg=left-pad")).toEqual([
			{ name: "lodash", version: "4.17.21" },
			{ name: "@types/node", version: "24.9.1" },
			{ name: "left-pad", version: "latest" },
		]);
	});
});
