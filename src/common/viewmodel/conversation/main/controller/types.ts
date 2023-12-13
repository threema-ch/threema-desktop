import type {
    OutboundFileMessageInitFragment,
    OutboundImageMessageInitFragment,
    OutboundTextMessageInitFragment,
} from '~/common/network/protocol/task/message-processing-helpers';
import type {MessageId} from '~/common/network/types';
import type {Dimensions, ReadonlyUint8Array, u53} from '~/common/types';

/**
 * Required data the {@link ConversationViewModelController} needs to send a message.
 */
export type SendMessageEventDetail = SendTextMessageEventDetail | SendFileBasedMessageEventDetail;

export interface SendTextMessageEventDetail {
    readonly type: 'text';
    readonly text: string;
    readonly quotedMessageId?: MessageId | undefined;
}

export interface SendFileBasedMessageEventDetail {
    readonly type: 'files';
    readonly files: {
        readonly bytes: ReadonlyUint8Array;
        readonly thumbnailBytes?: ReadonlyUint8Array;
        readonly caption?: string;
        readonly fileName: string;
        readonly fileSize: u53;
        readonly mediaType: string;
        readonly thumbnailMediaType?: string;
        readonly dimensions?: Dimensions;
        readonly sendAsFile: boolean;
    }[];
}

/**
 * Partial data the {@link ConversationViewModelController} needs to prepare a message for sending.
 */
export type OutboundMessageInitFragment =
    | Omit<OutboundTextMessageInitFragment, 'direction' | 'id' | 'createdAt'>
    | Omit<OutboundFileMessageInitFragment, 'direction' | 'id' | 'createdAt'>
    | Omit<OutboundImageMessageInitFragment, 'direction' | 'id' | 'createdAt'>;
