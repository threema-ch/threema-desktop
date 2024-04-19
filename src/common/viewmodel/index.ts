import type {ServicesForBackend} from '~/common/backend';
import type {DbReceiverLookup} from '~/common/db';
import {ReceiverType} from '~/common/enum';
import type {AnyMessageModelStore, AnyReceiver} from '~/common/model';
import type {ConversationModelStore} from '~/common/model/conversation';
import type {ReceiverStoreFor} from '~/common/model/types/receiver';
import {unreachable} from '~/common/utils/assert';
import {PROXY_HANDLER, type ProxyMarked, TRANSFER_HANDLER} from '~/common/utils/endpoint';
import {WeakValueMap} from '~/common/utils/map';
import type {ViewModelCache} from '~/common/viewmodel/cache';
import {
    getContactDetailViewModelBundle,
    type ContactDetailViewModelBundle,
} from '~/common/viewmodel/contact/detail';
import {
    getContactListViewModelBundle,
    type ContactListViewModelBundle,
} from '~/common/viewmodel/contact/list';
import {
    getContactListItemViewModelBundle,
    type ContactListItemViewModelBundle,
} from '~/common/viewmodel/contact/list/item';
import {
    getConversationListViewModelBundle,
    type ConversationListViewModelBundle,
} from '~/common/viewmodel/conversation/list';
import {
    getConversationListItemViewModelBundle,
    type ConversationListItemViewModelBundle,
} from '~/common/viewmodel/conversation/list/item';
import {
    type ConversationViewModelBundle,
    getConversationViewModelBundle,
} from '~/common/viewmodel/conversation/main';
import {
    getConversationMessageViewModelBundle,
    type ConversationMessageViewModelBundle,
} from '~/common/viewmodel/conversation/main/message';
import {type DebugPanelViewModel, getDebugPanelViewModel} from '~/common/viewmodel/debug-panel';
import {getProfileViewModelStore, type ProfileViewModelStore} from '~/common/viewmodel/profile';
import {getSearchViewModelBundle, type SearchViewModelBundle} from '~/common/viewmodel/search/nav';

/**
 * Services required by the viewmodel backend.
 */
export type ServicesForViewModel = Pick<
    ServicesForBackend,
    'config' | 'device' | 'endpoint' | 'file' | 'logging' | 'model' | 'crypto'
>;
export interface IViewModelRepository extends ProxyMarked {
    /**
     * Returns the {@link ConversationListViewModelBundle}.
     */
    readonly conversationList: () => ConversationListViewModelBundle;

    /**
     * Returns the {@link ConversationListItemViewModelBundle} that belongs to the given
     * {@link conversationModelStore}.
     */
    readonly conversationListItem: (
        conversationModelStore: ConversationModelStore,
    ) => ConversationListItemViewModelBundle;

    /**
     * Returns the {@link ConversationViewModelBundle} that belongs to the given {@link receiver}.
     */
    readonly conversation: (receiver: DbReceiverLookup) => ConversationViewModelBundle | undefined;

    /**
     * Returns the {@link ConversationMessageViewModelBundle} that belongs to the given
     * {@link messageStore} in the given {@link conversation}. Note: If the message contains a
     * quote, it will always be resolved.
     */
    readonly conversationMessage: (
        conversation: ConversationModelStore,
        messageStore: AnyMessageModelStore,
    ) => ConversationMessageViewModelBundle;

    /**
     * Returns the {@link ContactListViewModelBundle}.
     */
    readonly contactList: () => ContactListViewModelBundle;

    /**
     * Returns the {@link ContactListItemViewModelBundle} that belongs to the given
     * {@link receiverModelStore}.
     */
    readonly contactListItem: <TReceiver extends AnyReceiver>(
        receiverModelStore: ReceiverStoreFor<TReceiver>,
    ) => ContactListItemViewModelBundle<TReceiver>;

    /**
     * Returns the {@link ContactDetailViewModelBundle} that belongs to the given {@link receiver}.
     */
    readonly contactDetail: (
        receiver: DbReceiverLookup,
    ) => ContactDetailViewModelBundle<AnyReceiver> | undefined;

    readonly debugPanel: () => DebugPanelViewModel;
    readonly profile: () => ProfileViewModelStore;
    readonly search: () => SearchViewModelBundle;
}

