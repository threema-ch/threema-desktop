import type {
    AnyMessageModelStore,
    AnyReceiver,
    AnyReceiverStore,
    Conversation,
} from '~/common/model';
import type {ConversationModelStore} from '~/common/model/conversation';
import type {AnyStatusMessageModelStore} from '~/common/model/types/status';
import {LazyWeakRef} from '~/common/model/utils/model-cache';
import type {LocalModelStore} from '~/common/model/utils/model-store';
import {WeakValueMap} from '~/common/utils/map';
import type {ContactDetailViewModelBundle} from '~/common/viewmodel/contact/detail';
import type {ContactListViewModelBundle} from '~/common/viewmodel/contact/list';
import type {ContactListItemViewModelBundle} from '~/common/viewmodel/contact/list/item';
import type {ConversationListViewModelBundle} from '~/common/viewmodel/conversation/list';
import type {ConversationListItemViewModelBundle} from '~/common/viewmodel/conversation/list/item';
import type {ConversationViewModelBundle} from '~/common/viewmodel/conversation/main';
import type {ConversationMessageViewModelBundle} from '~/common/viewmodel/conversation/main/message';
import type {ConversationStatusMessageViewModelBundle} from '~/common/viewmodel/conversation/main/status-message';
import type {DebugPanelViewModel} from '~/common/viewmodel/debug-panel';
import type {ProfileViewModelStore} from '~/common/viewmodel/profile';
import type {SearchViewModelBundle} from '~/common/viewmodel/search/nav';
import type {SettingsViewModelBundle} from '~/common/viewmodel/settings';

export class ViewModelCache {
    public readonly conversationList = new LazyWeakRef<ConversationListViewModelBundle>();
    public readonly conversationListItem = new WeakValueMap<
        ConversationModelStore,
        ConversationListItemViewModelBundle
    >();
    public readonly conversationStatusMessage = new WeakValueMap<
        LocalModelStore<Conversation>,
        WeakValueMap<AnyStatusMessageModelStore, ConversationStatusMessageViewModelBundle>
    >();
    public readonly conversation = new WeakValueMap<
        ConversationModelStore,
        ConversationViewModelBundle
    >();
    public readonly conversationMessage = new WeakValueMap<
        ConversationModelStore,
        WeakValueMap<AnyMessageModelStore, ConversationMessageViewModelBundle>
    >();
    public readonly contactList = new LazyWeakRef<ContactListViewModelBundle>();
    public readonly contactListItem = new WeakValueMap<
        AnyReceiverStore,
        ContactListItemViewModelBundle<AnyReceiver>
    >();
    public readonly contactDetail = new WeakValueMap<
        AnyReceiverStore,
        ContactDetailViewModelBundle<AnyReceiver>
    >();

    public readonly debugPanel = new LazyWeakRef<DebugPanelViewModel>();
    public readonly profile = new LazyWeakRef<ProfileViewModelStore>();
    public readonly search = new LazyWeakRef<SearchViewModelBundle>();
    public readonly settings = new LazyWeakRef<SettingsViewModelBundle>();
}
