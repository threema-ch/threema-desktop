import {type AnyMessageModelStore, type Conversation} from '~/common/model';
import {LazyWeakRef} from '~/common/model/utils/model-cache';
import {type LocalModelStore} from '~/common/model/utils/model-store';
import {WeakValueMap} from '~/common/utils/map';
import {type ContactListItemSetStore} from '~/common/viewmodel/contact-list-item';
import {type ConversationViewModel} from '~/common/viewmodel/conversation';
import {type ConversationMessageViewModelBundle} from '~/common/viewmodel/conversation-message';
import {type ConversationMessageSetStore} from '~/common/viewmodel/conversation-message-set';
import {type ConversationPreviewSetStore} from '~/common/viewmodel/conversation-preview';
import {type DebugPanelViewModel} from '~/common/viewmodel/debug-panel';
import {type GroupListItemSetStore} from '~/common/viewmodel/group-list-item';
import {type ProfileViewModelStore} from '~/common/viewmodel/profile';

export class ViewModelCache {
    public readonly conversationPreview: LazyWeakRef<ConversationPreviewSetStore> =
        new LazyWeakRef();
    public readonly contactListItem: LazyWeakRef<ContactListItemSetStore> = new LazyWeakRef();
    public readonly groupListItem: LazyWeakRef<GroupListItemSetStore> = new LazyWeakRef();
    public readonly profile: LazyWeakRef<ProfileViewModelStore> = new LazyWeakRef();
    public readonly debugPanel: LazyWeakRef<DebugPanelViewModel> = new LazyWeakRef();
    public readonly conversations: WeakValueMap<
        LocalModelStore<Conversation>,
        ConversationViewModel
    > = new WeakValueMap();

    public readonly conversationMessageSet: WeakValueMap<
        LocalModelStore<Conversation>,
        ConversationMessageSetStore
    > = new WeakValueMap();

    public readonly conversationMessage: WeakValueMap<
        LocalModelStore<Conversation>,
        WeakValueMap<AnyMessageModelStore, ConversationMessageViewModelBundle>
    > = new WeakValueMap();
}
