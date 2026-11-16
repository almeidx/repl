import { defineConfig } from "@playwright/test";

export default defineConfig({
	testDir: "./tests/e2e",
	testMatch: "*.smoke.spec.ts",
	// Booting a WebContainer downloads Node.js and installs tsx from npm.
	timeout: 180_000,
	expect: {
		timeout: 120_000,
	},
	retries: process.env.CI ? 1 : 0,
	workers: process.env.CI ? 1 : undefined,
	reporter: process.env.CI ? [["github"], ["list"]] : "list",
	use: {
		baseURL: "http://127.0.0.1:4173",
		trace: "retain-on-failure",
	},
	webServer: {
		// Build then serve the real static-asset server (wrangler dev, assets-only):
		// exercises the prerendered page, its CSP and the `_headers` cross-origin isolation.
		command: "pnpm build && pnpm exec wrangler dev --port 4173",
		url: "http://127.0.0.1:4173",
		reuseExistingServer: !process.env.CI,
		timeout: 180_000,
	},
});
