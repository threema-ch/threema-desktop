import {ReceiverType} from '~/common/enum';
import type {Conversation} from '~/common/model';
import type {ConversationModelStore} from '~/common/model/conversation';
import type {AnyMessageModelStore} from '~/common/model/types/message';
import {getDebugTagForReceiver} from '~/common/model/utils/debug-tags';
import {FEATURE_MASK_FLAG, type FeatureMask} from '~/common/network/types';
import {type GetAndSubscribeFunction, derive} from '~/common/utils/store/derived-store';
import {LocalSetBasedSetStore, LocalDerivedSetStore} from '~/common/utils/store/set-store';
import type {IViewModelRepository, ServicesForViewModel} from '~/common/viewmodel';
import type {IConversationViewModelController} from '~/common/viewmodel/conversation/main/controller';
import type {
    ConversationViewModel,
    FeatureMaskMap,
} from '~/common/viewmodel/conversation/main/store/types';

/**
 * Returns the {@link ConversationMessageSetStore} for the conversation that the
 * {@link ConversationViewModel} belongs to.
 */
export function getMessageSetStore(
    services: Pick<ServicesForViewModel, 'logging'>,
    viewModelRepository: IViewModelRepository,
    conversationViewModelController: IConversationViewModelController,
    conversationModelStore: ConversationModelStore,
): ConversationViewModel['messageSetStore'] {
    const {logging} = services;
    const conversationModel = conversationModelStore.get();
    const receiverLookup = conversationModel.controller.receiverLookup;

    // Options for all derived stores below.
    const tag = `${getDebugTagForReceiver(receiverLookup)}.conversation-message[]`;
    const storeOptions = {
        debug: {
            log: logging.logger(`viewmodel.${tag}`),
            tag,
        },
    };

    // Based on the currently visible messages in the viewport, derive a set of message stores
    // including context above and below the current viewport.
    const activeMessageStores = derive(
        [conversationViewModelController.currentViewportMessages],
        ([{currentValue: viewPortMessageIds}], getAndSubscribe) => {
            const defaultWindowSize = 75;

            // Note: When messages are deleted from the chat view, they are not removed from
            // `viewPortMessageIds` because the intersection observer does not trigger. This should
            // not have any adverse effects (except for a slight inefficiency in the IPC and
            // database layers).

            // Subscribe to the "last conversation update" store. This ensures that the active
            // messages are re-derived whenever a message is added to or removed from the
            // conversation.
            getAndSubscribe(conversationModel.controller.lastConversationUpdateStore());

            // Get active messages plus surrounding messages.
            let visibleMessagesWindowSet =
                conversationModel.controller.getMessagesWithSurroundingMessages(
                    viewPortMessageIds,
                    defaultWindowSize,
                );

            // If no message is visible currently (e.g. during initialization), make sure that the
            // first unread message (and surrounding messages) is loaded.
            if (visibleMessagesWindowSet.size === 0) {
                const firstUnreadMessageId = conversationModel.controller.getFirstUnreadMessageId();
                if (firstUnreadMessageId !== undefined) {
                    visibleMessagesWindowSet =
                        conversationModel.controller.getMessagesWithSurroundingMessages(
                            new Set([firstUnreadMessageId]),
                            defaultWindowSize,
                        );
                }
            }

            // Always load window around last message.
            const lastMessage = conversationModel.controller.lastMessageStore().get();
            let lastMessageWindowSet: Set<AnyMessageModelStore>;
            if (lastMessage !== undefined) {
                const lastMessageId = lastMessage.get().view.id;
                lastMessageWindowSet =
                    conversationModel.controller.getMessagesWithSurroundingMessages(
                        new Set([lastMessageId]),
                        defaultWindowSize,
                    );
            } else {
                lastMessageWindowSet = new Set();
            }

            return new Set([...visibleMessagesWindowSet, ...lastMessageWindowSet]);
        },
        storeOptions,
    );

    // Above, we have a store containing a set. But we don't want to transfer the full set every
    // time something changes. Instead, we want delta updates. To achieve this, convert the store of
    // a set to a `SetStore`.
    const deltaSetStore = new LocalSetBasedSetStore(activeMessageStores, storeOptions);

    // Fetch the view model for every message in the set store.
    const conversationMessageSetStore = new LocalDerivedSetStore(
        deltaSetStore,
        (messageStore) =>
            viewModelRepository.conversationMessage(conversationModelStore, messageStore),
        storeOptions,
    );

    return conversationMessageSetStore;
}

