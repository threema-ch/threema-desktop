import {MessageDirection, type MessageReaction, MessageType} from '~/common/enum';
import {type Logger} from '~/common/logging';
import {
    type AnyMessageModel,
    type AnyMessageModelStore,
    type Conversation,
    type FileMessageViewFragment,
    type Repositories,
    type User,
} from '~/common/model';
import {type ConversationModelStore} from '~/common/model/conversation';
import {statusFromView} from '~/common/model/message';
import {type MessageId} from '~/common/network/types';
import {type u53} from '~/common/types';
import {assert, unreachable} from '~/common/utils/assert';
import {type PropertiesMarked} from '~/common/utils/endpoint';
import {u64ToHexLe} from '~/common/utils/number';
import {type LocalStore} from '~/common/utils/store';
import {derive, type GetAndSubscribeFunction} from '~/common/utils/store/derived-store';
import {type ServicesForViewModel} from '~/common/viewmodel';
import {transformContact} from '~/common/viewmodel/svelte-components-transformations';
import {
    type AnyMessageBody,
    type FileMessageDataState,
    type IncomingMessage,
    type Message,
    type OutgoingMessage,
} from '~/common/viewmodel/types';
import {getMentions, type Mention} from '~/common/viewmodel/utils/mentions';

export interface ConversationMessage extends PropertiesMarked {
    readonly id: MessageId;
    readonly direction: MessageDirection;
    readonly messageStore: AnyMessageModelStore;
    readonly viewModel: ConversationMessageViewModelStore;
}

export function getConversationMessage(
    services: ServicesForViewModel,
    messageStore: AnyMessageModelStore,
    conversationModelStore: ConversationModelStore,
): ConversationMessage {
    const {endpoint, logging} = services;
    const log = logging.logger('viewmodel.conversation-messages');

    // Some properties of a message are immutable, so it is safe to extract them at this time.
    const messageModel = messageStore.get();

    return endpoint.exposeProperties({
        id: messageModel.view.id,
        direction: messageModel.view.direction,
        messageStore,
        viewModel: getViewModel(services, log, messageStore, conversationModelStore.get()),
    });
}

export interface Quote extends PropertiesMarked {
    readonly messageId: MessageId;
}

export type ConversationMessageViewModelStore = LocalStore<ConversationMessageViewModel>;

export interface ConversationMessageViewModel extends PropertiesMarked {
    readonly messageId: MessageId;

    readonly body: Message<AnyMessageBody>;

    /**
     * Mentions in the message.
     */
    readonly mentions: Mention[];

    /**
     * Store of the quoted message, if any.
     * If the quoted message could not be found in the database, 'not-found' is returned.
     */
    readonly quote: ConversationMessageViewModelStore | 'not-found' | undefined;

    /**
     * Ordinal for message ordering in the conversation list.
     */
    readonly ordinal: u53;

    /**
     * The sync direction for unsynced or syncing messages.
     */
    readonly syncDirection: 'upload' | 'download' | undefined;
}

