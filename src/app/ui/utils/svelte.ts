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
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function dependent<TFunction extends (...args: any[]) => any>(
    fn: TFunction,
    dependencies: unknown[],
    ...args: Parameters<TFunction>
): ReturnType<TFunction> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return fn(...args);
}
