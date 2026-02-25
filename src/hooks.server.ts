import type { Handle } from "@sveltejs/kit";
import { dev } from "$app/environment";
import { applySecurityHeaders } from "$lib/utils/security-headers";

export const handle: Handle = async ({ event, resolve }) => {
	const response = await resolve(event);

	applySecurityHeaders(response, dev);

	return response;
};
