import type {MessageProps} from '~/app/ui/components/partials/chat-view/internal/message/props';
import {ImageRenderingType, MessageDirection, MessageReaction} from '~/common/enum';
import type {AnyMessageModel, RemoteModelFor} from '~/common/model';
import type {InboundAudioMessage, OutboundAudioMessage} from '~/common/model/types/message/audio';
import type {InboundFileMessage, OutboundFileMessage} from '~/common/model/types/message/file';
import type {InboundImageMessage, OutboundImageMessage} from '~/common/model/types/message/image';
import type {InboundVideoMessage, OutboundVideoMessage} from '~/common/model/types/message/video';
import {unreachable} from '~/common/utils/assert';
import type {Remote, RemoteProxy} from '~/common/utils/endpoint';
import type {IQueryableStore} from '~/common/utils/store';
import {derive} from '~/common/utils/store/derived-store';
import type {
    ConversationMessageViewModel,
    ConversationMessageViewModelBundle,
    IConversationMessageViewModelController,
} from '~/common/viewmodel/conversation-message';
import type {ConversationMessageSetViewModel} from '~/common/viewmodel/conversation-message-set';

/**
 * Defined the shape of props as they should be provided from the backend.
 */
export type MessagePropsFromBackend = Omit<MessageProps, 'boundary' | 'conversation' | 'services'>;

/**
 * A list of messages sorted from oldest to newest.
 */
export type SortedMessageList = Remote<ConversationMessageViewModelBundle>[];

// TODO(DESK-1216): Move transformations into the ViewModel.
export function messageSetViewModelToMessagePropsStore(
    viewModel: Remote<ConversationMessageSetViewModel>,
): IQueryableStore<MessagePropsFromBackend[]> {
    return derive(viewModel.store, (conversationMessageSet, getAndSubscribe) =>
        [...conversationMessageSet]
            .sort(
                (a, b) =>
                    getAndSubscribe(a.viewModel).ordinal - getAndSubscribe(b.viewModel).ordinal,
            )
            .map((messageViewModelBundle) => {
                const messageViewModel = getAndSubscribe(messageViewModelBundle.viewModel);
                const viewModelController = messageViewModelBundle.viewModelController;
                const messageModel = getAndSubscribe(messageViewModelBundle.messageStore);

                let quote: MessagePropsFromBackend | undefined | 'not-found';
                if (
                    messageViewModel.quote === undefined ||
                    messageViewModel.quote === 'not-found'
                ) {
                    quote = messageViewModel.quote;
                } else {
                    const quoteViewModel = getAndSubscribe(messageViewModel.quote.viewModel);
                    const quoteViewModelController = messageViewModel.quote.viewModelController;
                    const quoteModel = getAndSubscribe(messageViewModel.quote.messageStore);

                    quote = getMessageProps(quoteViewModel, quoteViewModelController, quoteModel);
                }

                return {
                    ...getMessageProps(messageViewModel, viewModelController, messageModel),
                    quote,
                };
            }),
    );
}

function getMessageProps(
    viewModel: Remote<ConversationMessageViewModel>,
    viewModelController: RemoteProxy<IConversationMessageViewModelController>,
    messageModel: RemoteModelFor<AnyMessageModel>,
): MessagePropsFromBackend {
    return {
        actions: getMessageActions(viewModel, viewModelController, messageModel),
        direction: viewModel.body.direction === MessageDirection.INBOUND ? 'inbound' : 'outbound',
        file: getMessageFile(viewModel, viewModelController, messageModel),
        id: viewModel.messageId,
        reactions:
            messageModel.view.lastReaction !== undefined
                ? [
                      {
                          at: messageModel.view.lastReaction.at,
                          direction:
                              viewModel.body.direction === MessageDirection.INBOUND
                                  ? 'outbound'
                                  : 'inbound',
                          type:
                              messageModel.view.lastReaction.type === MessageReaction.ACKNOWLEDGE
                                  ? 'acknowledged'
                                  : 'declined',
                      },
                  ]
                : [],
        status: getMessageStatus(viewModel, viewModelController, messageModel),
        sender: getMessageSender(viewModel, viewModelController, messageModel),
        text: getMessageText(viewModel, viewModelController, messageModel),
    };
}

