import {type DbReceiverLookup} from '~/common/db';
import {ReceiverType} from '~/common/enum';
import {
    type AnyReceiverStore,
    type Contact,
    type Conversation,
    type ConversationView,
    type Group,
    type PrivacySettings,
    type ProfilePicture,
} from '~/common/model';
import {getDisplayName} from '~/common/model/contact';
import {type LocalModelStore} from '~/common/model/utils/model-store';
import {unreachable} from '~/common/utils/assert';
import {type PropertiesMarked} from '~/common/utils/endpoint';
import {type LocalStore} from '~/common/utils/store';
import {derive, type GetAndSubscribeFunction} from '~/common/utils/store/derived-store';
import {LocalDerivedSetStore, type LocalSetStore} from '~/common/utils/store/set-store';
import {type IViewModelRepository, type ServicesForViewModel} from '~/common/viewmodel';
import {type ConversationMessage} from '~/common/viewmodel/conversation-message';

export type ConversationPreviewSetStore = LocalDerivedSetStore<
    LocalSetStore<LocalModelStore<Conversation>>,
    ConversationPreview
>;

/**
 * Get a SetStore that contains a ConversationPreview for every existing Conversation.
 */
export function getConversationPreviewSetStore(
    services: ServicesForViewModel,
    viewModelRepository: IViewModelRepository,
): ConversationPreviewSetStore {
    const {model} = services;
    const conversationSetStore = model.conversations.getAll();

    return new LocalDerivedSetStore(conversationSetStore, (conversationStore) =>
        getConversationPreview(services, viewModelRepository, conversationStore),
    );
}

export type ConversationPreview = {
    readonly conversationStore: LocalModelStore<Conversation>;
    readonly receiver: AnyReceiverStore;
    readonly profilePicture: LocalModelStore<ProfilePicture>;
    readonly viewModel: ConversationPreviewViewModel;
} & PropertiesMarked;
/**
 * Get the Preview
 */
function getConversationPreview(
    services: ServicesForViewModel,
    viewModelRepository: IViewModelRepository,
    conversationStore: LocalModelStore<Conversation>,
): ConversationPreview {
    const {endpoint} = services;
    const conversationController = conversationStore.get().controller;
    const receiver = conversationController.receiver();
    const profilePicture = receiver.get().controller.profilePicture;

    return endpoint.exposeProperties({
        conversationStore,
        receiver,
        profilePicture,
        viewModel: getViewModel(services, viewModelRepository, conversationStore),
    });
}

export type ConversationPreviewViewModel = LocalStore<ConversationPreviewItem>;

export type ConversationPreviewItem = {
    readonly receiver: ContactListItem | GroupListItem;
    readonly receiverLookup: DbReceiverLookup;
    readonly lastMessage: ConversationMessage | undefined;
} & ConversationView &
    PropertiesMarked;

function getViewModel(
    {endpoint, model}: ServicesForViewModel,
    viewModelRepository: IViewModelRepository,
    conversationStore: LocalModelStore<Conversation>,
): ConversationPreviewViewModel {
    return derive(conversationStore, (conversation, getAndSubscribe) => {
        const receiver = conversation.controller.receiver();
        const lastMessageStore = getAndSubscribe(conversation.controller.lastMessageStore());
        let lastMessage = undefined;
        if (lastMessageStore !== undefined) {
            lastMessage = viewModelRepository.conversationMessage(
                conversationStore,
                lastMessageStore,
            );
        }
        const commonProperties = {
            ...conversation.view,
            lastMessage,
        };

        let item;
        switch (receiver.type) {
            case ReceiverType.CONTACT: {
                const contact = getAndSubscribe(receiver);
                item = {
                    ...commonProperties,
                    receiver: deriveContactListItem(
                        model.user.privacySettings,
                        contact,
                        getAndSubscribe,
                    ),
                    receiverLookup: {type: receiver.type, uid: receiver.ctx},
                };
                break;
            }
            case ReceiverType.GROUP: {
                const group = getAndSubscribe(receiver);
                item = {
                    ...commonProperties,
                    receiver: deriveGroupListItem(group),
                    receiverLookup: {type: receiver.type, uid: receiver.ctx},
                };
                break;
            }
            case ReceiverType.DISTRIBUTION_LIST:
                throw new Error('TODO(DESK-236): not yet implemented..');
            default:
                return unreachable(receiver);
        }

        return endpoint.exposeProperties(item);
    });
}

interface ContactListItem {
    type: 'contact';
    displayName: string;
    initials: string;
    isBlocked: boolean;
}
function deriveContactListItem(
    privacySettings: LocalModelStore<PrivacySettings>,
    contact: Contact,
    getAndSubscribe: GetAndSubscribeFunction,
): ContactListItem {
    return {
        type: 'contact',
        displayName: getDisplayName(contact.view),
        initials: contact.view.initials,
        isBlocked: getAndSubscribe(privacySettings).controller.isIdentityExplicitlyBlocked(
            contact.view.identity,
        ),
    };
}

interface GroupListItem {
    type: 'group';
    displayName: string;
    initials: string;
}
function deriveGroupListItem(group: Group): GroupListItem {
    return {
        type: 'group',
        displayName: group.view.displayName,
        initials: group.view.displayName.slice(0, 2),
    };
}
