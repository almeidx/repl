const CONNECT_SRC = [
	"'self'",
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

function buildContentSecurityPolicy(isDev: boolean): string {
	const connectSrc = isDev ? DEV_CONNECT_SRC : CONNECT_SRC;
	const scriptSrc = isDev ? "'self' 'unsafe-inline' 'unsafe-eval'" : "'self'";

	return [
		"default-src 'self'",
		"base-uri 'self'",
		"form-action 'self'",
		"frame-ancestors 'none'",
		"frame-src https://stackblitz.com https://*.stackblitz.com https://*.w-corp-staticblitz.com",
		"object-src 'none'",
		`script-src ${scriptSrc}`,
		"style-src 'self' 'unsafe-inline'",
		"img-src 'self' data: blob:",
		"font-src 'self'",
		"worker-src 'self' blob:",
		`connect-src ${connectSrc.join(" ")}`,
	].join("; ");
}

export function applySecurityHeaders(response: Response, isDev: boolean): void {
	response.headers.set("Cross-Origin-Embedder-Policy", "require-corp");
	response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
	response.headers.set("X-Content-Type-Options", "nosniff");
	response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
	response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()");
	response.headers.set("X-Frame-Options", "DENY");
	response.headers.set("Content-Security-Policy", buildContentSecurityPolicy(isDev));
}
