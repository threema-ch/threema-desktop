/**
 * Represents a nullable binding in Svelte. Note: This is a simple union type with `null`. The
 * reason this is necessary is because Svelte might set a binding to `null` if the referenced
 * element or component is not mounted.
 */
// eslint-disable-next-line @typescript-eslint/ban-types
export type SvelteNullableBinding<T> = T | null;

/**
 * Wraps a function with additional dependencies, so that Svelte will re-evaluate it if any of the
 * given dependencies change.
 *
 * Note: Calls to this function must always be in a reactive block (`$: reactive(...)`).)
 */
export function reactive<TReturn>(fn: () => TReturn, dependencies: unknown[]): TReturn {
    return fn();
}
