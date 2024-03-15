import type {AnyMessageModelStore} from '~/common/model';
import type {ConversationModelStore} from '~/common/model/conversation';
import {LazyWeakRef} from '~/common/model/utils/model-cache';
import {WeakValueMap} from '~/common/utils/map';
import type {ContactListItemSetStore} from '~/common/viewmodel/contact-list-item';
import type {ConversationListViewModelBundle} from '~/common/viewmodel/conversation/list';
import type {ConversationListItemViewModelBundle} from '~/common/viewmodel/conversation/list/item';
import type {ConversationViewModelBundle} from '~/common/viewmodel/conversation/main';
import type {ConversationMessageViewModelBundle} from '~/common/viewmodel/conversation/main/message';
import type {DebugPanelViewModel} from '~/common/viewmodel/debug-panel';
import type {GroupListItemSetStore} from '~/common/viewmodel/group-list-item';
import type {ProfileViewModelStore} from '~/common/viewmodel/profile';
import type {SearchViewModelBundle} from '~/common/viewmodel/search/nav';

export class ViewModelCache {
    public readonly contactListItem = new LazyWeakRef<ContactListItemSetStore>();
    public readonly conversationMessage = new WeakValueMap<
        ConversationModelStore,
        WeakValueMap<AnyMessageModelStore, ConversationMessageViewModelBundle>
    >();
    public readonly conversationList = new LazyWeakRef<ConversationListViewModelBundle>();
    public readonly conversationListItem = new WeakValueMap<
        ConversationModelStore,
        ConversationListItemViewModelBundle
    >();
    public readonly conversations = new WeakValueMap<
        ConversationModelStore,
        ConversationViewModelBundle
    >();
    public readonly debugPanel = new LazyWeakRef<DebugPanelViewModel>();
    public readonly groupListItem = new LazyWeakRef<GroupListItemSetStore>();
    public readonly profile = new LazyWeakRef<ProfileViewModelStore>();
    public readonly search = new LazyWeakRef<SearchViewModelBundle>();
}
