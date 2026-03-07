const DEFAULT_FETCH_TIMEOUT_MS = 10_000;

export async function fetchWithTimeout(
	input: RequestInfo | URL,
	init: RequestInit = {},
	timeoutMs: number = DEFAULT_FETCH_TIMEOUT_MS,
): Promise<Response> {
	const controller = new AbortController();
	const timeout = setTimeout(() => {
		controller.abort(new DOMException("Request timed out", "TimeoutError"));
	}, timeoutMs);

	let removeParentAbortListener: (() => void) | null = null;
	if (init.signal) {
		if (init.signal.aborted) {
			clearTimeout(timeout);
			throw init.signal.reason ?? new DOMException("The operation was aborted", "AbortError");
		}

		const onAbort = () => {
			controller.abort(init.signal?.reason);
		};
		init.signal.addEventListener("abort", onAbort, { once: true });
		removeParentAbortListener = () => init.signal?.removeEventListener("abort", onAbort);
	}

	try {
		return await fetch(input, {
			...init,
			signal: controller.signal,
		});
	} finally {
		clearTimeout(timeout);
		removeParentAbortListener?.();
	}
}