/**
 * Returns data related to the last message of the conversation to which the
 * {@link ConversationViewModel} belongs to.
 */
export function getLastMessage(
    conversationModel: Conversation,
    getAndSubscribe: GetAndSubscribeFunction,
): ConversationViewModel['lastMessage'] {
    const lastMessageStore = getAndSubscribe(conversationModel.controller.lastMessageStore());
    if (lastMessageStore === undefined) {
        return undefined;
    }

    const lastMessage = getAndSubscribe(lastMessageStore);
    return {
        direction: lastMessage.view.direction,
        id: lastMessage.view.id,
    };
}

function checkFeatureMaskSupportsEdit(fM: FeatureMask): boolean {
    // eslint-disable-next-line no-bitwise
    return (fM & FEATURE_MASK_FLAG.EDIT_MESSAGE_SUPPORT) !== 0x00n;
}

/**
 * We implicitly assume here that model.getbyIdentity returns undefined iff it is the user
 * since all recipients of a conversation have to be in the database (except for the user).
 */
function supportsEditMessage(
    conversation: Conversation,
    services: Pick<ServicesForViewModel, 'model'>,
): {supported: 'none' | 'all'} | {supported: 'partial'; notSupportedNames: string[]} {
    const receiver = conversation.controller.receiver();
    const notSupportedNames: string[] = [];
    if (receiver.type === ReceiverType.CONTACT) {
        const fM = receiver.get().view.featureMask;
        return {supported: checkFeatureMaskSupportsEdit(fM) ? 'all' : 'none'};
    } else if (receiver.type === ReceiverType.GROUP) {
        const contact = services.model.contacts
            .getByIdentity(receiver.get().view.creatorIdentity)
            ?.get();

        if (contact !== undefined) {
            const fM = contact.view.featureMask;

            if (!checkFeatureMaskSupportsEdit(fM)) {
                notSupportedNames.push(contact.view.displayName);
            }
        }

        const members = receiver.get().view.members;
        for (const m of members) {
            const member = services.model.contacts.getByIdentity(m)?.get();
            if (member === undefined) {
                continue;
            }
            const fM = member.view.featureMask;
            if (!checkFeatureMaskSupportsEdit(fM)) {
                notSupportedNames.push(member.view.displayName);
            }
        }
        // No member supports edit so we don't allow it at all
        if (notSupportedNames.length === members.length) {
            return {supported: 'none'};
        }
        // Some members support it so we
        if (notSupportedNames.length > 0) {
            return {supported: 'partial', notSupportedNames};
        }
    }
    // TODO(DESK-771) Distribution lists
    return {supported: 'all'};
}

export function getSupportedFeatures(
    conversation: Conversation,
    services: Pick<ServicesForViewModel, 'model'>,
): FeatureMaskMap {
    const featureSet: FeatureMaskMap = new Map();
    const editSupport = supportsEditMessage(conversation, services);
    if (editSupport.supported === 'all') {
        featureSet.set(FEATURE_MASK_FLAG.EDIT_MESSAGE_SUPPORT, {notSupported: []});
    } else if (editSupport.supported === 'partial') {
        featureSet.set(FEATURE_MASK_FLAG.EDIT_MESSAGE_SUPPORT, {
            notSupported: editSupport.notSupportedNames,
        });
    }

    return featureSet;
}
