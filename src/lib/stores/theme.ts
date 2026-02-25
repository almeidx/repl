import { writable, get } from "svelte/store";

export type Theme = "dark" | "light";

export const theme = writable<Theme>("dark");
let systemThemeQuery: MediaQueryList | null = null;
let systemThemeListener: ((e: MediaQueryListEvent) => void) | null = null;

export function initTheme() {
  const stored = localStorage.getItem("theme");
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
    if (!localStorage.getItem("theme")) {
      setTheme(e.matches ? "dark" : "light");
    }
  };
  systemThemeQuery.addEventListener("change", systemThemeListener);
}

function setTheme(t: Theme) {
  theme.set(t);
  document.documentElement.classList.toggle("light", t === "light");
}

export function toggleTheme() {
  const currentTheme = get(theme);
  const newTheme = currentTheme === "dark" ? "light" : "dark";
  localStorage.setItem("theme", newTheme);
  setTheme(newTheme);
}
