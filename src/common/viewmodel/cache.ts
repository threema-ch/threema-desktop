import type {AnyMessageModelStore, Conversation} from '~/common/model';
import {LazyWeakRef} from '~/common/model/utils/model-cache';
import type {LocalModelStore} from '~/common/model/utils/model-store';
import {WeakValueMap} from '~/common/utils/map';
import type {ContactListItemSetStore} from '~/common/viewmodel/contact-list-item';
import type {ConversationViewModel} from '~/common/viewmodel/conversation';
import type {ConversationMessageViewModelBundle} from '~/common/viewmodel/conversation-message';
import type {ConversationMessageSetViewModel} from '~/common/viewmodel/conversation-message-set';
import type {ConversationPreviewSetStore} from '~/common/viewmodel/conversation-preview';
import type {DebugPanelViewModel} from '~/common/viewmodel/debug-panel';
import type {GroupListItemSetStore} from '~/common/viewmodel/group-list-item';
import type {ProfileViewModelStore} from '~/common/viewmodel/profile';

export class ViewModelCache {
    public readonly conversationPreview = new LazyWeakRef<ConversationPreviewSetStore>();
    public readonly contactListItem = new LazyWeakRef<ContactListItemSetStore>();
    public readonly groupListItem = new LazyWeakRef<GroupListItemSetStore>();
    public readonly profile = new LazyWeakRef<ProfileViewModelStore>();
    public readonly debugPanel = new LazyWeakRef<DebugPanelViewModel>();
    public readonly conversations = new WeakValueMap<
        LocalModelStore<Conversation>,
        ConversationViewModel
    >();

    public readonly conversationMessageSetViewModel = new WeakValueMap<
        LocalModelStore<Conversation>,
        ConversationMessageSetViewModel
    >();

    public readonly conversationMessage = new WeakValueMap<
        LocalModelStore<Conversation>,
        WeakValueMap<AnyMessageModelStore, ConversationMessageViewModelBundle>
    >();
}
