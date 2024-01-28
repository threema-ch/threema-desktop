import type {AnyMessageModelStore, Conversation} from '~/common/model';
import {LazyWeakRef} from '~/common/model/utils/model-cache';
import type {LocalModelStore} from '~/common/model/utils/model-store';
import {WeakValueMap} from '~/common/utils/map';
import type {ContactListItemSetStore} from '~/common/viewmodel/contact-list-item';
import type {ConversationViewModelBundle} from '~/common/viewmodel/conversation/main';
import type {ConversationMessageViewModelBundle} from '~/common/viewmodel/conversation/main/message';
import type {ConversationPreviewSetStore} from '~/common/viewmodel/conversation-preview';
import type {DebugPanelViewModel} from '~/common/viewmodel/debug-panel';
import type {GroupListItemSetStore} from '~/common/viewmodel/group-list-item';
import type {ProfileViewModelStore} from '~/common/viewmodel/profile';
import type {SearchViewModelBundle} from '~/common/viewmodel/search/nav';

export class ViewModelCache {
    public readonly contactListItem = new LazyWeakRef<ContactListItemSetStore>();
    public readonly conversationMessage = new WeakValueMap<
        LocalModelStore<Conversation>,
        WeakValueMap<AnyMessageModelStore, ConversationMessageViewModelBundle>
    >();
    public readonly conversationPreview = new LazyWeakRef<ConversationPreviewSetStore>();
    public readonly conversations = new WeakValueMap<
        LocalModelStore<Conversation>,
        ConversationViewModelBundle
    >();
    public readonly debugPanel = new LazyWeakRef<DebugPanelViewModel>();
    public readonly groupListItem = new LazyWeakRef<GroupListItemSetStore>();
    public readonly profile = new LazyWeakRef<ProfileViewModelStore>();
    public readonly search = new LazyWeakRef<SearchViewModelBundle>();
}
