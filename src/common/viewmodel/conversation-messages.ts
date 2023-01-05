import {MessageDirection, MessageReaction, MessageType} from '~/common/enum';
import {type Logger} from '~/common/logging';
import {
    type AnyMessageModel,
    type AnyMessageModelStore,
    type Conversation,
    type Repositories,
    type SetOfAnyLocalMessageModelStore,
    type Settings,
} from '~/common/model';
import {statusFromView} from '~/common/model/message';
import {type LocalModelStore} from '~/common/model/utils/model-store';
import {type MessageId} from '~/common/network/types';
import {type u53} from '~/common/types';
import {assert, unreachable} from '~/common/utils/assert';
import {type PropertiesMarked} from '~/common/utils/endpoint';
import {u64ToHexLe} from '~/common/utils/number';
import {type LocalStore} from '~/common/utils/store';
import {type GetAndSubscribeFunction, derive} from '~/common/utils/store/derived-store';
import {LocalDerivedSetStore} from '~/common/utils/store/set-store';
import {type ServicesForViewModel} from '~/common/viewmodel';
import {transformContact} from '~/common/viewmodel/svelte-components-transformations';
import {
    type AnyMessageBody,
    type IncomingMessage,
    type Message,
    type MessageReaction as SCMessageReaction,
    type OutgoingMessage,
} from '~/common/viewmodel/types';
import {type Mention, getMentions} from '~/common/viewmodel/utils/mentions';

export type ConversationMessageSetStore = LocalDerivedSetStore<
    SetOfAnyLocalMessageModelStore,
    ConversationMessageViewModel
>;

/**
 * Get a SetStore that contains a ConversationPreview for a receiver.
 */
export function getConversationMessageSetStore(
    services: ServicesForViewModel,
    conversation: LocalModelStore<Conversation>,
): ConversationMessageSetStore {
    const conversationModel = conversation.get();
    const messageSetStore = conversationModel.controller.getAllMessages();
    const log = services.logging.logger('viewmodel.conversation-messages');

    return new LocalDerivedSetStore(messageSetStore, (store) =>
        getConversationMessageViewModel(services, log, store, conversationModel),
    );
}

export interface ConversationMessageViewModel extends PropertiesMarked {
    readonly id: MessageId;
    readonly direction: MessageDirection;
    readonly messageStore: AnyMessageModelStore;
    readonly viewModel: LocalStore<ConversationMessage>;
}

function getConversationMessageViewModel(
    services: ServicesForViewModel,
    log: Logger,
    messageStore: AnyMessageModelStore,
    conversationModel: Conversation,
): ConversationMessageViewModel {
    const {endpoint} = services;
    // Some properties of a message may not be changed, so it is safe to extract them at this time.
    const messageModel = messageStore.get();

    return endpoint.exposeProperties({
        id: messageModel.view.id,
        direction: messageModel.view.direction,
        messageStore,
        viewModel: getViewModel(services, log, messageStore, conversationModel),
    });
}

export interface Quote extends PropertiesMarked {
    readonly messageId: MessageId;
}

export interface ConversationMessage extends PropertiesMarked {
    readonly body: Message<AnyMessageBody>;

    /**
     * Mentions in the message.
     */
    readonly mentions: Mention[];

    /**
     * Store of the quoted message, if any.
     * If the quoted message could not be found in the database, 'not-found' is returned.
     */
    readonly quote: LocalStore<ConversationMessage> | 'not-found' | undefined;

    /**
     * Ordinal for message ordering in the conversation list.
     */
    readonly ordinal: u53;
}

function getViewModel(
    services: ServicesForViewModel,
    log: Logger,
    messageStore: AnyMessageModelStore,
    conversationModel: Conversation,
    resolveQuotedMessage = true,
): LocalStore<ConversationMessage> {
    const {endpoint, model} = services;
    return derive(messageStore, (message, getAndSubscribe) => {
        const quote = getQuotedMessageViewModel(
            services,
            log,
            message,
            conversationModel,
            resolveQuotedMessage,
        );

        const conversationMessage = {
            body: getConversationMessageBody(message, model, getAndSubscribe),
            mentions: getMentions(message, model),
            quote,
            ordinal: getMessageOrdinal(message),
        };
        return endpoint.exposeProperties(conversationMessage);
    });
}

/**
 * Parse text messages for possible quotes, and return the quoted message view model and this
 * message's comment text without the quote reference.
 *
 * {@param resolveQuotedMessage} is {@code true}.
 */
function getQuotedMessageViewModel(
    services: ServicesForViewModel,
    log: Logger,
    messageModel: AnyMessageModel,
    conversationModel: Conversation,
    resolveQuotedMessage: boolean,
): LocalStore<ConversationMessage> | 'not-found' | undefined {
    if (messageModel.type !== MessageType.TEXT) {
        // Quotes are only permitted in text messages
        return undefined;
    }

    if (messageModel.view.quotedMessageId === undefined) {
        // Not a quote
        return undefined;
    }

    const messageStore = conversationModel.controller.getMessage(messageModel.view.quotedMessageId);
    if (messageStore === undefined) {
        log.info(
            `Quoted message id ${u64ToHexLe(
                messageModel.view.quotedMessageId,
            )} could be found (quote message ${u64ToHexLe(messageModel.view.id)})`,
        );
        return 'not-found';
    }

    let quotedMessageStore = undefined;
    if (resolveQuotedMessage) {
        quotedMessageStore = getViewModel(services, log, messageStore, conversationModel, false);
    }

    return quotedMessageStore;
}

