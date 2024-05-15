import {NACL_CONSTANTS} from '~/common/crypto';
import {randomString} from '~/common/crypto/random';
import type {DbReceiverLookup} from '~/common/db';
import {
    ConversationVisibility,
    ImageRenderingType,
    MessageDirection,
    MessageType,
} from '~/common/enum';
import type {Logger} from '~/common/logging';
import type {Conversation} from '~/common/model';
import type {LocalModelStore} from '~/common/model/utils/model-store';
import {randomMessageId} from '~/common/network/protocol/utils';
import type {MessageId, StatusMessageId} from '~/common/network/types';
import {wrapRawBlobKey} from '~/common/network/types/keys';
import {unreachable} from '~/common/utils/assert';
import {
    PROXY_HANDLER,
    type ProxyMarked,
    type Remote,
    TRANSFER_HANDLER,
} from '~/common/utils/endpoint';
import {isSupportedImageType} from '~/common/utils/image';
import {type IQueryableStore, WritableStore} from '~/common/utils/store';
import type {IViewModelRepository, ServicesForViewModel} from '~/common/viewmodel';
import type {
    SendMessageEventDetail,
    SendFileBasedMessageEventDetail,
    OutboundMessageInitFragment,
} from '~/common/viewmodel/conversation/main/controller/types';
import type {ConversationMessageViewModelBundle} from '~/common/viewmodel/conversation/main/message';

export interface IConversationViewModelController extends ProxyMarked {
    readonly archive: () => Promise<void>;
    /**
     * Clear the conversation by deleting all stored messages.
     */
    readonly clear: () => Promise<void>;
    readonly delete: () => Promise<void>;
    readonly deleteMessage: (messageId: MessageId) => Promise<void>;
    readonly deleteStatusMessage: (statusMessageId: StatusMessageId) => Promise<void>;
    readonly deleteMessageForEveryone: (messageId: MessageId) => Promise<void>;
    readonly findForwardedMessage: (
        receiverLookup: DbReceiverLookup,
        messageId: MessageId,
    ) => ConversationMessageViewModelBundle | undefined;
    readonly markAllMessagesAsRead: () => Promise<void>;
    readonly pin: () => Promise<void>;
    readonly sendMessage: (messageEventDetail: Remote<SendMessageEventDetail>) => Promise<void>;
    /**
     * Set the currently visible messages in conversation viewport.
     *
     * Used to calculate the fetched (and prefetched) messages from the model store / database.
     *
     * Note: Make sure to pass in a new `Set` each time, otherwise store changes won't be
     *       propagated!
     */
    readonly setCurrentViewportMessages: (messageIds: Set<MessageId | StatusMessageId>) => void;
    readonly unarchive: () => Promise<void>;
    readonly unpin: () => Promise<void>;
    get currentViewportMessages(): IQueryableStore<Set<MessageId | StatusMessageId>>;
}

export class ConversationViewModelController implements IConversationViewModelController {
    public readonly [TRANSFER_HANDLER] = PROXY_HANDLER;

    private readonly _log: Logger;
    private readonly _currentViewportMessagesStore = new WritableStore<
        Set<MessageId | StatusMessageId>
    >(new Set());

    public constructor(
        private readonly _services: ServicesForViewModel,
        private readonly _conversation: LocalModelStore<Conversation>,
        private readonly _viewModelRepository: IViewModelRepository,
    ) {
        this._log = _services.logging.logger('viewmodel.conversation.main.controller');
    }

    public get currentViewportMessages(): IQueryableStore<Set<MessageId | StatusMessageId>> {
        return this._currentViewportMessagesStore;
    }

    public async archive(): Promise<void> {
        return await this._conversation
            .get()
            .controller.updateVisibility.fromLocal(ConversationVisibility.ARCHIVED);
    }

    public async clear(): Promise<void> {
        await this._conversation.get().controller.removeAllStatusMessages.fromLocal();
        return await this._conversation.get().controller.removeAllMessages.fromLocal();
    }

    /** @inheritdoc */
    public async delete(): Promise<void> {
        // Clear all conversation contents.
        await this.clear();

        // Soft-delete the conversation (i.e., the conversation is kept in the database but is not
        // shown in the conversation list anymore).
        return this._conversation.get().controller.update.fromSync({lastUpdate: undefined});
    }

    public async deleteMessage(messageId: MessageId): Promise<void> {
        return await this._conversation.get().controller.removeMessageLocally.fromLocal(messageId);
    }

    public async deleteStatusMessage(statusMessageId: StatusMessageId): Promise<void> {
        return await this._conversation
            .get()
            .controller.removeStatusMessage.fromLocal(statusMessageId);
    }

    public async deleteMessageForEveryone(messageId: MessageId): Promise<void> {
        return await this._conversation
            .get()
            .controller.deleteMessage.fromLocal(messageId, new Date());
    }

