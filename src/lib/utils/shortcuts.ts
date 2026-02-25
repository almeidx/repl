export type ShortcutAction = "closeMobilePackages" | "run" | "stop" | "clearConsole" | "share" | null;

export function shouldIgnoreGlobalShortcuts(target: EventTarget | null): boolean {
	if (!(target instanceof HTMLElement)) return false;
	if (target.isContentEditable) return true;

	const tagName = target.tagName.toLowerCase();
	return tagName === "input" || tagName === "textarea" || tagName === "select";
}

export function getShortcutAction(event: KeyboardEvent, isMobilePackagesOpen: boolean): ShortcutAction {
	if (event.key === "Escape" && isMobilePackagesOpen) {
		return "closeMobilePackages";
	}

	const isMeta = event.metaKey || event.ctrlKey;
	if (!isMeta) return null;

	if (event.key === "Enter") return "run";
	if (event.key === ".") return "stop";
	if (event.key.toLowerCase() === "k") return "clearConsole";
	if (event.shiftKey && event.key.toUpperCase() === "C") return "share";

	return null;
}
