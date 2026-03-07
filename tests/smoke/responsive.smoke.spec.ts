import { expect, test } from "@playwright/test";

const MOBILE_VIEWPORT = { width: 375, height: 667 };
const TABLET_VIEWPORT = { width: 768, height: 1024 };
const DESKTOP_VIEWPORT = { width: 1280, height: 720 };

test.describe("desktop layout (1280x720)", () => {
	test.use({ viewport: DESKTOP_VIEWPORT });

	test("package sidebar is visible inline", async ({ page }) => {
		await page.goto("/");
		await page.waitForTimeout(1000);

		const desktopSidebar = page.locator("[data-instanceid='desktop-packages']");
		await expect(desktopSidebar).toBeVisible();

		const packagesToggle = page.getByLabel("Toggle packages panel");
		await expect(packagesToggle).toBeHidden();
	});

	test("sidebar resize handle is visible", async ({ page }) => {
		await page.goto("/");
		await page.waitForTimeout(1000);

		const sidebarResizer = page.getByLabel("Resize package sidebar");
		await expect(sidebarResizer).toBeVisible();

		const bothResizer = page.getByLabel("Resize console and sidebar");
		await expect(bothResizer).toBeVisible();
	});

	test("toolbar buttons are visible", async ({ page }) => {
		await page.goto("/");
		await page.waitForTimeout(1000);

		await expect(page.getByTitle("Run (Cmd+Enter)")).toBeVisible();
		await expect(page.getByLabel("Copy share URL")).toBeVisible();
		await expect(page.getByLabel(/Switch to (light|dark) theme/)).toBeVisible();
		await expect(page.getByLabel("Open GitHub repository")).toBeVisible();
	});

	test("editor and console are both visible", async ({ page }) => {
		await page.goto("/");
		await page.waitForTimeout(1000);

		const editor = page.locator(".monaco-editor").first();
		await expect(editor).toBeVisible();

		const consoleResizer = page.getByLabel("Resize console height");
		await expect(consoleResizer).toBeVisible();
	});
});

test.describe("tablet layout (768x1024)", () => {
	test.use({ viewport: TABLET_VIEWPORT });

	test("package sidebar is visible at md breakpoint", async ({ page }) => {
		await page.goto("/");
		await page.waitForTimeout(1000);

		const desktopSidebar = page.locator("[data-instanceid='desktop-packages']");
		await expect(desktopSidebar).toBeVisible();

		const packagesToggle = page.getByLabel("Toggle packages panel");
		await expect(packagesToggle).toBeHidden();
	});
});

test.describe("mobile layout (375x667)", () => {
	test.use({ viewport: MOBILE_VIEWPORT });

	test("package sidebar is hidden and toggle button is visible", async ({ page }) => {
		await page.goto("/");
		await page.waitForTimeout(1000);

		const desktopSidebar = page.locator("[data-instanceid='desktop-packages']");
		await expect(desktopSidebar).toBeHidden();

		const packagesToggle = page.getByLabel("Toggle packages panel");
		await expect(packagesToggle).toBeVisible();
	});

	test("sidebar resize handles are hidden", async ({ page }) => {
		await page.goto("/");
		await page.waitForTimeout(1000);

		const sidebarResizer = page.getByLabel("Resize package sidebar");
		await expect(sidebarResizer).toBeHidden();

		const bothResizer = page.getByLabel("Resize console and sidebar");
		await expect(bothResizer).toBeHidden();
	});

	test("packages panel opens as slide-over and can be closed", async ({ page }) => {
		await page.goto("/");
		await page.waitForTimeout(1000);

		await page.getByLabel("Toggle packages panel").click();

		const mobilePanel = page.locator("[data-instanceid='mobile-packages']");
		await expect(mobilePanel).toBeVisible();

		const backdrop = page.getByLabel("Close packages panel");
		await expect(backdrop).toBeVisible();

		await backdrop.click({ position: { x: 20, y: 300 } });
		await expect(mobilePanel).toBeHidden();
	});

	test("mobile packages panel has package input", async ({ page }) => {
		await page.goto("/");
		await page.waitForTimeout(1000);

		await page.getByLabel("Toggle packages panel").click();

		const mobilePanel = page.locator("[data-instanceid='mobile-packages']");
		await expect(mobilePanel).toBeVisible();

		const nameInput = mobilePanel.getByRole("textbox", { name: "Package name" });
		await expect(nameInput).toBeVisible();
	});

	test("toolbar buttons are visible on mobile", async ({ page }) => {
		await page.goto("/");
		await page.waitForTimeout(1000);

		await expect(page.getByTitle("Run (Cmd+Enter)")).toBeVisible();
		await expect(page.getByLabel("Copy share URL")).toBeVisible();
		await expect(page.getByLabel(/Switch to (light|dark) theme/)).toBeVisible();
	});

	test("editor fills available width", async ({ page }) => {
		await page.goto("/");
		await page.waitForTimeout(1000);

		const editor = page.locator(".monaco-editor").first();
		await expect(editor).toBeVisible();

		const editorBox = await editor.boundingBox();
		expect(editorBox).not.toBeNull();
		expect(editorBox!.width).toBeGreaterThan(300);
	});

	test("console resize handle spans full width", async ({ page }) => {
		await page.goto("/");
		await page.waitForTimeout(1000);

		const consoleResizer = page.getByLabel("Resize console height");
		await expect(consoleResizer).toBeVisible();

		const resizerBox = await consoleResizer.boundingBox();
		expect(resizerBox).not.toBeNull();
		expect(resizerBox!.width).toBeGreaterThan(300);
	});
});
