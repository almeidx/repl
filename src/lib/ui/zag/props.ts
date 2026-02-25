import { normalizeProps } from "@zag-js/svelte";

export { normalizeProps as zagNormalizeProps };

export function getZagIds(scope: string, key: string): { id: string } {
	return { id: `${scope}-${key}` };
}
