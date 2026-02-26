import adapter from "@sveltejs/adapter-cloudflare";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

const CONNECT_SRC = [
	"self",
	"https://registry.npmjs.org",
	"https://stackblitz.com",
	"https://*.w-corp-staticblitz.com",
	"https://c.staticblitz.com",
	"https://t.staticblitz.com",
	"https://nr.staticblitz.com",
	"https://cdn.jsdelivr.net",
];

const DEV_CONNECT_SRC = [
	...CONNECT_SRC,
	"http://127.0.0.1:*",
	"http://localhost:*",
	"ws://127.0.0.1:*",
	"ws://localhost:*",
];

const isDev = process.env.NODE_ENV === "development";

/** @type {import('@sveltejs/kit').Config} */
export default {
	preprocess: vitePreprocess(),
	kit: {
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
				persist: "./wrangler-local-state",
			},
		}),
	},
};
