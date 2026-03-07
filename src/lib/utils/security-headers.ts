// WARNING: Do NOT add a Content-Security-Policy header here.
// WebContainers require dynamic connections to StackBlitz service URLs, use
// internal iframes, eval(), and WASM. A CSP breaks WebContainer boot/execution.
// This has been attempted and reverted multiple times.
export function applySecurityHeaders(response: Response): void {
	response.headers.set("Cross-Origin-Embedder-Policy", "require-corp");
	response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
	response.headers.set("X-Content-Type-Options", "nosniff");
	response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
	response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()");
	response.headers.set("X-Frame-Options", "DENY");
}
