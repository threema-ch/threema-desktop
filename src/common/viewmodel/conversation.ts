import {type AnyReceiverStore, type Conversation} from '~/common/model';
import {type LocalModelStore} from '~/common/model/utils/model-store';
import {type MessageId} from '~/common/network/types';
import {
    type PropertiesMarked,
    PROXY_HANDLER,
    type ProxyMarked,
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

interface IConversationViewModelController extends ProxyMarked {
    getConversationMessagesSetStore: () => ConversationMessageSetStore;
    getConversationMessage: (messageId: MessageId) => ConversationMessage | undefined;
}

export class ConversationViewModelController implements IConversationViewModelController {
    public readonly [TRANSFER_MARKER] = PROXY_HANDLER;

    public constructor(
        private readonly _conversation: LocalModelStore<Conversation>,
        private readonly _viewModelBackend: IViewModelBackend,
    ) {}

    public getConversationMessagesSetStore(): ConversationMessageSetStore {
        return this._viewModelBackend.conversationMessageSet(this._conversation);
    }

    public getConversationMessage(messageId: MessageId): ConversationMessage | undefined {
        return this._viewModelBackend.conversationMessage(this._conversation, messageId, undefined);
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
    const viewModelController = new ConversationViewModelController(conversation, viewModelBackend);
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
