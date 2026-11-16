import { expect, test, type Page } from "@playwright/test";

const hashOf = (payload: unknown) => btoa(JSON.stringify(payload));

/** Replaces the editor contents through Monaco's own input handling. */
async function typeCode(page: Page, code: string) {
	await page.locator(".monaco-editor .view-lines").click();
	await page.keyboard.press("ControlOrMeta+a");
	await page.keyboard.type(code);
}

const consoleText = (page: Page) => page.getByRole("region", { name: "Console" }).locator(".xterm-rows");

test("serves an isolated, prerendered page with a bundled editor", async ({ page }) => {
	const requests: string[] = [];
	page.on("request", (request) => requests.push(request.url()));

	const response = await page.goto("/");
	const headers = response!.headers();
	expect(headers["cross-origin-embedder-policy"]).toBe("require-corp");
	expect(headers["cross-origin-opener-policy"]).toBe("same-origin");
	expect(headers["x-frame-options"]).toBe("DENY");

	const csp = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute("content");
	expect(csp).toContain("https://registry.npmjs.org");
	expect(csp).toContain("https://*.w-corp-staticblitz.com");

	await expect(page.locator(".monaco-editor .view-lines")).toContainText("Hello, world!");
	expect(await page.evaluate(() => crossOriginIsolated)).toBe(true);
	expect(requests.some((url) => url.includes("cdn.jsdelivr.net/npm/monaco-editor"))).toBe(false);
	// The WebContainer API loads on first run, not on page load.
	expect(requests.some((url) => url.includes("webcontainer"))).toBe(false);
});

test("runs, reruns, stops and keeps the code in the URL", async ({ page }) => {
	await page.goto("/");
	const run = page.getByRole("button", { name: "Run" });
	await expect(page.locator(".monaco-editor .view-lines")).toContainText("Hello, world!");

	await run.click();
	await expect(consoleText(page)).toContainText("Hello, world!");

	await typeCode(page, "console.log('second ' + (40 + 2))");
	await page.keyboard.press("ControlOrMeta+Enter");
	await expect(consoleText(page)).toContainText("second 42");
	await expect(consoleText(page)).not.toContainText("Hello, world!");

	await expect
		.poll(() => JSON.parse(atob(new URL(page.url()).hash.slice(1))))
		.toEqual({ code: "console.log('second ' + (40 + 2))" });

	await typeCode(page, "setInterval(() => console.log('tick'), 50)");
	await run.click();
	await expect(consoleText(page)).toContainText("tick");
	await page.getByRole("button", { name: "Stop" }).click();
	await expect(run).toBeEnabled();
});

test("installs a package after confirmation and makes it importable", async ({ page }) => {
	await page.goto("/");
	await page.getByRole("textbox", { name: "Package name" }).fill("ms");
	await page.getByRole("button", { name: "Add" }).click();

	const dialog = page.getByRole("dialog", { name: "Install package?" });
	await expect(dialog).toBeVisible();
	await expect(dialog.getByRole("checkbox", { name: /Allow lifecycle scripts/ })).not.toBeChecked();
	await dialog.getByRole("button", { name: "Install" }).click();
	await expect(dialog).toBeHidden();

	const installed = page.getByRole("list", { name: "Installed packages" });
	await expect(installed.getByText(/^\d+\.\d+\.\d+$/)).toBeVisible();

	await typeCode(page, "import ms from 'ms'; console.log(ms(60000))");
	await page.getByRole("button", { name: "Run" }).click();
	await expect(consoleText(page)).toContainText("1m");
	await expect.poll(() => JSON.parse(atob(new URL(page.url()).hash.slice(1))).packages?.[0]?.name).toBe("ms");
});

test("shared links restore code and ask before installing their packages", async ({ page }) => {
	await page.goto(`/#${hashOf({ code: "console.log('shared')", packages: [{ name: "lodash", version: "4.17.21" }] })}`);

	const dialog = page.getByRole("dialog", { name: "Install package?" });
	await expect(dialog).toBeVisible();
	await expect(dialog).toContainText("This shared link installs");
	await expect(dialog).toContainText("4.17.21");
	await dialog.getByRole("button", { name: "Cancel" }).click();
	await expect(dialog).toBeHidden();

	await expect(page.locator(".monaco-editor .view-lines")).toContainText("console.log('shared')");
	await expect(page.getByRole("list", { name: "Installed packages" })).toContainText("Nothing installed");
});

test("malformed shared links fall back to the default code", async ({ page }) => {
	const errors: string[] = [];
	page.on("pageerror", (error) => errors.push(error.message));

	await page.goto(`/#${hashOf({ code: { broken: true }, packages: [{ name: "lodash", version: "latest" }] })}`);
	await expect(page.locator(".monaco-editor .view-lines")).toContainText("Hello, world!");
	await expect(page.getByRole("dialog")).toBeHidden();
	expect(errors).toEqual([]);
});

test.describe("on a phone", () => {
	test.use({ viewport: { width: 375, height: 667 } });

	test("packages open as a sheet over the editor", async ({ page }) => {
		await page.goto("/");
		const panel = page.getByRole("complementary", { name: "Packages" });
		await expect(page.locator(".monaco-editor")).toBeVisible();
		await expect(panel).toBeHidden();
		await expect(page.getByRole("separator", { name: "Resize packages" })).toBeHidden();

		await page.getByRole("button", { name: "Packages", exact: true }).click();
		await expect(panel.getByRole("textbox", { name: "Package name" })).toBeVisible();
		await page.keyboard.press("Escape");
		await expect(panel).toBeHidden();
	});
});
