import type {AnyReceiver, AnyReceiverStore, Conversation} from '~/common/model';
import type {ContactModelStore} from '~/common/model/contact';
import type {ConversationModelStore} from '~/common/model/conversation';
import type {GroupModelStore} from '~/common/model/group';
import type {
    AnyDeletedMessageModelStore,
    AnyNonDeletedMessageModelStore,
} from '~/common/model/types/message';
import type {AnyStatusMessageModelStore} from '~/common/model/types/status';
import {LazyWeakRef} from '~/common/model/utils/model-cache';
import type {ModelStore} from '~/common/model/utils/model-store';
import {WeakValueMap} from '~/common/utils/map';
import type {LocalStore} from '~/common/utils/store';
import type {ConversationListViewModelBundle} from '~/common/viewmodel/conversation/list';
import type {ConversationListItemViewModelBundle} from '~/common/viewmodel/conversation/list/item';
import type {ConversationViewModelBundle} from '~/common/viewmodel/conversation/main';
import type {ConversationDeletedMessageViewModelBundle} from '~/common/viewmodel/conversation/main/message/deleted-message';
import type {ConversationRegularMessageViewModelBundle} from '~/common/viewmodel/conversation/main/message/regular-message';
import type {ConversationStatusMessageViewModelBundle} from '~/common/viewmodel/conversation/main/message/status-message';
import type {DebugPanelViewModel} from '~/common/viewmodel/debug-panel';
import type {ProfileViewModelStore} from '~/common/viewmodel/profile';
import type {ContactDetailViewModelBundle} from '~/common/viewmodel/receiver/detail/contact';
import type {GroupDetailViewModelBundle} from '~/common/viewmodel/receiver/detail/group';
import type {ReceiverListViewModelBundle} from '~/common/viewmodel/receiver/list';
import type {ReceiverListItemViewModelBundle} from '~/common/viewmodel/receiver/list/item';
import type {SearchViewModelBundle} from '~/common/viewmodel/search/nav';
import type {SettingsViewModelBundle} from '~/common/viewmodel/settings';
import type {SelfReceiverData} from '~/common/viewmodel/utils/receiver';

export class ViewModelCache {
    public readonly conversationList = new LazyWeakRef<ConversationListViewModelBundle>();
    public readonly conversationListItem = new WeakValueMap<
        ConversationModelStore,
        ConversationListItemViewModelBundle
    >();
    public readonly conversation = new WeakValueMap<
        ConversationModelStore,
        ConversationViewModelBundle
    >();
    public readonly conversationDeletedMessage = new WeakValueMap<
        ConversationModelStore,
        WeakValueMap<AnyDeletedMessageModelStore, ConversationDeletedMessageViewModelBundle>
    >();
    public readonly conversationRegularMessage = new WeakValueMap<
        ConversationModelStore,
        WeakValueMap<AnyNonDeletedMessageModelStore, ConversationRegularMessageViewModelBundle>
    >();
    public readonly conversationStatusMessage = new WeakValueMap<
        ModelStore<Conversation>,
        WeakValueMap<AnyStatusMessageModelStore, ConversationStatusMessageViewModelBundle>
    >();
    public readonly receiverList = new LazyWeakRef<ReceiverListViewModelBundle>();
    public readonly receiverListItem = new WeakValueMap<
        AnyReceiverStore,
        ReceiverListItemViewModelBundle<AnyReceiver>
    >();
    public readonly contactDetail = new WeakValueMap<
        ContactModelStore,
        ContactDetailViewModelBundle
    >();
    public readonly groupDetail = new WeakValueMap<GroupModelStore, GroupDetailViewModelBundle>();
    // TODO(DESK-1504): Investigate merging `user` with `profile`
    public readonly user = new LazyWeakRef<LocalStore<SelfReceiverData>>();

    public readonly debugPanel = new LazyWeakRef<DebugPanelViewModel>();
    public readonly profile = new LazyWeakRef<ProfileViewModelStore>();
    public readonly search = new LazyWeakRef<SearchViewModelBundle>();
    public readonly settings = new LazyWeakRef<SettingsViewModelBundle>();
}
