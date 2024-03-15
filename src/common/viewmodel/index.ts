import type {ServicesForBackend} from '~/common/backend';
import type {DbContactUid, DbReceiverLookup} from '~/common/db';
import type {AnyMessageModelStore} from '~/common/model';
import type {ConversationModelStore} from '~/common/model/conversation';
import {PROXY_HANDLER, type ProxyMarked, TRANSFER_HANDLER} from '~/common/utils/endpoint';
import {WeakValueMap} from '~/common/utils/map';
import type {LocalStore} from '~/common/utils/store';
import type {ViewModelCache} from '~/common/viewmodel/cache';
import {
    type ContactListItemSetEntry,
    type ContactListItemSetStore,
    getContactListItemSetStore,
    getContactListItemStore,
} from '~/common/viewmodel/contact-list-item';
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
import {
    getGroupListItemSetStore,
    type GroupListItemSetStore,
} from '~/common/viewmodel/group-list-item';
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
    readonly debugPanel: () => DebugPanelViewModel;
    readonly contactListItems: () => ContactListItemSetStore;
    readonly contactListItem: (
        uid: DbContactUid,
    ) => LocalStore<ContactListItemSetEntry> | undefined;
    readonly groupListItems: () => GroupListItemSetStore;
    readonly profile: () => ProfileViewModelStore;
    readonly search: () => SearchViewModelBundle;
}

export class ViewModelRepository implements IViewModelRepository {
    public readonly [TRANSFER_HANDLER] = PROXY_HANDLER;

    public constructor(
        private readonly _services: ServicesForViewModel,
        private readonly _cache: ViewModelCache,
    ) {}

    public conversation(receiver: DbReceiverLookup): ConversationViewModelBundle | undefined {
        const conversationModelStore = this._services.model.conversations.getForReceiver(receiver);
        if (conversationModelStore === undefined) {
            return undefined;
        }

        return this._cache.conversations.getOrCreate(conversationModelStore, () =>
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

    public contactListItems(): ContactListItemSetStore {
        return this._cache.contactListItem.derefOrCreate(() =>
            getContactListItemSetStore(this._services),
        );
    }

    public contactListItem(uid: DbContactUid): LocalStore<ContactListItemSetEntry> | undefined {
        return getContactListItemStore(this._services, uid);
    }

    public groupListItems(): GroupListItemSetStore {
        return this._cache.groupListItem.derefOrCreate(() =>
            getGroupListItemSetStore(this._services),
        );
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
