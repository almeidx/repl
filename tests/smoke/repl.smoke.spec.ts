import { expect, test } from "@playwright/test";

function encodeSharePayload(payload: unknown): string {
	return btoa(JSON.stringify(payload));
}

test("boot, run, edit, rerun, and sync hash without external Monaco CDN", async ({ page }) => {
	const requests: string[] = [];
	page.on("request", (request) => {
		requests.push(request.url());
	});

	await page.goto("/");
	await page.waitForTimeout(2000);

	expect(requests.some((url) => url.includes("cdn.jsdelivr.net/npm/monaco-editor"))).toBeFalsy();
	expect(requests.some((url) => url.includes("webcontainer+api"))).toBeFalsy();

	const runButton = page.getByTitle("Run (Cmd+Enter)");
	await runButton.click();

	const consoleOutput = page.getByTestId("console-output");
	await expect(consoleOutput).toContainText("Hello, world!");

	await expect.poll(() => requests.some((url) => url.includes("webcontainer+api"))).toBeTruthy();

	const editorContainer = page.locator(".monaco-editor").first();
	await editorContainer.click({ position: { x: 20, y: 20 } });
	await page.keyboard.press("ControlOrMeta+a");
	await page.keyboard.type("console.log('Smoke test pass')");

	await runButton.click();
	await expect(consoleOutput).toContainText("Smoke test pass");

	await page.waitForTimeout(800);
	await expect(page).toHaveURL(/#.+/);
	await expect(page).not.toHaveURL(/\?pkg=/);
});

test("malformed share payload does not crash and falls back to default code", async ({ page }) => {
	const pageErrors: string[] = [];
	page.on("pageerror", (error) => pageErrors.push(String(error)));

	const malformedHash = encodeSharePayload({
		code: { broken: true },
		packages: [{ name: "lodash", version: "latest" }],
	});

	await page.goto(`/#${malformedHash}`);
	await page.waitForTimeout(1500);

	const runButton = page.getByTitle("Run (Cmd+Enter)");
	await expect(runButton).toBeVisible();
	await runButton.click();
	await expect(page.getByTestId("console-output")).toContainText("Hello, world!");
	expect(pageErrors.filter((message) => !message.includes("inmemory://model/1"))).toHaveLength(0);
});

test("shared-link package install requires explicit confirmation", async ({ page }) => {
	const shareHash = encodeSharePayload({
		code: "console.log('shared')",
		packages: [{ name: "lodash", version: "latest" }],
	});

	await page.goto(`/#${shareHash}`);

	await expect(page.getByRole("heading", { name: "Confirm Package Install" })).toBeVisible();
	await expect(page.getByText(/Installing from shared link/i)).toBeVisible();
	await page.getByRole("button", { name: "Cancel" }).click();
	await expect(page.getByRole("heading", { name: "Confirm Package Install" })).toBeHidden();
});

test("manual package add prompts for lifecycle-script permission", async ({ page }) => {
	await page.goto("/");
	await page.waitForTimeout(1000);

	await page.getByRole("textbox", { name: "Package name" }).fill("lodash");
	await page.getByRole("button", { name: "Add" }).click();

	await expect(page.getByRole("heading", { name: "Confirm Package Install" })).toBeVisible();
	await expect(page.getByRole("checkbox", { name: /Allow npm lifecycle scripts/i })).toBeVisible();
	await page.getByRole("button", { name: "Cancel" }).click();
	await expect(page.getByRole("heading", { name: "Confirm Package Install" })).toBeHidden();
});

test("toolbar and package controls expose accessible names", async ({ page }) => {
	await page.goto("/");
	await page.waitForTimeout(1000);

	await expect(page.getByRole("button", { name: "Copy share URL" })).toBeVisible();
	await expect(page.getByRole("button", { name: /Switch to (light|dark) theme/ })).toBeVisible();
	await expect(page.getByRole("textbox", { name: "Package name" })).toBeVisible();
	await expect(page.getByRole("combobox", { name: "Package version" })).toBeVisible();

	await page.getByRole("textbox", { name: "Package name" }).fill("lodash");
	await page.getByRole("button", { name: "Toggle package versions" }).click();
	await expect(page.getByRole("combobox", { name: "Package version" })).toHaveAttribute(
		"aria-expanded",
		/(true|false)/,
	);
});

test("security headers are returned for document responses", async ({ request }) => {
	const response = await request.get("/");
	expect(response.ok()).toBeTruthy();

	const headers = response.headers();
	expect(headers["cross-origin-embedder-policy"]).toBe("require-corp");
	expect(headers["cross-origin-opener-policy"]).toBe("same-origin");
	expect(headers["content-security-policy"]).toContain("default-src 'self'");
	expect(headers["x-content-type-options"]).toBe("nosniff");
	expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
});
