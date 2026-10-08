import { readFileSync } from "node:fs";
import adapter from "@sveltejs/adapter-static";
import { sveltekit } from "@sveltejs/kit/vite";
import type { Config } from "@sveltejs/kit/vite";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, type Connect, type Plugin } from "vite";

type CspDirectives = NonNullable<NonNullable<Config["csp"]>["directives"]>;

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

// Single source of truth for response headers: the Cloudflare `_headers` file.
// Only the `/*` rule is used; the dev/preview servers apply it to every response.
function readSiteHeaders(): Record<string, string> {
	const headers: Record<string, string> = {};
	let inSiteRule = false;
	for (const line of readFileSync("static/_headers", "utf8").split("\n")) {
		if (!line.trim() || line.trimStart().startsWith("#")) continue;
		if (!/^\s/.test(line)) {
			inSiteRule = line.trim() === "/*";
			continue;
		}
		if (!inSiteRule) continue;
		const separator = line.indexOf(":");
		headers[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
	}
	return headers;
}

// `server.headers` does not reach SvelteKit-rendered documents, so set the headers
// in middleware registered ahead of SvelteKit's handlers.
function siteHeadersPlugin(): Plugin {
	const headers = readSiteHeaders();
	const applyHeaders: Connect.NextHandleFunction = (_req, res, next) => {
		for (const [name, value] of Object.entries(headers)) res.setHeader(name, value);
		next();
	};
	return {
		name: "site-headers",
		configureServer(server) {
			server.middlewares.use(applyHeaders);
		},
		configurePreviewServer(server) {
			server.middlewares.use(applyHeaders);
		},
	};
}

export default defineConfig({
	plugins: [
		siteHeadersPlugin(),
		tailwindcss(),
		sveltekit({
			preprocess: vitePreprocess(),
			csp: {
				mode: "auto",
				directives: {
					"default-src": ["self"],
					"base-uri": ["self"],
					"form-action": ["self"],
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
				fallback: "404.html",
			}),
		}),
	],
	optimizeDeps: {
		exclude: ["@webcontainer/api"],
	},
});
