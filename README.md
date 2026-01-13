# repl

A browser-based TypeScript/JavaScript REPL powered by WebContainers.

## Features

- Monaco editor with TypeScript support
- In-browser Node.js execution via WebContainers
- NPM package installation with version picker
- xterm.js console with ANSI colors and clickable links
- Dark/light theme with system preference detection
- Shareable URLs (code stored in URL hash)
- Resizable panels

## Requirements

- Node.js 24+
- pnpm

## Setup

```bash
pnpm install --frozen-lockfile
```

## Development

```bash
pnpm dev
```

Open http://localhost:5173

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Build for production |
| `pnpm preview` | Preview with Wrangler locally |
| `pnpm run deploy` | Build and deploy to Cloudflare |
| `pnpm check` | Run type checking |

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + Enter` | Run code |
| `Cmd/Ctrl + .` | Stop execution |
| `Cmd/Ctrl + K` | Clear console |
| `Cmd/Ctrl + Shift + C` | Copy share URL |

## Deployment

Deployed to Cloudflare Workers. Requires:

1. Cloudflare account
2. `wrangler` CLI authenticated (`wrangler login`)

```bash
pnpm run deploy
```

## Architecture

- **SvelteKit** - Framework
- **Svelte 5** - UI with runes syntax
- **Monaco Editor** - Code editing (CDN)
- **xterm.js** - Terminal emulation
- **WebContainers** - Browser-based Node.js runtime
- **Cloudflare Workers** - Edge deployment

## License

[MIT](LICENSE.md)
