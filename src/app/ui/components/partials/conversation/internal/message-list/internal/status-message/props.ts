import type {SvelteNullableBinding} from '~/app/ui/utils/svelte';
import type {IdentityString} from '~/common/network/types';

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

type AnyStatusMessageStatus =
    | GroupMemberChangeStatusMessageStatus
    | GroupNameChangeStatusMessageStatus;

export interface GroupMemberChangeStatusMessageStatus {
    readonly type: 'group-member-change';
    readonly added: IdentityString[];
    readonly removed: IdentityString[];
}

export interface GroupNameChangeStatusMessageStatus {
    readonly type: 'group-name-change';
    readonly oldName: string;
    readonly newName: string;
}
