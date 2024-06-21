import type {ServicesForBackend} from '~/common/backend';
import type {DbReceiverLookup} from '~/common/db';
import {ReceiverType} from '~/common/enum';
import {TRANSFER_HANDLER} from '~/common/index';
import type {AnyReceiver} from '~/common/model';
import type {ConversationModelStore} from '~/common/model/conversation';
import type {
    AnyDeletedMessageModelStore,
    AnyNonDeletedMessageModelStore,
} from '~/common/model/types/message';
import type {ReceiverStoreFor} from '~/common/model/types/receiver';
import type {AnyStatusMessageModelStore} from '~/common/model/types/status';
import {unreachable} from '~/common/utils/assert';
import {PROXY_HANDLER, type ProxyMarked} from '~/common/utils/endpoint';
import {WeakValueMap} from '~/common/utils/map';
import type {LocalStore} from '~/common/utils/store';
import {derive} from '~/common/utils/store/derived-store';
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
    getConversationDeletedMessageViewModelBundle,
    type ConversationDeletedMessageViewModelBundle,
} from '~/common/viewmodel/conversation/main/message/deleted-message';
import {
    getConversationRegularMessageViewModelBundle,
    type ConversationRegularMessageViewModelBundle,
} from '~/common/viewmodel/conversation/main/message/regular-message';
import {
    getConversationStatusMessageViewModelBundle,
    type ConversationStatusMessageViewModelBundle,
} from '~/common/viewmodel/conversation/main/message/status-message';
import {type DebugPanelViewModel, getDebugPanelViewModel} from '~/common/viewmodel/debug-panel';
import {getProfileViewModelStore, type ProfileViewModelStore} from '~/common/viewmodel/profile';
import {getSearchViewModelBundle, type SearchViewModelBundle} from '~/common/viewmodel/search/nav';
import {
    getSettingsViewModelBundle,
    type SettingsViewModelBundle,
} from '~/common/viewmodel/settings';
import {getSelfReceiverData, type SelfReceiverData} from '~/common/viewmodel/utils/receiver';

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
     * Returns the {@link ConversationDeletedMessageViewModelBundle} that belongs to the given
     * {@link messageStore} in the given {@link conversation}.
     */
    readonly conversationDeletedMessage: (
        conversation: ConversationModelStore,
        messageStore: AnyDeletedMessageModelStore,
    ) => ConversationDeletedMessageViewModelBundle;

    /**
     * Returns the {@link ConversationRegularMessageViewModelBundle} that belongs to the given
     * {@link messageStore} in the given {@link conversation}. Note: If the message contains a
     * quote, it will always be resolved.
     */
    readonly conversationRegularMessage: (
        conversation: ConversationModelStore,
        messageStore: AnyNonDeletedMessageModelStore,
    ) => ConversationRegularMessageViewModelBundle;

    /**
     * Returns the {@link ConversationStatusMessageViewModelBundle} that belongs to the given
     * {@link messageStore} in the given {@link conversation}.
     */
    readonly conversationStatusMessage: (
        conversation: ConversationModelStore,
        messageStore: AnyStatusMessageModelStore,
    ) => ConversationStatusMessageViewModelBundle;

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

    readonly user: () => LocalStore<SelfReceiverData>;

    readonly debugPanel: () => DebugPanelViewModel;
    readonly profile: () => ProfileViewModelStore;
    readonly search: () => SearchViewModelBundle;
    readonly settings: () => SettingsViewModelBundle;
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
    public conversationDeletedMessage(
        conversation: ConversationModelStore,
        messageStore: AnyDeletedMessageModelStore,
    ): ConversationDeletedMessageViewModelBundle {
        return this._cache.conversationDeletedMessage
            .getOrCreate(
                conversation,
                () =>
                    new WeakValueMap<
                        AnyDeletedMessageModelStore,
                        ConversationDeletedMessageViewModelBundle
                    >(),
            )
            .getOrCreate(messageStore, () =>
                getConversationDeletedMessageViewModelBundle(this._services, messageStore),
            );
    }

    /** @inheritdoc */
    public conversationRegularMessage(
        conversation: ConversationModelStore,
        messageStore: AnyNonDeletedMessageModelStore,
    ): ConversationRegularMessageViewModelBundle {
        return this._cache.conversationRegularMessage
            .getOrCreate(
                conversation,
                () =>
                    new WeakValueMap<
                        AnyNonDeletedMessageModelStore,
                        ConversationRegularMessageViewModelBundle
                    >(),
            )
            .getOrCreate(messageStore, () =>
                getConversationRegularMessageViewModelBundle(
                    this._services,
                    messageStore,
                    conversation,
                    // Always resolve contained quotes.
                    true,
                ),
            );
    }

    public conversationStatusMessage(
        conversation: ConversationModelStore,
        statusMessageStore: AnyStatusMessageModelStore,
    ): ConversationStatusMessageViewModelBundle {
        return this._cache.conversationStatusMessage
            .getOrCreate(
                conversation,
                () =>
                    new WeakValueMap<
                        AnyStatusMessageModelStore,
                        ConversationStatusMessageViewModelBundle
                    >(),
            )
            .getOrCreate(statusMessageStore, () =>
                getConversationStatusMessageViewModelBundle(this._services, statusMessageStore),
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

        return this._cache.contactDetail.getOrCreate(receiverModelStore, () =>
            getContactDetailViewModelBundle(this._services, receiverModelStore),
        );
    }

    // TODO(DESK-1466): You probably want to change this, right?
    public user(): LocalStore<SelfReceiverData> {
        return this._cache.user.derefOrCreate(() =>
            derive([], (_, getAndSubscribe) =>
                getSelfReceiverData(this._services, getAndSubscribe),
            ),
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

    public settings(): SettingsViewModelBundle {
        return this._cache.settings.derefOrCreate(() => getSettingsViewModelBundle(this._services));
    }
}
