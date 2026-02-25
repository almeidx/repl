import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
	testDir: "./tests/smoke",
	fullyParallel: false,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	workers: process.env.CI ? 1 : undefined,
	timeout: 180_000,
	expect: {
		timeout: 120_000,
	},
	reporter: process.env.CI ? [["github"], ["list"]] : "list",
	use: {
		baseURL: "http://127.0.0.1:44173",
		trace: "retain-on-failure",
	},
	projects: [
		{
			name: "chromium",
			use: { ...devices["Desktop Chrome"] },
		},
	],
	webServer: {
		command: "pnpm dev --host 127.0.0.1 --port 44173",
		url: "http://127.0.0.1:44173",
		reuseExistingServer: false,
		timeout: 180_000,
	},
});
