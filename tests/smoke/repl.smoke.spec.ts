import { expect, test } from "@playwright/test";

test("boot, run, edit, rerun, and sync hash", async ({ page }) => {
	await page.goto("/");

	// Allow hydration and Monaco initialization before first interaction.
	await page.waitForTimeout(2000);

	const runButton = page.getByTitle("Run (Cmd+Enter)");
	await runButton.click();

	const terminalRows = page.locator(".xterm-rows");
	await expect(terminalRows).toContainText("Hello, world!");

	const editorContainer = page.locator(".monaco-editor").first();
	await editorContainer.click({ position: { x: 20, y: 20 } });
	await page.keyboard.press("ControlOrMeta+a");
	await page.keyboard.type("console.log('Smoke test pass')");

	await runButton.click();
	await expect(terminalRows).toContainText("Smoke test pass");

	await page.waitForTimeout(800);
	await expect(page).toHaveURL(/#.+/);
	await expect(page).not.toHaveURL(/\?pkg=/);
});
