import type {Conversation} from '~/common/model';
import type {SetOfAnyLocalMessageModelStore} from '~/common/model/types/message';
import type {LocalModelStore} from '~/common/model/utils/model-store';
import type {MessageId} from '~/common/network/types';
import {
    type PropertiesMarked,
    PROXY_HANDLER,
    type ProxyMarked,
    TRANSFER_HANDLER,
} from '~/common/utils/endpoint';
import {type IQueryableStore, WritableStore} from '~/common/utils/store';
import {LocalDerivedSetStore} from '~/common/utils/store/set-store';
import type {IViewModelRepository, ServicesForViewModel} from '~/common/viewmodel';
import type {ConversationMessageViewModelBundle} from '~/common/viewmodel/conversation-message';

export interface ConversationMessageSetViewModel extends PropertiesMarked {
    readonly controller: IConversationMessageSetController;
    readonly store: ConversationMessageSetStore;
}

export type ConversationMessageSetStore = LocalDerivedSetStore<
    SetOfAnyLocalMessageModelStore,
    ConversationMessageViewModelBundle
>;

interface IConversationMessageSetController extends ProxyMarked {
    /**
     * Set the currently visible messages in conversation viewport.
     *
     * Used to calculate the fetched (and prefetched) messages from the model store / database.
     */
    readonly setCurrentViewportMessages: (messageIds: MessageId[]) => void;
}

class ConversationMessageSetController implements IConversationMessageSetController {
    public [TRANSFER_HANDLER] = PROXY_HANDLER;

    private readonly _currentViewportMessagesStore = new WritableStore<MessageId[]>([]);

    public get currentViewportMessages(): IQueryableStore<MessageId[]> {
        return this.currentViewportMessages;
    }

    /** @inheritdoc */
    public setCurrentViewportMessages(messageIds: MessageId[]): void {
        this._currentViewportMessagesStore.set(messageIds);
    }
}

function getConversationMessageSetStore(
    viewModelRepository: IViewModelRepository,
    conversation: LocalModelStore<Conversation>,
): ConversationMessageSetStore {
    const conversationModel = conversation.get();
    const messageSetStore = conversationModel.controller.getAllMessages();

    return new LocalDerivedSetStore(messageSetStore, (store) =>
        viewModelRepository.conversationMessage(conversation, store),
    );
}

/**
 * Get a ViewModel that contains a Set of Conversationmessages for a receiver.
 */
export function getConversationMessageSetViewModel(
    services: ServicesForViewModel,
    viewModelrepository: IViewModelRepository,
    conversation: LocalModelStore<Conversation>,
): ConversationMessageSetViewModel {
    const {endpoint} = services;

    const controller = new ConversationMessageSetController();
    const store = getConversationMessageSetStore(viewModelrepository, conversation);

    return endpoint.exposeProperties({controller, store});
}
