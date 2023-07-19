import {NACL_CONSTANTS} from '~/common/crypto';
import {randomString} from '~/common/crypto/random';
import {ImageRenderingType, MessageDirection, MessageType} from '~/common/enum';
import {type Logger} from '~/common/logging';
import {type Conversation} from '~/common/model';
import {type AnyReceiverStore} from '~/common/model/types/receiver';
import {type LocalModelStore} from '~/common/model/utils/model-store';
import {
    type OutboundFileMessageInitFragment,
    type OutboundImageMessageInitFragment,
    type OutboundTextMessageInitFragment,
} from '~/common/network/protocol/task/message-processing-helpers';
import {randomMessageId} from '~/common/network/protocol/utils';
import {type MessageId} from '~/common/network/types';
import {wrapRawBlobKey} from '~/common/network/types/keys';
import {type Dimensions, type ReadonlyUint8Array, type u53} from '~/common/types';
import {unreachable} from '~/common/utils/assert';
import {
    type PropertiesMarked,
    PROXY_HANDLER,
    type ProxyMarked,
    type Remote,
    TRANSFER_HANDLER,
} from '~/common/utils/endpoint';
import {type LocalStore} from '~/common/utils/store';
import {derive} from '~/common/utils/store/derived-store';
import {type IViewModelRepository, type ServicesForViewModel} from '~/common/viewmodel';
import {type ConversationMessage} from '~/common/viewmodel/conversation-message';
import {type ConversationMessageSetStore} from '~/common/viewmodel/conversation-message-set';
import {
    type TransformedReceiverData,
    transformReceiver,
} from '~/common/viewmodel/svelte-components-transformations';

export interface SendTextMessageEventDetail {
    readonly type: 'text';
    readonly text: string;
    readonly quotedMessageId?: MessageId | undefined;
}
export interface SendFileBasedMessagesEventDetail {
    readonly type: 'files';
    readonly files: {
        readonly bytes: ReadonlyUint8Array;
        readonly thumbnailBytes?: ReadonlyUint8Array;
        readonly caption?: string;
        readonly fileName: string;
        readonly fileSize: u53;
        readonly mediaType: string;
        readonly dimensions?: Dimensions;
    }[];
}
export type SendMessageEventDetail = SendTextMessageEventDetail | SendFileBasedMessagesEventDetail;

export interface IConversationViewModelController extends ProxyMarked {
    getConversationMessagesSetStore: () => ConversationMessageSetStore;
    getConversationMessage: (messageId: MessageId) => ConversationMessage | undefined;
    sendMessage: (messageEventDetail: Remote<SendMessageEventDetail>) => Promise<void>;
}

type OmittedKeys = 'direction' | 'id' | 'createdAt';
type OutgoingMessageInitFragment =
    | Omit<OutboundTextMessageInitFragment, OmittedKeys>
    | Omit<OutboundFileMessageInitFragment, OmittedKeys>
    | Omit<OutboundImageMessageInitFragment, OmittedKeys>;

export class ConversationViewModelController implements IConversationViewModelController {
    public readonly [TRANSFER_HANDLER] = PROXY_HANDLER;

    private readonly _log: Logger;

    public constructor(
        private readonly _services: ServicesForViewModel,
        private readonly _conversation: LocalModelStore<Conversation>,
        private readonly _viewModelRepository: IViewModelRepository,
    ) {
        this._log = _services.logging.logger('viewmodel.conversation.controller');
    }

    public getConversationMessagesSetStore(): ConversationMessageSetStore {
        return this._viewModelRepository.conversationMessageSet(this._conversation);
    }

    public getConversationMessage(messageId: MessageId): ConversationMessage | undefined {
        return this._viewModelRepository.conversationMessageById(this._conversation, messageId);
    }

    public async sendMessage(messageEventDetail: Remote<SendMessageEventDetail>): Promise<void> {
        const {crypto} = this._services;

        let outgoingMessageInitFragments: OutgoingMessageInitFragment[] = [];
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

    /**
     * Generate outgoing message init fragments based on the files. These files may be sent as raw
     * files or as media files, depending on the media type.
     */
    private async _prepareFileBasedMessageInitFragments(
        files: SendFileBasedMessagesEventDetail['files'],
    ): Promise<OutgoingMessageInitFragment[]> {
        const {crypto, file} = this._services;

        const outgoingMessageInitFragments: OutgoingMessageInitFragment[] = [];

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
            if (fileInfo.mediaType.startsWith('image/')) {
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

export interface ConversationViewModel extends PropertiesMarked {
    readonly conversation: LocalModelStore<Conversation>;
    readonly receiver: AnyReceiverStore;
    readonly viewModelController: IConversationViewModelController;
    readonly viewModel: InnerConversationViewModelStore;
}

interface InnerConversationViewModel extends PropertiesMarked {
    readonly receiver: TransformedReceiverData;
}

export type InnerConversationViewModelStore = LocalStore<InnerConversationViewModel>;

/**
 * Get a SetStore that contains a ConversationPreview for a receiver.
 */
export function getConversationViewModel(
    services: ServicesForViewModel,
    conversation: LocalModelStore<Conversation>,
    viewModelRepository: IViewModelRepository,
): ConversationViewModel {
    const {endpoint} = services;

    const receiver = conversation.get().controller.receiver();
    const viewModel = getInnerConversationViewModelStore(services, conversation);
    const viewModelController = new ConversationViewModelController(
        services,
        conversation,
        viewModelRepository,
    );
    return endpoint.exposeProperties({conversation, receiver, viewModelController, viewModel});
}

function getInnerConversationViewModelStore(
    {endpoint, model}: ServicesForViewModel,
    conversationStore: LocalModelStore<Conversation>,
): LocalStore<InnerConversationViewModel> {
    return derive(conversationStore, (conversationModel, getAndSubscribe) => {
        const receiver = getAndSubscribe(conversationModel.controller.receiver());
        const profilePicture = getAndSubscribe(receiver.controller.profilePicture);
        return endpoint.exposeProperties({
            receiver: transformReceiver(receiver, profilePicture, model, getAndSubscribe),
        });
    });
}
