/**
 * Helpers for processing incoming messages.
 */

import {ReceiverType} from '~/common/enum';
import {type Conversation, type Repositories} from '~/common/model';
import {type InboundFileMessage, type OutboundFileMessage} from '~/common/model/types/message/file';
import {type InboundTextMessage, type OutboundTextMessage} from '~/common/model/types/message/text';
import {type LocalModelStore} from '~/common/model/utils/model-store';
import {type ConversationId} from '~/common/network/types';
import {type Mutable} from '~/common/types';
import {unreachable} from '~/common/utils/assert';

// Message init fragments. Message ID and sender are excluded, since those will be extracted from
// the message header. The `receivedAt` field is mutable, because it may need to be overwritten
// while processing.
type OmittedInitKeys = 'id' | 'sender';
export type InboundTextMessageInitFragment = Mutable<
    Omit<InboundTextMessage['init'], OmittedInitKeys>,
    'receivedAt'
>;
export type InboundFileMessageInitFragment = Mutable<
    Omit<InboundFileMessage['init'], OmittedInitKeys>,
    'receivedAt'
>;
export type OutboundTextMessageInitFragment = Omit<OutboundTextMessage['init'], OmittedInitKeys>;
export type OutboundFileMessageInitFragment = Omit<OutboundFileMessage['init'], OmittedInitKeys>;
export type AnyInboundMessageInitFragment =
    | InboundTextMessageInitFragment
    | InboundFileMessageInitFragment;
export type AnyOutboundMessageInitFragment =
    | OutboundTextMessageInitFragment
    | OutboundFileMessageInitFragment;

/**
 * Get a conversation.
 *
 * @returns the conversation, or `undefined` if not found in the database.
 */
export function getConversationById(
    model: Repositories,
    conversationId: ConversationId,
): LocalModelStore<Conversation> | undefined {
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
