import type {Conversation} from '~/common/model';
import type {
    AnyMessageModelStore,
    SetOfAnyLocalMessageModelStore,
} from '~/common/model/types/message';
import type {LocalModelStore} from '~/common/model/utils/model-store';
import type {MessageId} from '~/common/network/types';
import {
    type PropertiesMarked,
    PROXY_HANDLER,
    type ProxyMarked,
    TRANSFER_HANDLER,
} from '~/common/utils/endpoint';
import {type IQueryableStore, WritableStore} from '~/common/utils/store';
import {derive} from '~/common/utils/store/derived-store';
import {LocalDerivedSetStore, LocalSetDerivedSetStore} from '~/common/utils/store/set-store';
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
        return this._currentViewportMessagesStore;
    }

    /** @inheritdoc */
    public setCurrentViewportMessages(messageIds: MessageId[]): void {
        this._currentViewportMessagesStore.set(messageIds);
    }
}

function getConversationMessageSetStore(
    viewModelRepository: IViewModelRepository,
    conversation: LocalModelStore<Conversation>,
    messageSetStore: SetOfAnyLocalMessageModelStore,
): ConversationMessageSetStore {
    return new LocalDerivedSetStore(messageSetStore, (store) =>
        viewModelRepository.conversationMessage(conversation, store),
    );
}

/**
 * Get a ViewModel that contains a Set of conversation messages for a receiver.
 */
export function getConversationMessageSetViewModel(
    services: ServicesForViewModel,
    viewModelrepository: IViewModelRepository,
    conversation: LocalModelStore<Conversation>,
): ConversationMessageSetViewModel {
    const {endpoint} = services;

    const controller = new ConversationMessageSetController();

    const conversationModel = conversation.get();

    const activeMessageStores = derive(
        controller.currentViewportMessages,
        (viewPortMessageIds, getAndSubscribe) => {
            const mutableViewPortMessageIds = [...viewPortMessageIds];
            // Subscribe to the last messages store so we receive updates when the last message is
            // updated as well.

            // TODO: How to update if a reflected message updates other messages than the last?
            // Create a store for "conversation updates", which holds the date of the last update.
            // Look at `lastMessage` update in conversation to find the location to add this.

            const activeMessageSet = new Set<AnyMessageModelStore>();

            // If no message is visible currently (might happen during initialization), use last
            // message in chat.
            if (viewPortMessageIds.length === 0) {
                const lastMessageId = getAndSubscribe(
                    conversationModel.controller.lastMessageStore(),
                )?.get().view.id;
                if (lastMessageId !== undefined) {
                    mutableViewPortMessageIds.push(lastMessageId);
                }
            }

            for (const viewPortMessageId of mutableViewPortMessageIds) {
                const surroundingMessages =
                    // TODO: The db call does not work on messages that have no sent date yet -
                    // which might be the case (fah has such a message). -> fah has added a solution.
                    conversationModel.controller.getMessageWithSurroundingMessages(
                        viewPortMessageId,
                        150, // TODO: Is this a good value? Should it be dynamic?
                    );

                if (surroundingMessages === undefined) {
                    continue;
                }
                for (const messageModel of surroundingMessages) {
                    activeMessageSet.add(messageModel);
                }
            }

            return activeMessageSet;
        },
    );

    const deltaSetStore = new LocalSetDerivedSetStore(activeMessageStores);

    const store = getConversationMessageSetStore(viewModelrepository, conversation, deltaSetStore);

    return endpoint.exposeProperties({controller, store});
}
