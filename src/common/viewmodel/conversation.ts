import {MessageDirection} from '~/common/enum';
import {type Logger} from '~/common/logging';
import {type AnyReceiverStore, type Conversation} from '~/common/model';
import {type LocalModelStore} from '~/common/model/utils/model-store';
import {randomMessageId} from '~/common/network/protocol/utils';
import {type MessageId} from '~/common/network/types';
import {type u64} from '~/common/types';
import {unreachable} from '~/common/utils/assert';
import {
    type PropertiesMarked,
    PROXY_HANDLER,
    type ProxyMarked,
    type Remote,
    TRANSFER_MARKER,
} from '~/common/utils/endpoint';
import {type LocalStore} from '~/common/utils/store';
import {derive} from '~/common/utils/store/derived-store';
import {type IViewModelBackend, type ServicesForViewModel} from '~/common/viewmodel';
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
              fileSize: u64;
              mimeType: string;
          }[];
      };

export interface IConversationViewModelController extends ProxyMarked {
    getConversationMessagesSetStore: () => ConversationMessageSetStore;
    getConversationMessage: (messageId: MessageId) => ConversationMessage | undefined;
    sendMessage: (messageEventDetail: Remote<SendMessageEventDetail>) => Promise<void>;
}

export class ConversationViewModelController implements IConversationViewModelController {
    public readonly [TRANSFER_MARKER] = PROXY_HANDLER;

    private readonly _log: Logger;

    public constructor(
        private readonly _services: ServicesForViewModel,
        private readonly _conversation: LocalModelStore<Conversation>,
        private readonly _viewModelBackend: IViewModelBackend,
    ) {
        this._log = _services.logging.logger('viewmodel.conversation.controller');
    }

    public getConversationMessagesSetStore(): ConversationMessageSetStore {
        return this._viewModelBackend.conversationMessageSet(this._conversation);
    }

    public getConversationMessage(messageId: MessageId): ConversationMessage | undefined {
        return this._viewModelBackend.conversationMessage(this._conversation, messageId, undefined);
    }

    public async sendMessage(messageEventDetail: Remote<SendMessageEventDetail>): Promise<void> {
        const {crypto} = this._services;
        let outgoingMessages: {
            readonly type: 'text';
            readonly text: string;
        }[];

        switch (messageEventDetail.type) {
            case 'text':
                outgoingMessages = [messageEventDetail];
                break;
            case 'files':
                // TODO(DESK-316)
                this._log.error(
                    `TODO(DESK-316): Upload and send ${messageEventDetail.files.length} outgoing files: `,
                    messageEventDetail.files,
                );
                outgoingMessages = [];
                break;
            default:
                unreachable(messageEventDetail);
        }

        for (const message of outgoingMessages) {
            const id = randomMessageId(crypto);
            this._log.debug(`Send ${message.type} message with id ${id}`);

            await this._conversation.get().controller.addMessage.fromLocal({
                direction: MessageDirection.OUTBOUND,
                id,
                createdAt: new Date(),
                ...message,
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
    viewModelBackend: IViewModelBackend,
): ConversationViewModel {
    const {endpoint} = services;

    const receiver = conversation.get().controller.receiver();
    const viewModel = getInnerConversationViewModelStore(services, conversation);
    const viewModelController = new ConversationViewModelController(
        services,
        conversation,
        viewModelBackend,
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
            receiver: transformReceiver(receiver, profilePicture, model),
        });
    });
}
