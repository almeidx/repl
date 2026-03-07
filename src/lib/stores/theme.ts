import { writable, get } from "svelte/store";

export type Theme = "dark" | "light";

export const theme = writable<Theme>("dark");
let systemThemeQuery: MediaQueryList | null = null;
let systemThemeListener: ((e: MediaQueryListEvent) => void) | null = null;

function storageGetItem(key: string): string | null {
	try {
		return localStorage.getItem(key);
	} catch {
		return null;
	}
}

function storageSetItem(key: string, value: string): void {
	try {
		localStorage.setItem(key, value);
	} catch {
		// Storage unavailable (private browsing, quota exceeded, etc.)
	}
}

export function initTheme(): void {
	const stored = storageGetItem("theme");
	if (stored === "dark" || stored === "light") {
		setTheme(stored);
	} else {
		const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
		setTheme(prefersDark ? "dark" : "light");
	}

	if (systemThemeQuery && systemThemeListener) {
		systemThemeQuery.removeEventListener("change", systemThemeListener);
	}

	systemThemeQuery = window.matchMedia("(prefers-color-scheme: dark)");
	systemThemeListener = (e) => {
		if (!storageGetItem("theme")) {
			setTheme(e.matches ? "dark" : "light");
		}
	};
	systemThemeQuery.addEventListener("change", systemThemeListener);
}

function setTheme(t: Theme) {
	theme.set(t);
	document.documentElement.classList.toggle("light", t === "light");
}

export function toggleTheme(): void {
	const currentTheme = get(theme);
	const newTheme = currentTheme === "dark" ? "light" : "dark";
	storageSetItem("theme", newTheme);
	setTheme(newTheme);
}
