import type {AppServices} from '~/app/types';
import type {MessageProps as BasicMessageProps} from '~/app/ui/components/molecules/message/props';
import type {MessageContextMenuProviderProps} from '~/app/ui/components/partials/conversation/internal/message-list/internal/message-context-menu-provider/props';
import type {MessageDetailsModalProps} from '~/app/ui/components/partials/conversation/internal/message-list/internal/message-details-modal/props';
import type {SvelteNullableBinding} from '~/app/ui/utils/svelte';
import type {SanitizeAndParseTextToHtmlOptions} from '~/app/ui/utils/text';
import type {DbContactUid} from '~/common/db';
import type {StatusMessageType} from '~/common/enum';
import type {MessageId, StatusMessageId} from '~/common/network/types';
import type {FileMessageDataState} from '~/common/viewmodel/types';
import type {AnyReceiverData} from '~/common/viewmodel/utils/receiver';

/**
 * Props accepted by the `Message` component.
 */
export interface MessageProps {
    readonly type: 'message';
    readonly actions: {
        readonly acknowledge: () => Promise<void>;
        readonly decline: () => Promise<void>;
        readonly edit: (newText: string) => Promise<void>;
    };
    readonly boundary?: MessageContextMenuProviderProps['boundary'];
    readonly conversation: {
        readonly receiver: AnyReceiverData;
        readonly isEditingSupported: boolean;
    };
    readonly direction: BasicMessageProps['direction'];
    readonly file?: Omit<NonNullable<BasicMessageProps['file']>, 'thumbnail'> & {
        readonly sync: {
            /**
             * Whether the message content (i.e. file data) has been synced.
             */
            readonly state: FileMessageDataState['type'];
            /**
             * The sync direction for unsynced or syncing messages.
             */
            readonly direction: 'upload' | 'download' | undefined;
        };
        readonly thumbnail?: Omit<
            NonNullable<NonNullable<BasicMessageProps['file']>['thumbnail']>,
            'blobStore'
        >;
    };
    /**
     * Whether to play an animation to bring attention to the message. Resets to `false` when the
     * animation is completed.
     */
    readonly highlighted?: BasicMessageProps['highlighted'];
    readonly history: MessageDetailsModalProps['history'];
    readonly id: MessageId;
    readonly lastEdited: BasicMessageProps['lastEdited'];
    readonly quote?: Omit<MessageProps, 'boundary' | 'conversation' | 'services'> | 'not-found';
    readonly reactions: BasicMessageProps['reactions'] & MessageDetailsModalProps['reactions'];
    readonly sender?: NonNullable<BasicMessageProps['sender']> &
        (
            | {
                  readonly type: 'self';
              }
            | {
                  readonly type: 'contact';
                  readonly uid: DbContactUid;
              }
        );
    readonly services: AppServices;
    readonly status: BasicMessageProps['status'];
    readonly text?: TextContent;
}

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

export type AnyStatusMessageProps = GroupMemberChangeProps | GroupNameChangeProps;

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

interface TextContent {
    readonly mentions?: SanitizeAndParseTextToHtmlOptions['mentions'];
    /** Raw, unparsed, text. */
    readonly raw: string;
}