    public findForwardedMessage(
        receiverLookup: DbReceiverLookup,
        messageId: MessageId,
    ): ConversationMessageViewModelBundle | undefined {
        const forwardedConversationModelStore =
            this._services.model.conversations.getForReceiver(receiverLookup);
        if (forwardedConversationModelStore === undefined) {
            return undefined;
        }

        const forwardedMessageModelStore = forwardedConversationModelStore
            .get()
            .controller.getMessage(messageId);
        if (forwardedMessageModelStore === undefined) {
            return undefined;
        }

        return this._viewModelRepository.conversationMessage(
            forwardedConversationModelStore,
            forwardedMessageModelStore,
        );
    }

    public async markAllMessagesAsRead(): Promise<void> {
        return await this._conversation.get().controller.read.fromLocal(new Date());
    }

    public async pin(): Promise<void> {
        return await this._conversation
            .get()
            .controller.updateVisibility.fromLocal(ConversationVisibility.PINNED);
    }

    public async sendMessage(messageEventDetail: Remote<SendMessageEventDetail>): Promise<void> {
        const {crypto} = this._services;

        let outgoingMessageInitFragments: OutboundMessageInitFragment[] = [];
        switch (messageEventDetail.type) {
            case 'text':
                outgoingMessageInitFragments = [
                    {
                        type: 'text',
                        text: messageEventDetail.text,
                        quotedMessageId: messageEventDetail.quotedMessageId,
                    },
                ];
                break;
            case 'files':
                outgoingMessageInitFragments = await this._prepareFileBasedMessageInitFragments(
                    messageEventDetail.files,
                );
                break;
            default:
                unreachable(messageEventDetail);
        }

        for (const init of outgoingMessageInitFragments) {
            const id = randomMessageId(crypto);
            this._log.debug(`Send ${init.type} message with id ${id}`);

            await this._conversation.get().controller.addMessage.fromLocal({
                direction: MessageDirection.OUTBOUND,
                id,
                createdAt: new Date(),
                ...init,
            });
        }
    }

    /** @inheritdoc */
    public setCurrentViewportMessages(messageIds: Set<MessageId | StatusMessageId>): void {
        this._currentViewportMessagesStore.set(messageIds);
    }

    public async unarchive(): Promise<void> {
        return await this._conversation
            .get()
            .controller.updateVisibility.fromLocal(ConversationVisibility.SHOW);
    }

    public async unpin(): Promise<void> {
        return await this._conversation
            .get()
            .controller.updateVisibility.fromLocal(ConversationVisibility.SHOW);
    }

    /**
     * Generate outgoing message init fragments based on the files. These files may be sent as raw
     * files or as media files, depending on the media type.
     */
    private async _prepareFileBasedMessageInitFragments(
        files: SendFileBasedMessageEventDetail['files'],
    ): Promise<OutboundMessageInitFragment[]> {
        const {crypto, file} = this._services;

        const outgoingMessageInitFragments: OutboundMessageInitFragment[] = [];

        // If more than 1 file is being sent, set a correlation ID
        const correlationId = files.length > 1 ? randomString(crypto, 32) : undefined;

        for (const fileInfo of files) {
            // Generate random blob encryption key for the blobs (which will be encrypted and
            // uploaded by the outgoing conversation message task)
            const encryptionKey = wrapRawBlobKey(
                crypto.randomBytes(new Uint8Array(NACL_CONSTANTS.KEY_LENGTH)),
            );

            // Store data in file system
            const fileData = await file.store(fileInfo.bytes);
            const thumbnailFileData =
                fileInfo.thumbnailBytes !== undefined
                    ? await file.store(fileInfo.thumbnailBytes)
                    : undefined;

            // Determine message type based on media type
            let messageType: MessageType;
            if (isSupportedImageType(fileInfo.mediaType) && !fileInfo.sendAsFile) {
                messageType = MessageType.IMAGE;
            } else {
                messageType = MessageType.FILE;
            }

            // Determine init based on type
            const commonFileProperties = {
                caption: fileInfo.caption?.length === 0 ? undefined : fileInfo.caption,
                correlationId,
                encryptionKey,
                fileName: fileInfo.fileName,
                fileSize: fileInfo.fileSize,
                mediaType: fileInfo.mediaType,
                thumbnailMediaType: fileInfo.thumbnailMediaType,
                fileData,
                thumbnailFileData,
            };
            switch (messageType) {
                case MessageType.FILE:
                    outgoingMessageInitFragments.push({
                        type: 'file',
                        ...commonFileProperties,
                    });
                    break;
                case MessageType.IMAGE: {
                    outgoingMessageInitFragments.push({
                        type: 'image',
                        ...commonFileProperties,
                        renderingType: ImageRenderingType.REGULAR,
                        animated: false, // TODO(DESK-1115)
                        dimensions: fileInfo.dimensions,
                    });
                    break;
                }
                default:
                    unreachable(messageType);
            }
        }

        return outgoingMessageInitFragments;
    }
}
