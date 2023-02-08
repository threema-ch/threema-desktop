import {type DbReceiverLookup} from '~/common/db';
import {ReceiverType} from '~/common/enum';
import {
    type AnyConversationPreviewMessageView,
    type Contact,
    type Conversation,
    type ConversationView,
    type Group,
} from '~/common/model';
import {getDisplayName} from '~/common/model/contact';
import {type LocalModelStore} from '~/common/model/utils/model-store';
import {unreachable} from '~/common/utils/assert';
import {type PropertiesMarked} from '~/common/utils/endpoint';
import {type LocalStore} from '~/common/utils/store';
import {derive} from '~/common/utils/store/derived-store';
import {LocalDerivedSetStore, type LocalSetStore} from '~/common/utils/store/set-store';
import {type ServicesForViewModel} from '~/common/viewmodel';

export type ConversationPreviewSetStore = LocalDerivedSetStore<
    LocalSetStore<LocalModelStore<Conversation>>,
    ConversationPreview
>;

/**
 * Get a SetStore that contains a ConversationPreview for every existing Conversation.
 */
export function getConversationPreviewSetStore(
    services: ServicesForViewModel,
): ConversationPreviewSetStore {
    const {model} = services;
    const conversationSetStore = model.conversations.getAll();

    return new LocalDerivedSetStore(conversationSetStore, (conversationStore) =>
        getConversationPreview(services, conversationStore),
    );
}

export type ConversationPreview = {
    readonly conversationStore: LocalModelStore<Conversation>;
    readonly viewModel: ConversationPreviewViewModel;
} & PropertiesMarked;
/**
 * Get the Preview
 */
function getConversationPreview(
    services: ServicesForViewModel,
    conversationStore: LocalModelStore<Conversation>,
): ConversationPreview {
    const {endpoint} = services;

    return endpoint.exposeProperties({
        conversationStore,
        viewModel: getViewModel(services, conversationStore),
    });
}

export type ConversationPreviewViewModel = LocalStore<ConversationPreviewItem>;

export type ConversationPreviewItem = {
    readonly receiver: ContactListItem | GroupListItem;
    readonly lastMessage: LocalStore<AnyConversationPreviewMessageView | undefined>;
    readonly receiverLookup: DbReceiverLookup;
} & ConversationView &
    PropertiesMarked;

function getViewModel(
    {endpoint}: ServicesForViewModel,
    conversationStore: LocalModelStore<Conversation>,
): ConversationPreviewViewModel {
    return derive(conversationStore, (conversation, unwrapAndSubscribe) => {
        const receiver = conversation.controller.receiver();
        const commonProperties = {
            lastMessage: conversation.controller.preview(),
            ...conversation.view,
        };

        let item;
        switch (receiver.type) {
            case ReceiverType.CONTACT: {
                const contact = unwrapAndSubscribe(receiver);
                item = {
                    ...commonProperties,
                    receiver: deriveContactListItem(contact),
                    receiverLookup: {type: receiver.type, uid: receiver.ctx},
                };
                break;
            }
            case ReceiverType.GROUP: {
                const group = unwrapAndSubscribe(receiver);
                item = {
                    ...commonProperties,
                    receiver: deriveGroupListItem(group),
                    receiverLookup: {type: receiver.type, uid: receiver.ctx},
                };
                break;
            }
            case ReceiverType.DISTRIBUTION_LIST:
                throw new Error('TODO(WEBMD-236): not yet implemented..');
            default:
                return unreachable(receiver);
        }

        return endpoint.exposeProperties(item);
    });
}

interface ContactListItem {
    displayName: string;
    initials: string;
}
function deriveContactListItem(contact: Contact): ContactListItem {
    return {
        displayName: getDisplayName(contact.view),
        initials: contact.view.initials,
    };
}

interface GroupListItem {
    displayName: string;
    initials: string;
}
function deriveGroupListItem(group: Group): GroupListItem {
    return {
        displayName: group.view.displayName,
        initials: group.view.displayName.slice(0, 2),
    };
}
