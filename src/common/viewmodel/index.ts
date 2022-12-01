import {type ServicesForBackend} from '~/common/backend';
import {type DbContactUid, type DbReceiverLookup} from '~/common/db';
import {type ProxyMarked, PROXY_HANDLER, TRANSFER_MARKER} from '~/common/utils/endpoint';
import {type LocalStore} from '~/common/utils/store';
import {type ViewModelCache} from '~/common/viewmodel/cache';
import {
    type ContactListItemSetEntry,
    type ContactListItemSetStore,
    getContactListItemSetStore,
    getContactListItemStore,
} from '~/common/viewmodel/contact-list-item';
import {
    type ConversationViewModel,
    getConversationViewModel,
} from '~/common/viewmodel/conversation';
import {
    type ConversationMessageSetStore,
    getConversationMessageSetStore,
} from '~/common/viewmodel/conversation-messages';
import {
    type ConversationPreviewSetStore,
    getConversationPreviewSetStore,
} from '~/common/viewmodel/conversation-preview';
import {type DebugPanelViewModel, getDebugPanelViewModel} from '~/common/viewmodel/debug-panel';
import {
    type GroupListItemSetStore,
    getGroupListItemSetStore,
} from '~/common/viewmodel/group-list-item';
import {type ProfileViewModelStore, getProfileViewModelStore} from '~/common/viewmodel/profile';

/**
 * Services required by the viewmodel backend
 */
export type ServicesForViewModel = Pick<
    ServicesForBackend,
    'config' | 'device' | 'endpoint' | 'logging' | 'model'
>;
export interface IViewModelBackend extends ProxyMarked {
    readonly conversationPreviews: () => ConversationPreviewSetStore;
    readonly conversation: (receiver: DbReceiverLookup) => ConversationViewModel | undefined;

    readonly conversationMessages: (
        receiver: DbReceiverLookup,
    ) => ConversationMessageSetStore | undefined;
    readonly debugPanel: () => DebugPanelViewModel;
    readonly contactListItems: () => ContactListItemSetStore;
    readonly contactListItem: (
        uid: DbContactUid,
    ) => LocalStore<ContactListItemSetEntry> | undefined;
    readonly groupListItems: () => GroupListItemSetStore;
    readonly profile: () => ProfileViewModelStore;
}

export class ViewModelBackend implements IViewModelBackend {
    public readonly [TRANSFER_MARKER] = PROXY_HANDLER;

    public constructor(
        private readonly _services: ServicesForViewModel,
        private readonly _cache: ViewModelCache,
    ) {}

    public conversationPreviews(): ConversationPreviewSetStore {
        return this._cache.conversationPreview.derefOrCreate(() =>
            getConversationPreviewSetStore(this._services),
        );
    }

    public conversation(receiver: DbReceiverLookup): ConversationViewModel | undefined {
        const conversation = this._services.model.conversations.getForReceiver(receiver);
        if (conversation === undefined) {
            return undefined;
        }
        return this._cache.conversations.getOrCreate(conversation, () =>
            getConversationViewModel(this._services, conversation, this._cache),
        );
    }

    public conversationMessages(
        receiver: DbReceiverLookup,
    ): ConversationMessageSetStore | undefined {
        const conversation = this._services.model.conversations.getForReceiver(receiver);
        if (conversation === undefined) {
            return undefined;
        }
        return getConversationMessageSetStore(this._services, conversation);
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
}