function getMessageActions(
    viewModel: Remote<ConversationMessageViewModel>,
    viewModelController: RemoteProxy<IConversationMessageViewModelController>,
    messageModel: RemoteModelFor<AnyMessageModel>,
): MessagePropsFromBackend['actions'] {
    if (messageModel.ctx !== MessageDirection.INBOUND) {
        return {
            acknowledge: async () =>
                await Promise.reject(
                    Error(
                        "Attempted to acknowledge an outbound message, which shouldn't be possible",
                    ),
                ),
            decline: async () =>
                await Promise.reject(
                    Error("Attempted to decline an outbound message, which shouldn't be possible"),
                ),
        };
    }

    return {
        acknowledge: async () => {
            await messageModel.controller.reaction.fromLocal(
                MessageReaction.ACKNOWLEDGE,
                new Date(),
            );
        },
        decline: async () => {
            await messageModel.controller.reaction.fromLocal(MessageReaction.DECLINE, new Date());
        },
    };
}

function getMessageStatus(
    viewModel: Remote<ConversationMessageViewModel>,
    viewModelController: RemoteProxy<IConversationMessageViewModelController>,
    messageModel: RemoteModelFor<AnyMessageModel>,
): MessagePropsFromBackend['status'] {
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

function getMessageSender(
    viewModel: Remote<ConversationMessageViewModel>,
    viewModelController: RemoteProxy<IConversationMessageViewModelController>,
    messageModel: RemoteModelFor<AnyMessageModel>,
): MessagePropsFromBackend['sender'] {
    const sender = viewModel.body.sender;

    switch (sender.type) {
        case 'contact':
            return {
                type: 'contact',
                color: sender.profilePictureFallback.color,
                initials: sender.profilePictureFallback.initials,
                name: sender.name,
                uid: sender.uid,
            };

        case 'self':
            return {
                type: 'self',
                color: sender.profilePictureFallback.color,
                initials: '',
                name: sender.name,
            };

        default:
            return unreachable(sender);
    }
}

function getMessageText(
    viewModel: Remote<ConversationMessageViewModel>,
    viewModelController: RemoteProxy<IConversationMessageViewModelController>,
    messageModel: RemoteModelFor<AnyMessageModel>,
): MessagePropsFromBackend['text'] {
    const {type} = viewModel.body;

    switch (type) {
        case 'quote':
        case 'text':
            return {
                mentions: viewModel.mentions,
                raw: viewModel.body.body.text,
            };

        case 'location':
            return undefined;

        case 'audio':
        case 'image':
        case 'video':
        case 'file':
            return viewModel.body.body.caption === undefined
                ? undefined
                : {
                      mentions: viewModel.mentions,
                      raw: viewModel.body.body.caption,
                  };

        default:
            return unreachable(type);
    }
}

function getMessageFile(
    viewModel: Remote<ConversationMessageViewModel>,
    viewModelController: RemoteProxy<IConversationMessageViewModelController>,
    messageModel: RemoteModelFor<AnyMessageModel>,
): MessagePropsFromBackend['file'] {
    const {type} = messageModel;
    if (type === 'text') {
        return undefined;
    }

    const renderingType = type === 'image' ? messageModel.view.renderingType : undefined;
    let imageRenderingType: NonNullable<MessagePropsFromBackend['file']>['imageRenderingType'];
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
        fetchFileBytes: async () => {
            switch (type) {
                case 'audio':
                case 'file':
                case 'image':
                case 'video':
                    return await viewModelController.getBlob();

                default:
                    return unreachable(messageModel);
            }
        },
        imageRenderingType,
        mediaType: messageModel.view.mediaType,
        name: {
            raw: messageModel.view.fileName,
            default: 'download',
        },
        // Note: Use actual file size if available, and fall back to declared file size otherwise
        sizeInBytes: messageModel.view.fileData?.unencryptedByteCount ?? messageModel.view.fileSize,
        sync: {
            state: viewModel.body.state.type,
            direction: viewModel.syncDirection,
        },
        type: messageModel.type,
        thumbnail: getMessageThumbnail(viewModel, viewModelController, messageModel),
    };
}

function getMessageThumbnail(
    viewModel: Remote<ConversationMessageViewModel>,
    viewModelController: RemoteProxy<IConversationMessageViewModelController>,
    messageModel: RemoteModelFor<
        | InboundAudioMessage['model']
        | InboundFileMessage['model']
        | InboundImageMessage['model']
        | InboundVideoMessage['model']
        | OutboundAudioMessage['model']
        | OutboundFileMessage['model']
        | OutboundImageMessage['model']
        | OutboundVideoMessage['model']
    >,
): NonNullable<MessagePropsFromBackend['file']>['thumbnail'] {
    switch (messageModel.type) {
        case 'file':
        case 'audio':
            return undefined;

        case 'image':
        case 'video':
            return {
                expectedDimensions: messageModel.view.dimensions,
                fetchThumbnailBytes: async () => await viewModelController.getThumbnail(),
                mediaType: messageModel.view.thumbnailMediaType ?? 'image/jpeg',
            };

        default:
            return unreachable(messageModel);
    }
}
