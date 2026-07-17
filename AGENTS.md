# Agent guidance

This project is a browser-based TypeScript/JavaScript REPL. SvelteKit provides
the UI, WebContainers execute code in the browser, and Cloudflare Workers serves
the application.

Use `README.md` for setup and user-facing behavior, and `package.json` for the
current scripts. The constraints below are the parts that should not be inferred
from a generic Svelte application.

## Runtime and security boundaries

- WebContainer lifecycle and process control belong in
  `src/lib/utils/webcontainer.ts`. Keep boot lazy and make stop/timeout paths
  clean up the active process.
- WebContainers require cross-origin isolation. Keep the COOP/COEP behavior in
  both `src/hooks.server.ts` and the Cloudflare `_headers` file aligned.
- A conventional restrictive CSP can break WebContainer service connections,
  workers, iframes, evaluation, or WASM. Do not change CSP or isolation headers
  without exercising a real browser run, package install, and stop/timeout.
- Monaco is loaded through the existing CDN integration; xterm is bundled from
  npm to avoid loader conflicts. Preserve that split unless a replacement is
  tested end to end.
- Code and package state are encoded in the URL hash. Treat that representation
  as a shared-link compatibility boundary and avoid sending user code to the
  server.
- Non-Svelte libraries such as Monaco and xterm need explicit lifecycle and
  subscription cleanup; follow the neighboring wrappers.

## Useful areas

- `src/lib/components/` — editor, console, toolbar, and package UI
- `src/lib/utils/webcontainer.ts` — browser runtime lifecycle
- `src/lib/utils/sharing.ts` — URL serialization
- `src/lib/utils/npm.ts` — registry access
- `src/hooks.server.ts` and `_headers` — isolation headers

## Validation

```sh
pnpm lint
pnpm check
pnpm test
pnpm test:smoke  # browser/runtime or header changes
pnpm build       # bundling or Worker changes
```

Do not deploy unless the user explicitly asks.