/**
 * Get an ordinal for message ordering in the frontend.
 */
function getMessageOrdinal(message: AnyMessageModel): u53 {
    // TODO(WEBMD-296): BE: Implement full-featured thread-based message sorting.
    if (message.view.direction === MessageDirection.INBOUND) {
        return message.view.receivedAt.getTime();
    } else {
        return message.view.sentAt?.getTime() ?? message.view.createdAt.getTime();
    }
}

function getConversationMessageBody(
    messageModel: AnyMessageModel,
    model: Repositories,
    getAndSubscribe: GetAndSubscribeFunction,
): ConversationMessage['body'] {
    const baseMessage = getConversationMessageBodyBaseMessage(
        messageModel,
        model.settings,
        getAndSubscribe,
    );
    let messageData: ConversationMessage['body'];

    switch (messageModel.type) {
        case 'text': {
            const type = 'text';
            const body = {text: messageModel.view.text};
            if (baseMessage.direction === 'incoming') {
                messageData = {
                    ...(baseMessage as Omit<IncomingMessage<AnyMessageBody>, 'type' | 'body'>),
                    type,
                    body,
                };
            } else {
                messageData = {
                    ...(baseMessage as Omit<OutgoingMessage<AnyMessageBody>, 'type' | 'body'>),
                    type,
                    body,
                };
            }
            break;
        }
        case 'file': {
            const type = 'file';
            const body = {
                mediaType: messageModel.view.mediaType,
                size: messageModel.view.fileSize,
                thumbnail: undefined,
                filename: messageModel.view.fileName,
                caption: messageModel.view.caption,
            };
            if (baseMessage.direction === 'incoming') {
                messageData = {
                    ...(baseMessage as Omit<IncomingMessage<AnyMessageBody>, 'type' | 'body'>),
                    type,
                    body,
                };
            } else {
                messageData = {
                    ...(baseMessage as Omit<OutgoingMessage<AnyMessageBody>, 'type' | 'body'>),
                    type,
                    body,
                };
            }
            break;
        }
        default:
            unreachable(messageModel);
    }

    return messageData;
}

function getConversationMessageBodyBaseMessage(
    messageModel: AnyMessageModel,
    settings: Settings,
    getAndSubscribe: GetAndSubscribeFunction,
): Omit<Message<AnyMessageBody>, 'type' | 'body'> {
    let lastReaction:
        | {
              at: Date;
              type: SCMessageReaction;
          }
        | undefined;
    if (messageModel.view.lastReaction !== undefined) {
        lastReaction = {
            ...messageModel.view.lastReaction,
            type: transformReactionType(messageModel.view.lastReaction.type),
        };
    }

    // Determine base message contents depending on direction
    let baseMessage: Omit<Message<AnyMessageBody>, 'type' | 'body'>;
    const id = u64ToHexLe(messageModel.view.id);
    switch (messageModel.ctx) {
        case MessageDirection.INBOUND: {
            const sender = getAndSubscribe(messageModel.controller.sender());
            const avatar = getAndSubscribe(sender.controller.avatar());
            const contact = transformContact(sender, avatar, settings);
            assert(contact.type === 'contact');

            const incomingBaseMessage: Omit<IncomingMessage<AnyMessageBody>, 'type' | 'body'> = {
                direction: 'incoming',
                state: {type: 'local'},
                id,
                sender: contact,
                isRead: messageModel.view.readAt !== undefined,
                updatedAt: messageModel.view.createdAt,
                lastReaction,
            };
            baseMessage = incomingBaseMessage;
            break;
        }
        case MessageDirection.OUTBOUND: {
            const status = statusFromView(messageModel.view)[0];
            const outgoingBaseMessage: Omit<OutgoingMessage<AnyMessageBody>, 'type' | 'body'> = {
                direction: 'outgoing',
                state: {type: 'remote'},
                id,
                status,
                updatedAt:
                    messageModel.view.readAt ??
                    messageModel.view.deliveredAt ??
                    messageModel.view.sentAt ??
                    messageModel.view.createdAt,
                lastReaction,
            };
            baseMessage = outgoingBaseMessage;
            break;
        }
        default:
            unreachable(messageModel);
    }
    return baseMessage;
}

function transformReactionType(reactionType: MessageReaction): SCMessageReaction {
    switch (reactionType) {
        case MessageReaction.ACKNOWLEDGE:
            return 'acknowledged';
        case MessageReaction.DECLINE:
            return 'declined';
        default:
            return unreachable(reactionType);
    }
}
