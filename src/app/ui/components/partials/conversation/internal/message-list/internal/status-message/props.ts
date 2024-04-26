import type {AppServices} from '~/app/types';
import type {SvelteNullableBinding} from '~/app/ui/utils/svelte';
import type {StatusMessageType} from '~/common/enum';
import type {StatusMessageId} from '~/common/network/types';

// Every `StatusProp` needs to implement this interface. It defined the minimal information we need to display it in the frontend.
interface BaseStatusProps {
    readonly type: 'status';
    // A function that can interact with the viewmodel to trigger some functionality of the status (e.g start a call).
    readonly action?: () => Promise<void>;
    /**
     * Optional `HTMLElement` to use as the boundary for this message. This is used to constrain the
     * positioning of the context menu. Note: This is usually the chat view this status message is part of.
     */
    readonly boundary?: SvelteNullableBinding<HTMLElement>;
    readonly id: StatusMessageId;
    readonly information: {
        readonly at: Date;
        readonly text: string;
        readonly type: StatusMessageType;
    };
    readonly services: AppServices;
}

export type StatusMessageProps = GroupMemberChangeProps | GroupNameChangeProps;

export interface GroupMemberChangeProps extends BaseStatusProps {
    readonly information: {
        readonly at: Date;
        readonly text: string;
        readonly type: 'group-member-change';
    };
}

export interface GroupNameChangeProps extends BaseStatusProps {
    readonly information: {
        readonly at: Date;
        readonly text: string;
        readonly type: 'group-name-change';
    };
}
