import {ImageRenderingType, MessageReaction, MessageType} from '~/common/enum';
import type {Logger} from '~/common/logging';
import type {ConversationModelStore} from '~/common/model/conversation';
import type {
    AnyFileBasedMessageModel,
    AnyNonDeletedMessageModel,
} from '~/common/model/types/message';
import {unreachable} from '~/common/utils/assert';
import {u64ToHexLe} from '~/common/utils/number';
import type {GetAndSubscribeFunction} from '~/common/utils/store/derived-store';
import type {ServicesForViewModel} from '~/common/viewmodel';
import {getConversationDeletedMessageViewModelBundle} from '~/common/viewmodel/conversation/main/message/deleted-message';
import {getConversationRegularMessageViewModelBundle} from '~/common/viewmodel/conversation/main/message/regular-message';
import type {ConversationRegularMessageViewModel} from '~/common/viewmodel/conversation/main/message/regular-message/store/types';
import {getMentions} from '~/common/viewmodel/utils/mentions';
import {getSenderData} from '~/common/viewmodel/utils/sender';

/**
 * Returns the {@link ConversationRegularMessageViewModelBundle} of the quoted message in the
 * supplied {@link messageModel}, if the original message contains a quote, else returns
 * `undefined`. If the message contains a quote which can't be resolved (i.e., its {@link MessageId}
 * doesn't exist in the db) `"not-found"` is returned instead.
 */
export function getMessageQuote(
    log: Logger,
    services: Pick<ServicesForViewModel, 'device' | 'endpoint' | 'logging' | 'model'>,
    messageModel: AnyNonDeletedMessageModel,
    conversationModelStore: ConversationModelStore,
    getAndSubscribe: GetAndSubscribeFunction,
): ConversationRegularMessageViewModel['quote'] {
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

    switch (quotedMessageModelStore.type) {
        case MessageType.DELETED:
            return getConversationDeletedMessageViewModelBundle(services, quotedMessageModelStore);

        default:
            return getConversationRegularMessageViewModelBundle(
                services,
                quotedMessageModelStore,
                conversationModelStore,
                false,
            );
    }
}

/**
 * Returns the reactions that belong to a specific message for the
 * {@link ConversationRegularMessageViewModel}.
 */
export function getMessageReactions(
    services: Pick<ServicesForViewModel, 'device' | 'model'>,
    messageModel: AnyNonDeletedMessageModel,
    getAndSubscribe: GetAndSubscribeFunction,
): ConversationRegularMessageViewModel['reactions'] {
    return messageModel.view.reactions.map((reaction) => ({
        at: reaction.reactionAt,
        direction:
            reaction.senderIdentity === services.device.identity.string ? 'outbound' : 'inbound',
        type: reaction.reaction === MessageReaction.ACKNOWLEDGE ? 'acknowledged' : 'declined',
        sender: getSenderData(services, reaction.senderIdentity, getAndSubscribe),
    }));
}

/**
 * Returns the text of a message for the {@link ConversationRegularMessageViewModel}.
 */
export function getMessageText(
    services: Pick<ServicesForViewModel, 'model'>,
    messageModel: AnyNonDeletedMessageModel,
    getAndSubscribe: GetAndSubscribeFunction,
): ConversationRegularMessageViewModel['text'] | undefined {
    switch (messageModel.type) {
        case 'text':
            return {
                mentions: getMentions(services, messageModel, getAndSubscribe),
                raw: messageModel.view.text,
            };

        case 'audio':
        case 'image':
        case 'video':
        case 'file':
            return messageModel.view.caption === undefined
                ? undefined
                : {
                      mentions: getMentions(services, messageModel, getAndSubscribe),
                      raw: messageModel.view.caption,
                  };

        default:
            return unreachable(messageModel);
    }
}

export function getMessageHistory(
    messageModel: AnyNonDeletedMessageModel,
): ConversationRegularMessageViewModel['history'] {
    return messageModel.view.history;
}

/**
 * Returns file data related to a message for the {@link ConversationRegularMessageViewModel}.
 */
export function getMessageFile(
    messageModel: AnyNonDeletedMessageModel,
): ConversationRegularMessageViewModel['file'] {
    const {type} = messageModel;
    if (type === 'text') {
        return undefined;
    }

    const renderingType = type === 'image' ? messageModel.view.renderingType : undefined;
    let imageRenderingType: NonNullable<
        ConversationRegularMessageViewModel['file']
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
): Required<ConversationRegularMessageViewModel>['file']['sync']['direction'] {
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
): Required<ConversationRegularMessageViewModel>['file']['thumbnail'] {
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
