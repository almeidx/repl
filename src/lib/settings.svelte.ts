import { browser } from "$app/env";

export type Theme = "light" | "dark";

/** Colors for widgets that paint their own background (Monaco, xterm). */
export interface Surface {
	background: string;
	foreground: string;
	selection: string;
}

/** Preferences persisted per browser. `static/theme-init.js` reads the same `theme` key before first paint. */
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

	/** The current theme's colors, read from the palette in `app.css`; reactive like `theme`. */
	get surface(): Surface {
		void this.#theme; // Tracked; `set theme` updates `data-theme` first, so the computed style below matches.
		const style = getComputedStyle(document.documentElement);
		const color = (name: string) => toHex(style.getPropertyValue(name).trim());
		return { background: color("--bg"), foreground: color("--fg"), selection: color("--selection") };
	}
}

export const settings = new Settings();

let canvas: CanvasRenderingContext2D | null = null;

/**
 * Monaco only accepts `#rrggbb[aa]`, but the CSS minifier rewrites colors (`#ffffff` → `#fff`).
 * A canvas serializes any CSS color as `#rrggbb`, or `rgba(r, g, b, a)` when translucent.
 */
function toHex(color: string): string {
	canvas ??= document.createElement("canvas").getContext("2d")!;
	canvas.fillStyle = color;
	const normalized = String(canvas.fillStyle);
	if (normalized.startsWith("#")) return normalized;
	const [r = 0, g = 0, b = 0, a = 1] = normalized.match(/[\d.]+/g)?.map(Number) ?? [];
	return `#${[r, g, b, Math.round(a * 255)].map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}