export class ViewModelRepository implements IViewModelRepository {
    public readonly [TRANSFER_HANDLER] = PROXY_HANDLER;

    public constructor(
        private readonly _services: ServicesForViewModel,
        private readonly _cache: ViewModelCache,
    ) {}

    /** @inheritdoc */
    public conversationList(): ConversationListViewModelBundle {
        return this._cache.conversationList.derefOrCreate(() =>
            getConversationListViewModelBundle(this._services, this),
        );
    }

    /** @inheritdoc */
    public conversationListItem(
        conversationModelStore: ConversationModelStore,
    ): ConversationListItemViewModelBundle {
        return this._cache.conversationListItem.getOrCreate(conversationModelStore, () =>
            getConversationListItemViewModelBundle(this._services, conversationModelStore),
        );
    }

    /** @inheritdoc */
    public conversation(receiver: DbReceiverLookup): ConversationViewModelBundle | undefined {
        const conversationModelStore = this._services.model.conversations.getForReceiver(receiver);
        if (conversationModelStore === undefined) {
            return undefined;
        }

        return this._cache.conversation.getOrCreate(conversationModelStore, () =>
            getConversationViewModelBundle(this._services, this, conversationModelStore),
        );
    }

    /** @inheritdoc */
    public conversationMessage(
        conversation: ConversationModelStore,
        messageStore: AnyMessageModelStore,
    ): ConversationMessageViewModelBundle {
        return this._cache.conversationMessage
            .getOrCreate(
                conversation,
                () => new WeakValueMap<AnyMessageModelStore, ConversationMessageViewModelBundle>(),
            )
            .getOrCreate(messageStore, () =>
                getConversationMessageViewModelBundle(
                    this._services,
                    messageStore,
                    conversation,
                    // Always resolve contained quotes.
                    true,
                ),
            );
    }

    /** @inheritdoc */
    public contactList(): ContactListViewModelBundle {
        return this._cache.contactList.derefOrCreate(() =>
            getContactListViewModelBundle(this._services, this),
        );
    }

    /** @inheritdoc */
    public contactListItem<TReceiver extends AnyReceiver>(
        receiverModelStore: ReceiverStoreFor<TReceiver>,
    ): ContactListItemViewModelBundle<TReceiver> {
        // The bundle needs to be cast to `AnyReceiver` in order to add it to the cache, and back to
        // `TReceiver` when it's retrieved, because the cache is shared among all types.
        return this._cache.contactListItem.getOrCreate(receiverModelStore, () =>
            getContactListItemViewModelBundle<AnyReceiver>(this._services, receiverModelStore),
        ) satisfies ContactListItemViewModelBundle<AnyReceiver> as unknown as ContactListItemViewModelBundle<TReceiver>;
    }

    /** @inheritdoc */
    public contactDetail(
        receiver: DbReceiverLookup,
    ): ContactDetailViewModelBundle<AnyReceiver> | undefined {
        let receiverModelStore: ReceiverStoreFor<AnyReceiver> | undefined;
        switch (receiver.type) {
            case ReceiverType.CONTACT:
                receiverModelStore = this._services.model.contacts.getByUid(receiver.uid);
                break;

            case ReceiverType.DISTRIBUTION_LIST:
                throw new Error('TODO(DESK-771): Implement distribution lists');

            case ReceiverType.GROUP:
                receiverModelStore = this._services.model.groups.getByUid(receiver.uid);
                break;

            default:
                return unreachable(receiver);
        }
        if (receiverModelStore === undefined) {
            return undefined;
        }

        return this._cache.contactDetail.getOrCreate(receiverModelStore, () => {
            if (receiverModelStore === undefined) {
                return undefined;
            }

            return getContactDetailViewModelBundle(this._services, receiverModelStore);
        });
    }

    public profile(): ProfileViewModelStore {
        return this._cache.profile.derefOrCreate(() => getProfileViewModelStore(this._services));
    }

    public debugPanel(): DebugPanelViewModel {
        return this._cache.debugPanel.derefOrCreate(() => getDebugPanelViewModel(this._services));
    }

    public search(): SearchViewModelBundle {
        return this._cache.search.derefOrCreate(() => getSearchViewModelBundle(this._services));
    }
}
