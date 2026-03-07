export function applySecurityHeaders(response: Response): void {
	response.headers.set("Cross-Origin-Embedder-Policy", "require-corp");
	response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
	response.headers.set("X-Content-Type-Options", "nosniff");
	response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
	response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()");
	response.headers.set("X-Frame-Options", "DENY");
	response.headers.set(
		"Content-Security-Policy",
		"default-src 'self'; script-src 'self' blob:; style-src 'self' 'unsafe-inline'; worker-src 'self' blob:; connect-src 'self' https://registry.npmjs.org https://cdn.jsdelivr.net; img-src 'self' data:; font-src 'self'; frame-src 'none'",
	);
}
