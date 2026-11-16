import { browser } from "$app/env";

export type Theme = "light" | "dark";

/** Editor and terminal colors; they draw their own backgrounds, so these mirror `--bg`/`--fg` in app.css. */
export const surfaces: Record<Theme, { background: string; foreground: string; selection: string }> = {
	light: { background: "#ffffff", foreground: "#0a0a0a", selection: "#009fff40" },
	dark: { background: "#0a0a0a", foreground: "#fafafa", selection: "#009fff55" },
};

/** Preferences persisted per browser. `static/theme-init.js` applies the theme before first paint. */
class Settings {
	#theme = $state<Theme>(browser && document.documentElement.dataset.theme === "light" ? "light" : "dark");

	get theme(): Theme {
		return this.#theme;
	}

	set theme(value: Theme) {
		this.#theme = value;
		document.documentElement.dataset.theme = value;
		try {
			localStorage.setItem("theme", value);
		} catch {
			// Storage can be disabled; the theme still applies for this page.
		}
	}
}

export const settings = new Settings();
