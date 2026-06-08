import adapter from "@sveltejs/adapter-cloudflare";
import { sveltekit } from "@sveltejs/kit/vite";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import type { Config } from "@sveltejs/kit";

type CspDirectives = NonNullable<NonNullable<NonNullable<Config["kit"]>["csp"]>["directives"]>;

const CONNECT_SRC = [
	"self",
	"https://registry.npmjs.org",
	"https://stackblitz.com",
	"https://*.w-corp-staticblitz.com",
	"https://c.staticblitz.com",
	"https://t.staticblitz.com",
	"https://nr.staticblitz.com",
	"https://cdn.jsdelivr.net",
] satisfies NonNullable<CspDirectives["connect-src"]>;

const DEV_CONNECT_SRC = [
	...CONNECT_SRC,
	"http://127.0.0.1:*",
	"http://localhost:*",
	"ws://127.0.0.1:*",
	"ws://localhost:*",
] satisfies NonNullable<CspDirectives["connect-src"]>;

const isDev = process.env.NODE_ENV === "development";

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			preprocess: vitePreprocess(),
			csp: {
				mode: "auto",
				directives: {
					"default-src": ["self"],
					"base-uri": ["self"],
					"form-action": ["self"],
					"frame-ancestors": ["none"],
					"frame-src": ["https://stackblitz.com", "https://*.stackblitz.com", "https://*.w-corp-staticblitz.com"],
					"object-src": ["none"],
					"script-src": isDev ? ["self", "unsafe-inline", "unsafe-eval"] : ["self"],
					"style-src": ["self", "unsafe-inline"],
					"img-src": ["self", "data:", "blob:"],
					"font-src": ["self"],
					"worker-src": ["self", "blob:"],
					"connect-src": isDev ? DEV_CONNECT_SRC : CONNECT_SRC,
				},
			},
			adapter: adapter({
				platformProxy: {
					environment: undefined,
					persist: {
						path: "./wrangler-local-state",
					},
				},
			}),
		}),
	],
	server: {
		headers: {
			"Cross-Origin-Embedder-Policy": "require-corp",
			"Cross-Origin-Opener-Policy": "same-origin",
		},
	},
	optimizeDeps: {
		exclude: ["@webcontainer/api"],
	},
});
