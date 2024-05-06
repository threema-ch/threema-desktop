import {ImageRenderingType, MessageDirection, MessageReaction, MessageType} from '~/common/enum';
import type {Logger} from '~/common/logging';
import type {ConversationModelStore} from '~/common/model/conversation';
import {
    OWN_IDENTITY_ALIAS,
    type AnyFileBasedMessageModel,
    type AnyMessageModel,
} from '~/common/model/types/message';
import {getUserInitials} from '~/common/model/user';
import {unreachable} from '~/common/utils/assert';
import {u64ToHexLe} from '~/common/utils/number';
import type {GetAndSubscribeFunction} from '~/common/utils/store/derived-store';
import type {ServicesForViewModel} from '~/common/viewmodel';
import {getConversationMessageViewModelBundle} from '~/common/viewmodel/conversation/main/message';
import type {
    ConversationMessageViewModel,
    StandardConversationMessageViewModel,
} from '~/common/viewmodel/conversation/main/message/store/types';
import {getMentions} from '~/common/viewmodel/utils/mentions';

/**
 * Returns the {@link ConversationMessageViewModelBundle} of the quoted message in the supplied
 * {@link messageModel}, if the original message contains a quote, else returns `undefined`. If the
 * message contains a quote which can't be resolved (i.e., its {@link MessageId} doesn't exist in
 * the db) `"not-found"` is returned instead.
 */
export function getMessageQuote(
    log: Logger,
    services: Pick<ServicesForViewModel, 'endpoint' | 'logging' | 'model'>,
    messageModel: AnyMessageModel,
    conversationModelStore: ConversationModelStore,
    getAndSubscribe: GetAndSubscribeFunction,
): StandardConversationMessageViewModel['quote'] {
    if (messageModel.type !== MessageType.TEXT) {
        // Quotes are only permitted in text messages.
        return undefined;
    }

    if (messageModel.view.quotedMessageId === undefined) {
        // Message doesn't contain a quote.
        return undefined;
    }

    const quotedMessageModelStore = conversationModelStore
        .get()
        .controller.getMessage(messageModel.view.quotedMessageId);

    // If the message quoted by this message was deleted, ignore it.
    if (quotedMessageModelStore?.get().view.deletedAt !== undefined) {
        return undefined;
    }

    if (quotedMessageModelStore === undefined) {
        log.info(
            `Quoted message id ${u64ToHexLe(
                messageModel.view.quotedMessageId,
            )} could not be found (quote message ${u64ToHexLe(messageModel.view.id)})`,
        );
        return 'not-found';
    }

    // If the quoted message was deactivated, e.g. by a deletion, don't show it any more. This is
    // necessary so that the stale reference of the old message can be cleared. Hence, the UI can be
    // completely reactive even when quoted messages are deleted.
    const isQuotedMessageActive = getAndSubscribe(
        quotedMessageModelStore.get().controller.meta.active,
    );

    if (!isQuotedMessageActive) {
        return undefined;
    }

    return getConversationMessageViewModelBundle(
        services,
        quotedMessageModelStore,
        conversationModelStore,
        false,
    );
}

/**
 * Returns the reactions that belong to a specific message for the
 * {@link ConversationMessageViewModel}.
 */
export function getMessageReactions(
    services: Pick<ServicesForViewModel, 'model'>,
    messageModel: AnyMessageModel,
): ConversationMessageViewModel['reactions'] {
    const {contacts} = services.model;

    return messageModel.view.reactions.map((reaction) => {
        // If the contact doesn't exist, doesn't have a `displayName` or the sender was the user
        // themself, fall back to `undefined`.
        const reactionSenderName =
            reaction.senderIdentity === 'me'
                ? undefined
                : contacts.getByIdentity(reaction.senderIdentity)?.get().view.displayName;

        return {
            at: reaction.reactionAt,
            direction: reaction.senderIdentity === OWN_IDENTITY_ALIAS ? 'outbound' : 'inbound',
            type: reaction.reaction === MessageReaction.ACKNOWLEDGE ? 'acknowledged' : 'declined',
            sender: {
                identity: reaction.senderIdentity,
                name: reactionSenderName,
            },
        };
    });
}

/**
 * Returns data related to the status of a message for the {@link ConversationMessageViewModel}.
 */
export function getMessageStatus(
    messageModel: AnyMessageModel,
): ConversationMessageViewModel['status'] {
    const {view} = messageModel;

    return {
        created: {
            at: view.createdAt,
        },
        ...(view.direction === MessageDirection.INBOUND
            ? {
                  received: {
                      at: view.receivedAt,
                  },
              }
            : {}),
        ...(view.direction === MessageDirection.OUTBOUND && view.sentAt !== undefined
            ? {
                  sent: {
                      at: view.sentAt,
                  },
              }
            : {}),
        ...(view.direction === MessageDirection.OUTBOUND && view.deliveredAt !== undefined
            ? {
                  delivered: {
                      at: view.deliveredAt,
                  },
              }
            : {}),
        ...(view.readAt !== undefined
            ? {
                  read: {
                      at: view.readAt,
                  },
              }
            : {}),
    };
}

