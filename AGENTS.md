# Agent Guidelines

## Project Overview

Browser-based TypeScript/JavaScript REPL using WebContainers for in-browser Node.js execution. Built with SvelteKit and deployed to Cloudflare Workers.

```
┌─────────────────────────────────────────┐
│  [Run] [Stop]              [Share] [☀/☾]│  <- Toolbar
├────────────────────┬────────────────────┤
│                    │  Package Search    │
│                    │  ┌──────────────┐  │
│   Monaco Editor    │  │ lodash@4.17  │  │
│   (TypeScript)     │  │ axios@1.6    │  │
│                    │  └──────────────┘  │
│                    │  [+ Add Package]   │
├────────────────────┴────────────────────┤
│   xterm.js Console                      │
│   (ANSI colors, clickable links)        │
└─────────────────────────────────────────┘
```

## Tech Stack

- **Framework**: SvelteKit with Svelte 5 (runes: `$state`, `$derived`, `$effect`, `$props`)
- **Editor**: Monaco Editor (loaded from CDN)
- **Terminal**: xterm.js with fit and web-links addons
- **Execution**: WebContainers API (StackBlitz)
- **Deployment**: Cloudflare Workers with Assets
- **Package Manager**: pnpm

## Project Structure

```
src/
├── routes/
│   ├── +page.svelte      # Main app page
│   └── +layout.svelte    # Root layout
├── lib/
│   ├── components/
│   │   ├── Editor.svelte        # Monaco editor wrapper
│   │   ├── Console.svelte       # xterm.js terminal
│   │   ├── Toolbar.svelte       # Run/Stop/Share buttons
│   │   └── PackageSidebar.svelte # NPM package manager UI
│   ├── stores/
│   │   ├── theme.ts      # Dark/light theme state
│   │   └── packages.ts   # Installed packages state
│   └── utils/
│       ├── webcontainer.ts # WebContainer lifecycle & execution
│       ├── sharing.ts      # URL hash encoding/decoding
│       └── npm.ts          # NPM registry API
├── hooks.server.ts       # COEP/COOP headers for SSR
├── app.css               # Global styles & CSS variables
├── app.html              # HTML template
├── app.d.ts              # TypeScript declarations
└── _headers              # Cloudflare headers for Cloudflare assets
```

## Key Concepts

### WebContainer Lifecycle

States: `idle` → `booting` → `ready` ↔ `running` (or `error`)

- Boot is lazy (triggered on first run or package install)
- `ensureBooted()` handles boot-on-demand
- 30-second execution timeout with automatic termination

### Cross-Origin Isolation

WebContainers require SharedArrayBuffer, which needs:

- `Cross-Origin-Embedder-Policy: require-corp`
- `Cross-Origin-Opener-Policy: same-origin`

Set in two places:

1. `hooks.server.ts` - for server-rendered responses
2. `_headers` (project root) - for Cloudflare assets

**Do NOT add a Content-Security-Policy (CSP) header.** WebContainers dynamically connect to StackBlitz service URLs, use internal iframes, `eval()`, and WASM — all of which are blocked by standard CSP directives. This has been attempted and reverted multiple times.

### URL State

Code and packages auto-sync to URL hash (500ms debounce). Format: base64-encoded JSON with `code` and `packages` fields.

### Theme System

CSS variables defined in `app.css`. Theme state in `theme.ts` store. Components subscribe explicitly to theme changes (not reactive `$theme`) for Monaco/xterm updates.

## Development Notes

- Monaco loaded from jsdelivr CDN (not npm) to avoid bundle size
- xterm.js installed via npm (CDN causes AMD loader conflicts with Monaco)
- Use explicit store subscriptions (`theme.subscribe()`) for non-Svelte libraries
- WebContainer pre-installs `tsx` for TypeScript execution

## Common Tasks

### Adding a new component

1. Create in `src/lib/components/`
2. Use Svelte 5 runes syntax
3. Define Props interface for type safety

### Modifying execution behavior

Edit `src/lib/utils/webcontainer.ts`. Key functions:

- `bootContainer()` - initial setup
- `runCode()` - execute user code
- `installPackageInContainer()` - npm install

### Changing UI layout

Main layout in `src/routes/+page.svelte`. Resizable panels use mouse event handlers with min/max constraints.

## Build & Deploy

```bash
pnpm build      # Build for production
pnpm deploy     # Build and deploy to Cloudflare
pnpm preview    # Test with wrangler locally
```

## Error Messages

- WebContainers boot failure: "Failed to start. Try refreshing the page."
- Package install failure: error message in console
- Execution timeout: "Execution timed out after 30 seconds"
- Execution error: stack trace in console

## Browser Requirements

- Modern Chromium-based browser (Chrome, Edge, Brave)
- Firefox support may be limited (WebContainers compatibility)
- Safari not officially supported (SharedArrayBuffer requirements)

## Non-Goals (Current Scope)

- Offline support
- npm registry search/autocomplete
- Multiple files/tabs
- Collaborative editing
- User accounts
- Persistent storage beyond URL
- Mobile-optimized layout

## Privacy

- No analytics or telemetry
- No cookies (localStorage for theme only)
- All code execution happens client-side
- No server-side logging of user code
