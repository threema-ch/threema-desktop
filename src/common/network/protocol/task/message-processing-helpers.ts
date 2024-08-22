/**
 * Helpers for processing incoming messages.
 */

import {CspE2eStatusUpdateType, ReceiverType} from '~/common/enum';
import type {Conversation} from '~/common/model';
import type {
    InboundAudioMessageBundle,
    OutboundAudioMessageBundle,
} from '~/common/model/types/message/audio';
import type {
    InboundDeletedMessageBundle,
    OutboundDeletedMessageBundle,
} from '~/common/model/types/message/deleted';
import type {
    InboundFileMessageBundle,
    OutboundFileMessageBundle,
} from '~/common/model/types/message/file';
import type {
    InboundImageMessageBundle,
    OutboundImageMessageBundle,
} from '~/common/model/types/message/image';
import type {
    InboundTextMessageBundle,
    OutboundTextMessageBundle,
} from '~/common/model/types/message/text';
import type {
    InboundVideoMessageBundle,
    OutboundVideoMessageBundle,
} from '~/common/model/types/message/video';
import type {ModelStore} from '~/common/model/utils/model-store';
import type {CspE2eType} from '~/common/network/protocol';
import type {ServicesForTasks} from '~/common/network/protocol/task';
import * as structbuf from '~/common/network/structbuf';
import type {ConversationId, MessageId} from '~/common/network/types';
import type {Mutable} from '~/common/types';
import {unreachable} from '~/common/utils/assert';
import {u64ToHexLe} from '~/common/utils/number';

// Message init fragments. Message ID and sender are excluded, since those will be extracted from
// the message header (for incoming messages) or are already known or are generated when sending
// (for outgoing messages).
type OmittedInitKeys = 'id' | 'sender';

// Note: The `receivedAt` field is mutable, because it may need to be overwritten while processing.
export type InboundTextMessageInitFragment = Mutable<
    Omit<InboundTextMessageBundle['init'], OmittedInitKeys>,
    'receivedAt'
>;
export type InboundFileMessageInitFragment = Mutable<
    Omit<InboundFileMessageBundle['init'], OmittedInitKeys>,
    'receivedAt'
>;
export type InboundImageMessageInitFragment = Mutable<
    Omit<InboundImageMessageBundle['init'], OmittedInitKeys>,
    'receivedAt'
>;
export type InboundVideoMessageInitFragment = Mutable<
    Omit<InboundVideoMessageBundle['init'], OmittedInitKeys>,
    'receivedAt'
>;
export type InboundAudioMessageInitFragment = Mutable<
    Omit<InboundAudioMessageBundle['init'], OmittedInitKeys>,
    'receivedAt'
>;
export type InboundDeletedMessageInitFragment = Mutable<
    Omit<InboundDeletedMessageBundle['init'], OmittedInitKeys>,
    'receivedAt'
>;
export type OutboundTextMessageInitFragment = Omit<
    OutboundTextMessageBundle['init'],
    OmittedInitKeys
>;
export type OutboundFileMessageInitFragment = Omit<
    OutboundFileMessageBundle['init'],
    OmittedInitKeys
>;
export type OutboundImageMessageInitFragment = Omit<
    OutboundImageMessageBundle['init'],
    OmittedInitKeys
>;
export type OutboundVideoMessageInitFragment = Omit<
    OutboundVideoMessageBundle['init'],
    OmittedInitKeys
>;
export type OutboundAudioMessageInitFragment = Omit<
    OutboundAudioMessageBundle['init'],
    OmittedInitKeys
>;
export type OutboundDeletedMessageInitFragment = Omit<
    OutboundDeletedMessageBundle['init'],
    OmittedInitKeys
>;
export type AnyInboundMessageInitFragment =
    | InboundTextMessageInitFragment
    | InboundFileMessageInitFragment
    | InboundImageMessageInitFragment
    | InboundVideoMessageInitFragment
    | InboundAudioMessageInitFragment;
export type AnyOutboundMessageInitFragment =
    | OutboundTextMessageInitFragment
    | OutboundFileMessageInitFragment
    | OutboundImageMessageInitFragment
    | OutboundVideoMessageInitFragment
    | OutboundAudioMessageInitFragment;

/**
 * Get a conversation.
 *
 * @returns the conversation, or `undefined` if not found in the database.
 */
export function getConversationById(
    services: Pick<ServicesForTasks, 'device' | 'model'>,
    conversationId: ConversationId,
): ModelStore<Conversation> | undefined {
    const {model} = services;
    switch (conversationId.type) {
        case ReceiverType.CONTACT: {
            const contact = model.contacts.getByIdentity(conversationId.identity);
            if (contact === undefined) {
                return undefined;
            }
            return contact.get().controller.conversation();
        }
        case ReceiverType.GROUP: {
            const group = model.groups.getByGroupIdAndCreator(
                conversationId.groupId,
                conversationId.creatorIdentity,
            );
            if (group === undefined) {
                return undefined;
            }
            return group.get().controller.conversation();
        }
        case ReceiverType.DISTRIBUTION_LIST:
            throw new Error('TODO(DESK-237): Not yet implemented');
        default:
            return unreachable(conversationId);
    }
}

/**
 * Returns an array of {@link MessageId}s referenced by the given message, or `undefined`.
 */
function getReferencedMessageIdsForMessage(
    messageType: CspE2eType,
    decryptedMessageBody: Uint8Array,
): MessageId[] | undefined {
    try {
        switch (messageType) {
            case CspE2eStatusUpdateType.DELIVERY_RECEIPT: {
                const validatedMessage = structbuf.validate.csp.e2e.DeliveryReceipt.SCHEMA.parse(
                    structbuf.csp.e2e.DeliveryReceipt.decode(decryptedMessageBody),
                );
                return validatedMessage.messageIds;
            }
            default:
                return undefined;
        }
    } catch (error) {
        return undefined;
    }
}

/**
 * Returns a debug message containing the {@link MessageId}s the given message references, if any.
 *
 * As an example, a message of type `DELIVERY_RECEIPT` will return the `MessageId`s of the messages
 * which the receipt is referring to.
 */
export function messageReferenceDebugFor(
    messageType: CspE2eType,
    decryptedMessageBody: Uint8Array,
): string {
    const referencedMessageIds = getReferencedMessageIdsForMessage(
        messageType,
        decryptedMessageBody,
    );

    if (referencedMessageIds === undefined) {
        return '';
    }

    if (referencedMessageIds.length === 0) {
        return `for unknown message reference`;
    }

    return `for referenced message(s): ${referencedMessageIds.map(u64ToHexLe).join(', ')}`;
}
