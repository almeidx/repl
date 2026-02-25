import { describe, expect, it } from "vitest";
import {
	MAX_SHARE_PACKAGES,
	sanitizeShareData,
	validatePackageSpec,
	normalizePackageName,
	normalizePackageVersion,
} from "../../src/lib/utils/validation";

describe("validation utils", () => {
	it("validates package specs", () => {
		expect(validatePackageSpec("lodash", "latest")).toEqual({ name: "lodash", version: "latest" });
		expect(validatePackageSpec("@types/node", "24.9.1")).toEqual({ name: "@types/node", version: "24.9.1" });
	});

	it("rejects invalid package names and versions", () => {
		expect(normalizePackageName("")).toBeNull();
		expect(normalizePackageName("../lodash")).toBeNull();
		expect(normalizePackageVersion("npm:evil")).toBeNull();
		expect(validatePackageSpec("lodash", "latest && rm -rf /")).toBeNull();
	});

	it("sanitizes decoded share payloads", () => {
		expect(sanitizeShareData({ code: { nested: true } })).toBeNull();

		const payload = sanitizeShareData({
			code: "console.log(1)",
			packages: [
				{ name: "lodash", version: "latest" },
				{ name: "lodash", version: "4.17.21" },
				{ name: "../bad", version: "1.0.0" },
			],
		});

		expect(payload).toEqual({
			code: "console.log(1)",
			packages: [{ name: "lodash", version: "4.17.21" }],
		});
	});

	it("caps package count in share payloads", () => {
		const packages = Array.from({ length: MAX_SHARE_PACKAGES + 3 }, (_, index) => ({
			name: `pkg-${index}`,
			version: "1.0.0",
		}));

		const payload = sanitizeShareData({
			code: "console.log(1)",
			packages,
		});

		expect(payload?.packages).toHaveLength(MAX_SHARE_PACKAGES);
	});
});
