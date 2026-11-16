# repl

Run TypeScript and JavaScript, with npm packages, in a Node.js sandbox that lives in your browser tab.

## Usage

1. Write code in the editor. TypeScript runs as-is, through [tsx](https://tsx.is).
2. Run it. The first run boots a [WebContainer](https://webcontainers.io); output streams into the console. Runs stop after 30 seconds.
3. Add packages by name and version (defaults to `latest`). Every install asks first, with lifecycle scripts off unless you allow them. Their type declarations load into the editor.
4. Share. The link carries the code and installed packages in its `#hash`, so they never reach a server. Opening a shared link asks before installing its packages.

| Shortcut               | Action        |
| ---------------------- | ------------- |
| `Cmd/Ctrl + Enter`     | Run           |
| `Cmd/Ctrl + .`         | Stop          |
| `Cmd/Ctrl + K`         | Clear console |
| `Cmd/Ctrl + Shift + U` | Copy link     |

## Running Locally

Requires Node.js 24+ and pnpm.

```bash
pnpm install --frozen-lockfile
pnpm dev
```

| Command           | Description                                      |
| ----------------- | ------------------------------------------------ |
| `pnpm dev`        | Start development server                         |
| `pnpm build`      | Prerender the site into `build/`                 |
| `pnpm preview`    | Serve `build/` with Wrangler                     |
| `pnpm lint`       | Check lint rules and formatting                  |
| `pnpm fmt`        | Fix lint issues and format                       |
| `pnpm check`      | Type check                                       |
| `pnpm test`       | Run unit tests (Vitest)                          |
| `pnpm test:smoke` | Build, then run browser smoke tests (Playwright) |
| `pnpm run deploy` | Build and deploy static assets to Cloudflare     |

Smoke tests boot a real WebContainer and install from npm, so they need network access. Install the browser once with `pnpm exec playwright install chromium`.

## Hosting

The site is static assets on Cloudflare Workers, with no server code. WebContainers need cross-origin isolation, so `static/_headers` sets COOP/COEP; the dev server reads the same file. The CSP is a `<meta>` tag configured in `vite.config.ts` and allows `style-src 'unsafe-inline'` because Monaco and xterm inject styles at runtime.

## License

[GNU AGPLv3](LICENSE)