/**
 * Returns data related to the sender of a message for the {@link ConversationMessageViewModel}.
 */
export function getMessageSender(
    services: Pick<ServicesForViewModel, 'model'>,
    messageModel: AnyMessageModel,
    getAndSubscribe: GetAndSubscribeFunction,
): Required<ConversationMessageViewModel>['sender'] {
    switch (messageModel.ctx) {
        case MessageDirection.INBOUND: {
            const sender = getAndSubscribe(messageModel.controller.sender());

            return {
                type: 'contact',
                color: sender.view.color,
                initials: sender.view.initials,
                name: sender.view.displayName,
                uid: sender.ctx,
            };
        }

        case MessageDirection.OUTBOUND: {
            const profilePicture = getAndSubscribe(services.model.user.profilePicture);
            const displayName = getAndSubscribe(services.model.user.displayName);

            return {
                type: 'self',
                color: profilePicture.color,
                initials: getUserInitials(displayName),
                name: displayName,
            };
        }

        default:
            return unreachable(messageModel);
    }
}

/**
 * Returns the text of a message for the {@link ConversationMessageViewModel}.
 */
export function getMessageText(
    services: Pick<ServicesForViewModel, 'model'>,
    messageModel: AnyMessageModel,
): StandardConversationMessageViewModel['text'] | undefined {
    switch (messageModel.type) {
        case 'text':
            return {
                mentions: getMentions(services, messageModel),
                raw: messageModel.view.text,
            };

        case 'audio':
        case 'image':
        case 'video':
        case 'file':
            return messageModel.view.caption === undefined
                ? undefined
                : {
                      mentions: getMentions(services, messageModel),
                      raw: messageModel.view.caption,
                  };
        case 'deleted':
            return undefined;
        default:
            return unreachable(messageModel);
    }
}

export function getMessageHistory(
    messageModel: AnyMessageModel,
): ConversationMessageViewModel['history'] {
    return messageModel.view.history;
}

/**
 * Returns file data related to a message for the {@link ConversationMessageViewModel}.
 */
export function getMessageFile(
    messageModel: AnyMessageModel,
): StandardConversationMessageViewModel['file'] {
    const {type} = messageModel;
    if (type === 'text' || type === 'deleted') {
        return undefined;
    }

    const renderingType = type === 'image' ? messageModel.view.renderingType : undefined;
    let imageRenderingType: NonNullable<
        StandardConversationMessageViewModel['file']
    >['imageRenderingType'];
    switch (renderingType) {
        case ImageRenderingType.REGULAR:
            imageRenderingType = 'regular';
            break;

        case ImageRenderingType.STICKER:
            imageRenderingType = 'sticker';
            break;

        case undefined:
            break;

        default:
            unreachable(renderingType);
    }

    return {
        duration: type === 'audio' || type === 'video' ? messageModel.view.duration : undefined,
        imageRenderingType,
        mediaType: messageModel.view.mediaType,
        name: {
            raw: messageModel.view.fileName,
            default: 'download',
        },
        // Note: Use actual file size if available, and fall back to declared file size otherwise.
        sizeInBytes: messageModel.view.fileData?.unencryptedByteCount ?? messageModel.view.fileSize,
        sync: {
            state: messageModel.view.state,
            direction: getMessageFileSyncDirection(messageModel),
        },
        type,
        thumbnail: getMessageFileThumbnail(messageModel),
    };
}

function getMessageFileSyncDirection(
    messageModel: AnyFileBasedMessageModel,
): Required<StandardConversationMessageViewModel>['file']['sync']['direction'] {
    if (messageModel.view.state === 'unsynced' || messageModel.view.state === 'syncing') {
        const fileData = messageModel.view.fileData;
        const blobId = messageModel.view.blobId;

        if (fileData === undefined && blobId !== undefined) {
            return 'download';
        } else if (fileData !== undefined && blobId === undefined) {
            return 'upload';
        }
    }

    return undefined;
}

function getMessageFileThumbnail(
    messageModel: AnyFileBasedMessageModel,
): Required<StandardConversationMessageViewModel>['file']['thumbnail'] {
    switch (messageModel.type) {
        case 'file':
        case 'audio':
            return undefined;

        case 'image':
        case 'video':
            return {
                expectedDimensions: messageModel.view.dimensions,
                mediaType: messageModel.view.thumbnailMediaType ?? 'image/jpeg',
            };

        default:
            return unreachable(messageModel);
    }
}
