import {type ServicesForBackend} from '~/common/backend';
import {type DbContactUid, type DbReceiverLookup} from '~/common/db';
import {type AnyMessageModelStore} from '~/common/model';
import {type ConversationModelStore} from '~/common/model/conversation';
import {type MessageId} from '~/common/network/types';
import {PROXY_HANDLER, type ProxyMarked, TRANSFER_MARKER} from '~/common/utils/endpoint';
import {WeakValueMap} from '~/common/utils/map';
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
    type ConversationMessage,
    getConversationMessage,
} from '~/common/viewmodel/conversation-message';
import {
    type ConversationMessageSetStore,
    getConversationMessageSetStore,
} from '~/common/viewmodel/conversation-message-set';
import {
    type ConversationPreviewSetStore,
    getConversationPreviewSetStore,
} from '~/common/viewmodel/conversation-preview';
import {type DebugPanelViewModel, getDebugPanelViewModel} from '~/common/viewmodel/debug-panel';
import {
    getGroupListItemSetStore,
    type GroupListItemSetStore,
} from '~/common/viewmodel/group-list-item';
import {getProfileViewModelStore, type ProfileViewModelStore} from '~/common/viewmodel/profile';

/**
 * Services required by the viewmodel backend
 */
export type ServicesForViewModel = Pick<
    ServicesForBackend,
    'config' | 'device' | 'endpoint' | 'file' | 'logging' | 'model' | 'crypto'
>;
export interface IViewModelRepository extends ProxyMarked {
    readonly conversationPreviews: () => ConversationPreviewSetStore;
    readonly conversation: (receiver: DbReceiverLookup) => ConversationViewModel | undefined;

    readonly conversationMessageSet: (
        conversation: ConversationModelStore,
    ) => ConversationMessageSetStore;
    readonly conversationMessage: (
        conversation: ConversationModelStore,
        messageStore: AnyMessageModelStore,
    ) => ConversationMessage;
    readonly conversationMessageById: (
        conversation: ConversationModelStore,
        messageId: MessageId,
    ) => ConversationMessage | undefined;

    readonly debugPanel: () => DebugPanelViewModel;
    readonly contactListItems: () => ContactListItemSetStore;
    readonly contactListItem: (
        uid: DbContactUid,
    ) => LocalStore<ContactListItemSetEntry> | undefined;
    readonly groupListItems: () => GroupListItemSetStore;
    readonly profile: () => ProfileViewModelStore;
}

export class ViewModelRepository implements IViewModelRepository {
    public readonly [TRANSFER_MARKER] = PROXY_HANDLER;

    public constructor(
        private readonly _services: ServicesForViewModel,
        private readonly _cache: ViewModelCache,
    ) {}

    public conversationPreviews(): ConversationPreviewSetStore {
        return this._cache.conversationPreview.derefOrCreate(() =>
            getConversationPreviewSetStore(this._services, this),
        );
    }

    public conversation(receiver: DbReceiverLookup): ConversationViewModel | undefined {
        const conversation = this._services.model.conversations.getForReceiver(receiver);
        if (conversation === undefined) {
            return undefined;
        }
        return this._cache.conversations.getOrCreate(conversation, () =>
            getConversationViewModel(this._services, conversation, this),
        );
    }

    public conversationMessageSet(
        conversation: ConversationModelStore,
    ): ConversationMessageSetStore {
        return this._cache.conversationMessageSet.getOrCreate(conversation, () =>
            getConversationMessageSetStore(this, conversation),
        );
    }

    public conversationMessage(
        conversation: ConversationModelStore,
        messageStore: AnyMessageModelStore,
    ): ConversationMessage {
        return this._cache.conversationMessage
            .getOrCreate(
                conversation,
                () => new WeakValueMap<AnyMessageModelStore, ConversationMessage>(),
            )
            .getOrCreate(messageStore, () =>
                getConversationMessage(this._services, messageStore, conversation),
            );
    }

    public conversationMessageById(
        conversation: ConversationModelStore,
        messageId: MessageId,
    ): ConversationMessage | undefined {
        const messageStore = conversation.get().controller.getMessage(messageId);
        if (messageStore === undefined) {
            return undefined;
        }
        return this.conversationMessage(conversation, messageStore);
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
