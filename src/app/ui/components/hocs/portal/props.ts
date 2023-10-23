import type {SvelteNullableBinding} from '~/app/ui/utils/svelte';

/**
 * Props accepted by the `Portal` component.
 */
export interface PortalProps {
    /**
     * Hides the portal and its content. Note: The same result can also be achieved by simply
     * rendering the portal conditionally.
     */
    hidden?: boolean;
    /** The element to attach the portal content to. */
    target: SvelteNullableBinding<HTMLElement> | undefined;
}
