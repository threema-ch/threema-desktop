import type {SvelteNullableBinding} from '~/app/ui/utils/svelte';
import type {AnyStatusMessageStatus} from '~/common/viewmodel/conversation/main/message/status-message/store/types';

/**
 * Props accepted by the `StatusMessage` component.
 */
export interface StatusMessageProps {
    /**
     * Optional `HTMLElement` to use as the boundary for this message. This is used to constrain the
     * positioning of the context menu. Note: This is usually the chat view this status message is
     * part of.
     */
    readonly boundary?: SvelteNullableBinding<HTMLElement>;
    readonly status: AnyStatusMessageStatus;
}
