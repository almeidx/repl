import { describe, expect, it } from "vitest";
import { getShortcutAction } from "../../src/lib/utils/shortcuts";

function keyboardEvent(overrides: Partial<KeyboardEvent>): KeyboardEvent {
	return {
		key: "",
		ctrlKey: false,
		metaKey: false,
		shiftKey: false,
		...overrides,
	} as KeyboardEvent;
}

describe("shortcut utils", () => {
	it("handles escape only when mobile packages panel is open", () => {
		expect(getShortcutAction(keyboardEvent({ key: "Escape" }), true)).toBe("closeMobilePackages");
		expect(getShortcutAction(keyboardEvent({ key: "Escape" }), false)).toBeNull();
	});

	it("maps run and stop shortcuts", () => {
		expect(getShortcutAction(keyboardEvent({ key: "Enter", ctrlKey: true }), false)).toBe("run");
		expect(getShortcutAction(keyboardEvent({ key: ".", metaKey: true }), false)).toBe("stop");
	});

	it("maps clear and share shortcuts with case-insensitive keys", () => {
		expect(getShortcutAction(keyboardEvent({ key: "K", metaKey: true }), false)).toBe("clearConsole");
		expect(getShortcutAction(keyboardEvent({ key: "c", ctrlKey: true, shiftKey: true }), false)).toBe("share");
	});

	it("returns null when no shortcut matches", () => {
		expect(getShortcutAction(keyboardEvent({ key: "a" }), false)).toBeNull();
	});
});
