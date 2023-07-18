import {NACL_CONSTANTS} from '~/common/crypto';
import {randomString} from '~/common/crypto/random';
import {MessageDirection} from '~/common/enum';
import {type Logger} from '~/common/logging';
import {type Conversation} from '~/common/model';
import {type AnyReceiverStore} from '~/common/model/types/receiver';
import {type LocalModelStore} from '~/common/model/utils/model-store';
import {
    type OutboundFileMessageInitFragment,
    type OutboundTextMessageInitFragment,
} from '~/common/network/protocol/task/message-processing-helpers';
import {randomMessageId} from '~/common/network/protocol/utils';
import {type MessageId} from '~/common/network/types';
import {wrapRawBlobKey} from '~/common/network/types/keys';
import {type u53} from '~/common/types';
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

export type SendMessageEventDetail =
    | {
          readonly type: 'text';
          readonly text: string;
          readonly quotedMessageId?: MessageId | undefined;
      }
    | {
          readonly type: 'files';
          readonly files: {
              readonly blob: Uint8Array;
              readonly caption?: string;
              fileName: string;
              fileSize: u53;
              mediaType: string;
          }[];
      };

export interface IConversationViewModelController extends ProxyMarked {
    getConversationMessagesSetStore: () => ConversationMessageSetStore;
    getConversationMessage: (messageId: MessageId) => ConversationMessage | undefined;
    sendMessage: (messageEventDetail: Remote<SendMessageEventDetail>) => Promise<void>;
}

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
        const {crypto, file} = this._services;
        type OmittedKeys = 'direction' | 'id' | 'createdAt';
        type OutgoingMessageInitFragment =
            | Omit<OutboundTextMessageInitFragment, OmittedKeys>
            | Omit<OutboundFileMessageInitFragment, OmittedKeys>;
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
            case 'files': {
                // If more than 1 file is being sent, set a correlation ID
                const correlationId =
                    messageEventDetail.files.length > 1 ? randomString(crypto, 32) : undefined;

                for (const fileInfo of messageEventDetail.files) {
                    // Generate random blob encryption key for the blobs (which will be encrypted and
                    // uploaded by the outgoing conversation message task)
                    const encryptionKey = wrapRawBlobKey(
                        crypto.randomBytes(new Uint8Array(NACL_CONSTANTS.KEY_LENGTH)),
                    );

                    // Store data in file system
                    const fileData = await file.store(fileInfo.blob);

                    // TODO(DESK-958): Generate a thumbnail for media files
                    outgoingMessageInitFragments.push({
                        type: 'file', // TODO(DESK-958): Might also be 'image', 'video' or something else.
                        caption: fileInfo.caption,
                        correlationId,
                        encryptionKey,
                        fileName: fileInfo.fileName,
                        fileSize: fileInfo.fileSize,
                        mediaType: fileInfo.mediaType,
                        fileData,
                    });
                }
                break;
            }
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
