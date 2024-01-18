import type {SvelteNullableBinding} from '~/app/ui/utils/svelte';

/**
 * Props accepted by the `MessageContextMenuProvider` component.
 */
export interface MessageContextMenuProviderProps {
    /**
     * Optional `HTMLElement` to use as the boundary for this message. This is used to constrain the
     * positioning of the context menu. Note: This is usually the chat view this message is part of.
     */
    readonly boundary?: SvelteNullableBinding<HTMLElement>;
    /**
     * Which options to render in the context menu, if available.
     */
    readonly enabledOptions: {
        readonly copyLink: boolean;
        readonly copySelection: boolean;
        readonly copyImage: boolean;
        readonly copy: boolean;
        readonly saveAsFile: boolean;
        readonly acknowledge:
            | false
            | {
                  used: boolean;
              };
        readonly decline:
            | false
            | {
                  used: boolean;
              };
        readonly quote: boolean;
        readonly forward: boolean;
        readonly openDetails: boolean;
        readonly deleteMessage: boolean;
    };
    /**
     * On which side of the message the context menu should be placed. Note: If it is opened using a
     * right click, the context menu will always be placed at the mouse's location.
     */
    readonly placement: 'left' | 'right';
}
