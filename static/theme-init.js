// Applies the theme saved by `src/lib/settings.svelte.ts` (same `theme` key) before first paint.
(function () {
	let saved = null;
	try {
		saved = localStorage.getItem("theme");
	} catch {
		// Storage can be disabled; fall back to the system preference.
	}
	const system = window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
	document.documentElement.dataset.theme = saved === "light" || saved === "dark" ? saved : system;
})();