function getViewModel(
    services: ServicesForViewModel,
    log: Logger,
    messageStore: AnyMessageModelStore,
    conversationModel: Conversation,
    resolveQuotedMessage = true,
): ConversationMessageViewModelStore {
    const {endpoint, model} = services;
    return derive(messageStore, (message, getAndSubscribe) => {
        const quote = getQuotedMessageViewModel(
            services,
            log,
            message,
            conversationModel,
            resolveQuotedMessage,
        );

        let syncDirection: ConversationMessageViewModel['syncDirection'];
        if (message.type === 'file') {
            if (message.view.state === 'unsynced' || message.view.state === 'syncing') {
                const fileData = message.view.fileData;
                const blobId = message.view.blobId;
                if (fileData === undefined && blobId !== undefined) {
                    syncDirection = 'download';
                } else if (fileData !== undefined && blobId === undefined) {
                    syncDirection = 'upload';
                }
            }
        }

        const conversationMessage = {
            messageId: message.view.id,
            body: getConversationMessageBody(message, model, getAndSubscribe),
            mentions: getMentions(message, model),
            quote,
            ordinal: getMessageOrdinal(message),
            syncDirection,
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
): ConversationMessageViewModelStore | 'not-found' | undefined {
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
    // TODO(DESK-296): BE: Implement full-featured thread-based message sorting.
    if (message.view.direction === MessageDirection.INBOUND) {
        return message.view.receivedAt.getTime();
    } else {
        return message.view.sentAt?.getTime() ?? message.view.createdAt.getTime();
    }
}

/**
 * Convert a view `FileMessageDataState` into a viewmodel `FileMessageDataState`.
 */
function convertFileMessageDataState(view: FileMessageViewFragment): FileMessageDataState {
    switch (view.state) {
        case 'syncing':
            return {type: 'syncing', progress: 'TODO(DESK-933)'};
        default:
            return {type: view.state};
    }
}

type BaseMessageOmittedFields = 'type' | 'body' | 'state';

function getConversationMessageBody(
    messageModel: AnyMessageModel,
    model: Repositories,
    getAndSubscribe: GetAndSubscribeFunction,
): ConversationMessageViewModel['body'] {
    const baseMessage = getConversationMessageBodyBaseMessage(
        messageModel,
        model.user,
        getAndSubscribe,
    );
    let messageData: ConversationMessageViewModel['body'];

    switch (messageModel.type) {
        case 'text': {
            const type = 'text';
            const body = {text: messageModel.view.text};
            if (baseMessage.direction === MessageDirection.INBOUND) {
                messageData = {
                    ...(baseMessage as Omit<
                        IncomingMessage<AnyMessageBody>,
                        BaseMessageOmittedFields
                    >),
                    type,
                    body,
                    state: {type: 'synced'},
                };
            } else {
                messageData = {
                    ...(baseMessage as Omit<
                        OutgoingMessage<AnyMessageBody>,
                        BaseMessageOmittedFields
                    >),
                    type,
                    body,
                    state: {type: 'synced'},
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
            if (messageModel.ctx === MessageDirection.INBOUND) {
                messageData = {
                    ...(baseMessage as Omit<
                        IncomingMessage<AnyMessageBody>,
                        BaseMessageOmittedFields
                    >),
                    type,
                    body,
                    state: convertFileMessageDataState(messageModel.view),
                };
            } else {
                messageData = {
                    ...(baseMessage as Omit<
                        OutgoingMessage<AnyMessageBody>,
                        BaseMessageOmittedFields
                    >),
                    type,
                    body,
                    state: convertFileMessageDataState(messageModel.view),
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
    user: User,
    getAndSubscribe: GetAndSubscribeFunction,
): Omit<Message<AnyMessageBody>, BaseMessageOmittedFields> {
    let lastReaction:
        | {
              at: Date;
              type: MessageReaction;
          }
        | undefined;
    if (messageModel.view.lastReaction !== undefined) {
        lastReaction = {
            ...messageModel.view.lastReaction,
        };
    }

    // Determine base message contents depending on direction
    let baseMessage: Omit<Message<AnyMessageBody>, BaseMessageOmittedFields>;
    const id = u64ToHexLe(messageModel.view.id);
    switch (messageModel.ctx) {
        case MessageDirection.INBOUND: {
            const sender = getAndSubscribe(messageModel.controller.sender());
            const profilePicture = getAndSubscribe(sender.controller.profilePicture);
            const contact = transformContact(
                user.privacySettings,
                sender,
                profilePicture,
                getAndSubscribe,
            );
            assert(contact.type === 'contact');

            const incomingBaseMessage: Omit<
                IncomingMessage<AnyMessageBody>,
                BaseMessageOmittedFields
            > = {
                direction: messageModel.ctx,
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
            const outgoingBaseMessage: Omit<
                OutgoingMessage<AnyMessageBody>,
                BaseMessageOmittedFields
            > = {
                direction: messageModel.ctx,
                id,
                status,
                sender: {
                    name: getAndSubscribe(user.displayName),
                    profilePicture: getAndSubscribe(user.profilePicture),
                },
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
