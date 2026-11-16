# Agent guidance

repl is a SvelteKit application that runs TypeScript and JavaScript, with npm
packages, in a WebContainer (Node.js in the browser tab). It is fully static and
client-only, hosted as static assets on Cloudflare Workers. There is no
server-side code; keep it that way (no `hooks.server.ts`, server routes, or
server `load`).

Use `README.md` for product behavior and local setup, and `package.json` for the
current command list. Keep this file focused on constraints that are easy to
miss while changing the code.

## Runtime and security boundaries

- WebContainer lifecycle and process control belong in
  `src/lib/runtime.svelte.ts`. Keep boot lazy, keep runs and npm commands
  serialized, and make stop/timeout paths kill the active process.
- WebContainers require cross-origin isolation. All response headers, including
  COOP/COEP, live in `static/_headers`; `vite.config.ts` reads that file for the
  dev and preview servers, so edit only `static/_headers`.
- The CSP is emitted by SvelteKit as a `<meta>` tag from `vite.config.ts`. A
  conventional restrictive CSP breaks WebContainer service connections,
  workers, iframes, evaluation, or WASM. Do not change CSP or isolation headers
  without running `pnpm test:smoke`, which exercises a real run, package
  install, and stop against the built site.
- Monaco and xterm are bundled from npm and loaded lazily (`src/lib/monaco.ts`,
  `Console.svelte`); nothing loads from a CDN loader. Their workers must stay
  same-origin.
- Code and installed packages are encoded in the URL hash by
  `src/lib/share.ts`. That format is a shared-link compatibility boundary
  (legacy `?pkg=` links included) and must never be sent to a server.
- Every package name/version from user input or a shared link goes through
  `parseSpec` in `src/lib/npm.ts` before reaching `npm install` or a URL, and
  installs always ask for confirmation, with lifecycle scripts off by default.
- Monaco and xterm need explicit lifecycle cleanup; follow the existing
  wrappers. Follow the Svelte 5 patterns already used by neighboring code
  (rune classes in `.svelte.ts`, no stores) instead of introducing a second
  state-management style.

## Useful areas

- `src/lib/runtime.svelte.ts` — the reactive `runtime`: status, installed
  packages, run/stop/install/uninstall
- `src/lib/share.ts` — shared-link encoding
- `src/lib/npm.ts` — spec validation, versions and type declarations
- `src/lib/settings.svelte.ts` — theme, plus the editor/terminal colors that
  mirror `src/app.css`
- `src/lib/components/` — `Editor` (Monaco), `Console` (xterm),
  `PackagePanel`, `InstallDialog`, and the header shared with diff
- `static/_headers` — isolation and security headers

## Validation

```sh
pnpm lint
pnpm check
pnpm test
pnpm test:smoke  # browser/runtime or header changes
pnpm build       # bundling or Worker changes
```

Do not deploy unless the user explicitly asks.
