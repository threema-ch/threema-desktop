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
import {LocalDerivedSetStore, LocalSetBasedSetStore} from '~/common/utils/store/set-store';
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
     *
     * Note: Make sure to pass in a new `Set` each time, otherwise store changes won't be
     *       propagated!
     */
    readonly setCurrentViewportMessages: (messageIds: Set<MessageId>) => void;
}

class ConversationMessageSetController implements IConversationMessageSetController {
    public [TRANSFER_HANDLER] = PROXY_HANDLER;

    private readonly _currentViewportMessagesStore = new WritableStore<Set<MessageId>>(new Set());

    public get currentViewportMessages(): IQueryableStore<Set<MessageId>> {
        return this._currentViewportMessagesStore;
    }

    /** @inheritdoc */
    public setCurrentViewportMessages(messageIds: Set<MessageId>): void {
        this._currentViewportMessagesStore.set(messageIds);
    }
}

/**
 * Get a ViewModel that contains a Set of conversation messages for a receiver.
 */
export function getConversationMessageSetViewModel(
    services: ServicesForViewModel,
    viewModelRepository: IViewModelRepository,
    conversation: LocalModelStore<Conversation>,
): ConversationMessageSetViewModel {
    const {endpoint, logging} = services;

    const controller = new ConversationMessageSetController();

    const conversationModel = conversation.get();

    // Options for all derived stores below
    const tag = `conversation-message[]`;
    const storeOptions = {
        debug: {
            log: logging.logger(`model.${tag}`),
            tag,
        },
    };

    // Based on the currently visible messages in the viewport, derive a set of message stores
    // including context above and below the current viewport.
    const activeMessageStores = derive(
        controller.currentViewportMessages,
        (viewPortMessageIds, getAndSubscribe) => {
            const mutableViewPortMessageIds = [...viewPortMessageIds];

            // Subscribe to the "last conversation update" store. This ensures that the active
            // messages are re-derived whenever a message is added to or removed from the
            // conversation.
            getAndSubscribe(conversationModel.controller.lastConversationUpdateStore());

            const activeMessageSet = new Set<AnyMessageModelStore>();

            // If no message is visible currently (might happen during initialization), use last
            // message in chat.
            if (viewPortMessageIds.size === 0) {
                const lastMessageId = conversationModel.controller.lastMessageStore().get()?.get()
                    .view.id;
                if (lastMessageId !== undefined) {
                    mutableViewPortMessageIds.push(lastMessageId);
                }
            }

            // Otherwise, load surrounding messages as well
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
        storeOptions,
    );

    // Above, we have a store containing a set. But we don't want to transfer the full set every
    // time something changes. Instead, we want delta updates. To achieve this, convert the store of
    // a set to a `SetStore`.
    const deltaSetStore = new LocalSetBasedSetStore(activeMessageStores, storeOptions);

    // Fetch the view model for every message in the set store
    const conversationMessageSetStore = new LocalDerivedSetStore(
        deltaSetStore,
        (messageStore) => viewModelRepository.conversationMessage(conversation, messageStore),
        storeOptions,
    );

    return endpoint.exposeProperties({controller, store: conversationMessageSetStore});
}
