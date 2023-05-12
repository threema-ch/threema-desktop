/**
 * When creating dynamic components with <svelte:component ...>, we sometimes pass in props that the
 * components don't actually use. This results in runtime warnings in the debug log.
 *
 * To avoid this, we can still define the props in the components, but that will result in "unused
 * variable" warnings that are currently not suppressable.
 *
 * This function can be used to avoid these linter warnings. It should only be used for props
 * ("export let ...") in Svelte components.
 */
export function unusedProp(...props: unknown[]): void {
    // Nothing here
}
