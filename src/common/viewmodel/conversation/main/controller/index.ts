import {NACL_CONSTANTS} from '~/common/crypto';
import {randomString} from '~/common/crypto/random';
import type {DbReceiverLookup} from '~/common/db';
import {
    ConversationVisibility,
    ImageRenderingType,
    MessageDirection,
    MessageType,
    ReceiverType,
} from '~/common/enum';
import {TRANSFER_HANDLER} from '~/common/index';
import type {Logger} from '~/common/logging';
import type {Conversation} from '~/common/model';
import type {LocalModelStore} from '~/common/model/utils/model-store';
import {randomMessageId} from '~/common/network/protocol/utils';
import type {MessageId, StatusMessageId} from '~/common/network/types';
import {wrapRawBlobKey} from '~/common/network/types/keys';
import {assert, unreachable} from '~/common/utils/assert';
import {PROXY_HANDLER, type ProxyMarked, type Remote} from '~/common/utils/endpoint';
import {isSupportedImageType} from '~/common/utils/image';
import type {RemoteAbortListener} from '~/common/utils/signal';
import {type IQueryableStore, WritableStore} from '~/common/utils/store';
import type {IViewModelRepository, ServicesForViewModel} from '~/common/viewmodel';
import type {
    SendMessageEventDetail,
    SendFileBasedMessageEventDetail,
    OutboundMessageInitFragment,
} from '~/common/viewmodel/conversation/main/controller/types';
import type {ConversationRegularMessageViewModelBundle} from '~/common/viewmodel/conversation/main/message/regular-message';
import {
    getOngoingGroupCallViewModelBundle,
    type OngoingGroupCallViewModelBundle,
} from '~/common/viewmodel/group-call/activity';

export interface IConversationViewModelController extends ProxyMarked {
    readonly currentViewportMessages: IQueryableStore<Set<MessageId | StatusMessageId>>;
    readonly archive: () => Promise<void>;
    /**
     * Clear the conversation by deleting all stored messages.
     */
    readonly clear: () => Promise<void>;
    readonly delete: () => Promise<void>;
    readonly removeMessage: (messageId: MessageId) => Promise<void>;
    readonly markMessageAsDeleted: (messageId: MessageId) => Promise<void>;
    readonly removeStatusMessage: (statusMessageId: StatusMessageId) => Promise<void>;
    readonly findForwardedMessage: (
        receiverLookup: DbReceiverLookup,
        messageId: MessageId,
    ) => ConversationRegularMessageViewModelBundle | undefined;
    readonly markAllMessagesAsRead: () => Promise<void>;
    readonly pin: () => Promise<void>;
    readonly sendMessage: (messageEventDetail: Remote<SendMessageEventDetail>) => Promise<void>;
    readonly sendIsTyping: (value: boolean) => Promise<void>;
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

    /**
     * Group-specific controller.
     *
     * TODO(DESK-1469): Workaround because we're unable to narrow down conversation view model type
     * based on `ReceiverType` because of a limitation of `Remote` that erases the possibility to
     * narrow. We may want to resolve this properly at some point.
     */
    readonly group: {
        /** See `GroupController.joinCall<'join'>` */
        readonly joinCall: (
            cancel: RemoteAbortListener<unknown>,
        ) => Promise<OngoingGroupCallViewModelBundle | undefined>;

        /** See `GroupController.joinCall<'join-or-create'>` */
        readonly joinOrCreateCall: (
            cancel: RemoteAbortListener<unknown>,
        ) => Promise<OngoingGroupCallViewModelBundle>;
    } & ProxyMarked;
}

export class ConversationViewModelController implements IConversationViewModelController {
    public readonly [TRANSFER_HANDLER] = PROXY_HANDLER;

    public group = {
        [TRANSFER_HANDLER]: PROXY_HANDLER,
        joinCall: async (
            cancel: RemoteAbortListener<unknown>,
        ): Promise<OngoingGroupCallViewModelBundle | undefined> =>
            await this._joinCall('join', cancel),
        joinOrCreateCall: async (
            cancel: RemoteAbortListener<unknown>,
        ): Promise<OngoingGroupCallViewModelBundle> =>
            await this._joinCall('join-or-create', cancel),
    };

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

    public async removeMessage(messageId: MessageId): Promise<void> {
        return await this._conversation.get().controller.removeMessage.fromLocal(messageId);
    }

    public async removeStatusMessage(statusMessageId: StatusMessageId): Promise<void> {
        return await this._conversation
            .get()
            .controller.removeStatusMessage.fromLocal(statusMessageId);
    }

    public async markMessageAsDeleted(messageId: MessageId): Promise<void> {
        return await this._conversation
            .get()
            .controller.markMessageAsDeleted.fromLocal(messageId, new Date());
    }

    public findForwardedMessage(
        receiverLookup: DbReceiverLookup,
        messageId: MessageId,
    ): ConversationRegularMessageViewModelBundle | undefined {
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
        if (forwardedMessageModelStore.type === MessageType.DELETED) {
            this._log.error(`Message with id "${messageId}" is deleted and cannot be forwarded`);
            return undefined;
        }

        return this._viewModelRepository.conversationRegularMessage(
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

    public async sendIsTyping(value: boolean): Promise<void> {
        return await this._conversation.get().controller.updateTyping.fromLocal(value);
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

    private async _joinCall<TIntent = 'join' | 'join-or-create'>(
        intent: TIntent,
        cancel: RemoteAbortListener<unknown>,
    ): Promise<
        TIntent extends 'join'
            ? OngoingGroupCallViewModelBundle | undefined
            : OngoingGroupCallViewModelBundle
    > {
        const receiver = this._conversation.get().controller.receiver();
        assert(receiver.type === ReceiverType.GROUP);
        const ongoing = await receiver.get().controller.joinCall(intent, cancel);
        if (ongoing === undefined) {
            return undefined as TIntent extends 'join'
                ? OngoingGroupCallViewModelBundle | undefined
                : OngoingGroupCallViewModelBundle;
        }
        return getOngoingGroupCallViewModelBundle(this._services, ongoing);
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
