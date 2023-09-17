import type {DbReceiverLookup} from '~/common/db';
import {ReceiverType} from '~/common/enum';
import type {Contact, Conversation, ConversationView, Group, ProfilePicture} from '~/common/model';
import {getDisplayName} from '~/common/model/contact';
import type {AnyReceiverStore} from '~/common/model/types/receiver';
import type {PrivacySettings} from '~/common/model/types/settings';
import type {LocalModelStore} from '~/common/model/utils/model-store';
import {unreachable} from '~/common/utils/assert';
import type {PropertiesMarked} from '~/common/utils/endpoint';
import type {LocalStore, RemoteStore} from '~/common/utils/store';
import {derive, type GetAndSubscribeFunction} from '~/common/utils/store/derived-store';
import {LocalDerivedSetStore, type LocalSetStore} from '~/common/utils/store/set-store';
import type {IViewModelRepository, ServicesForViewModel} from '~/common/viewmodel';
import type {ConversationMessageViewModelBundle} from '~/common/viewmodel/conversation-message';

export type ConversationPreviewSetStore = LocalDerivedSetStore<
    LocalSetStore<LocalModelStore<Conversation>>,
    ConversationPreview
>;

export interface ConversationPreviewTranslations {
    /* eslint-disable @typescript-eslint/naming-convention */
    readonly 'messaging.label--default-file-message-preview': string;
    readonly 'messaging.label--default-image-message-preview': string;
    readonly 'messaging.label--default-video-message-preview': string;
    readonly 'messaging.label--default-audio-message-preview': string;
    /* eslint-enable @typescript-eslint/naming-convention */
}

export type ConversationPreviewTranslationsStore = RemoteStore<ConversationPreviewTranslations>;

/**
 * Get a SetStore that contains a ConversationPreview for every existing Conversation.
 */
export function getConversationPreviewSetStore(
    services: ServicesForViewModel,
    viewModelRepository: IViewModelRepository,
    translations: ConversationPreviewTranslationsStore,
): ConversationPreviewSetStore {
    const {model} = services;
    const conversationSetStore = model.conversations.getAll();

    return new LocalDerivedSetStore(conversationSetStore, (conversationStore) =>
        getConversationPreview(services, viewModelRepository, conversationStore, translations),
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
    translations: ConversationPreviewTranslationsStore,
): ConversationPreview {
    const {endpoint} = services;
    const conversationController = conversationStore.get().controller;
    const receiver = conversationController.receiver();
    const profilePicture = receiver.get().controller.profilePicture;

    return endpoint.exposeProperties({
        conversationStore,
        receiver,
        profilePicture,
        viewModel: getViewModel(services, viewModelRepository, conversationStore, translations),
    });
}

export type ConversationPreviewViewModel = LocalStore<ConversationPreviewItem>;

export type ConversationPreviewItem = {
    readonly receiver: ContactListItem | GroupListItem;
    readonly receiverLookup: DbReceiverLookup;
    readonly lastMessage: ConversationMessageViewModelBundle | undefined;
    readonly lastMessagePreview: string | undefined;
} & ConversationView &
    PropertiesMarked;

function getViewModel(
    {endpoint, model}: ServicesForViewModel,
    viewModelRepository: IViewModelRepository,
    conversationStore: LocalModelStore<Conversation>,
    translations: ConversationPreviewTranslationsStore,
): ConversationPreviewViewModel {
    return derive(conversationStore, (conversation, getAndSubscribe) => {
        const receiver = conversation.controller.receiver();
        const lastMessageStore = getAndSubscribe(conversation.controller.lastMessageStore());

        let lastMessage = undefined;
        let lastMessagePreview = undefined;
        if (lastMessageStore !== undefined) {
            lastMessage = viewModelRepository.conversationMessage(
                conversationStore,
                lastMessageStore,
            );
            lastMessagePreview = getAndSubscribe(
                deriveLastMessagePreview(lastMessage, getAndSubscribe(translations)),
            );
        }
        const commonProperties = {
            ...conversation.view,
            lastMessage,
            lastMessagePreview,
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

export function deriveLastMessagePreview(
    lastConversationMessage: ConversationMessageViewModelBundle,
    translations: ConversationPreviewTranslations,
): LocalStore<string> {
    return derive(
        lastConversationMessage.viewModel,
        (lastMessageViewModelStore, getAndSubscribe) => {
            const lastMessage = getAndSubscribe(lastConversationMessage.messageStore);
            switch (lastMessage.type) {
                case 'text':
                    return lastMessage.view.text;

                case 'file':
                case 'image':
                case 'video':
                case 'audio': {
                    const caption = lastMessage.view.caption;
                    if (caption !== undefined && caption !== '') {
                        return caption;
                    }
                    return translations[
                        `messaging.label--default-${lastMessage.type}-message-preview`
                    ];
                }

                default:
                    return unreachable(lastMessage);
            }
        },
    );
}
