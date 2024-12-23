import {MessageType, ReceiverType, StatusMessageType} from '~/common/enum';
import type {Conversation} from '~/common/model';
import type {ConversationModelStore} from '~/common/model/conversation';
import type {AnyMessageModelStore} from '~/common/model/types/message';
import type {AnyStatusMessageModelStore} from '~/common/model/types/status';
import {getDebugTagForReceiver} from '~/common/model/utils/debug-tags';
import {
    FEATURE_MASK_FLAG,
    type FeatureMask,
    type StatusMessageId,
    type MessageId,
    isMessageId,
    isStatusMessageId,
} from '~/common/network/types';
import {unreachable, assert, assertUnreachable} from '~/common/utils/assert';
import {isGroupManagedAndMonitoredByGateway, isGroupManagedByGateway} from '~/common/utils/group';
import {type GetAndSubscribeFunction, derive} from '~/common/utils/store/derived-store';
import {LocalSetBasedSetStore, LocalDerivedSetStore} from '~/common/utils/store/set-store';
import type {IViewModelRepository, ServicesForViewModel} from '~/common/viewmodel';
import type {IConversationViewModelController} from '~/common/viewmodel/conversation/main/controller';
import type {
    ConversationViewModel,
    FeatureMaskMap,
} from '~/common/viewmodel/conversation/main/store/types';

function getLastMessageId(
    conversationModel: Conversation,
): MessageId | StatusMessageId | undefined {
    const lastMessage = conversationModel.controller.lastMessageStore().get()?.get();
    const lastStatusMessage = conversationModel.controller.lastStatusMessageStore().get()?.get();

    if (lastMessage !== undefined && lastStatusMessage !== undefined) {
        return lastMessage.view.ordinal > lastStatusMessage.view.ordinal
            ? lastMessage.view.id
            : lastStatusMessage.view.id;
    }
    if (lastMessage !== undefined) {
        return lastMessage.view.id;
    }
    if (lastStatusMessage !== undefined) {
        return lastStatusMessage.view.id;
    }

    // If both are undefined, there is no message in the conversation and thus, no last message.
    return undefined;
}

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
            const defaultWindowSize = 150;

            // Note: When messages are deleted from the chat view, they are not removed from
            // `viewPortMessageIds` because the intersection observer does not trigger. This should
            // not have any adverse effects (except for a slight inefficiency in the IPC and
            // database layers).

            // Subscribe to the "last conversation modification" store. This ensures that the active
            // messages are re-derived whenever a conversation is modified (e.g. when a message or
            // status message is added to or removed from the conversation).
            getAndSubscribe(conversationModel.controller.lastModificationStore());

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

            const lastMessageId = getLastMessageId(conversationModel);

            let lastMessageWindowSet: Set<AnyMessageModelStore | AnyStatusMessageModelStore>;

            if (lastMessageId !== undefined) {
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
        (messageModelStore) => {
            switch (messageModelStore.type) {
                case MessageType.DELETED:
                    return viewModelRepository.conversationDeletedMessage(
                        conversationModelStore,
                        messageModelStore,
                    );

                case MessageType.AUDIO:
                case MessageType.FILE:
                case MessageType.IMAGE:
                case MessageType.TEXT:
                case MessageType.VIDEO:
                    return viewModelRepository.conversationRegularMessage(
                        conversationModelStore,
                        messageModelStore,
                    );

                case StatusMessageType.CHAT_RESTORED:
                case StatusMessageType.GROUP_CALL_ENDED:
                case StatusMessageType.GROUP_CALL_STARTED:
                case StatusMessageType.GROUP_MEMBER_CHANGED:
                case StatusMessageType.GROUP_NAME_CHANGED:
                case StatusMessageType.GROUP_USER_STATE_CHANGED:
                    return viewModelRepository.conversationStatusMessage(
                        conversationModelStore,
                        messageModelStore,
                    );

                default:
                    return unreachable(messageModelStore);
            }
        },
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

    const lastStatusMessageStore = getAndSubscribe(
        conversationModel.controller.lastStatusMessageStore(),
    );

    if (lastMessageStore !== undefined) {
        getAndSubscribe(lastMessageStore);
    }

    if (lastStatusMessageStore !== undefined) {
        getAndSubscribe(lastStatusMessageStore);
    }

    if (lastMessageStore === undefined && lastStatusMessageStore === undefined) {
        return undefined;
    }

    const lastMessageId = getLastMessageId(conversationModel);

    // The type checker cannot infer this, but this cannot happen since the only way
    // `getLastMessageId` returns undefined is when both stores are undefined, which we have already
    // checked before.
    if (lastMessageId === undefined) {
        return undefined;
    }

    if (isMessageId(lastMessageId)) {
        assert(
            lastMessageStore?.ctx !== undefined,
            'The last message store of a standard message must have been properly created',
        );
        return {
            direction: lastMessageStore.ctx,
            id: lastMessageId,
        };
    } else if (isStatusMessageId(lastMessageId)) {
        return {
            direction: 'none',
            id: lastMessageId,
        };
    }
    return assertUnreachable(
        'The Id of the last message store must be either a message Id or a status message Id',
    );
}

function checkFeatureMaskSupportsFeature(
    featureMask: FeatureMask,
    feature: keyof typeof FEATURE_MASK_FLAG,
): boolean {
    // eslint-disable-next-line no-bitwise
    return (featureMask & FEATURE_MASK_FLAG[feature]) !== 0x00n;
}

/**
 * Check whether contacts in this conversation support message editing.
 *
 * The return value can be:
 *
 * - All contacts support editing
 * - No contacts support editing
 * - Some contacts support editing
 *
 * If only some contacts support editing, the return value includes the display names of the
 * contacts that don't support this feature yet.
 */
function supportsFeature(
    conversation: Conversation,
    services: Pick<ServicesForViewModel, 'device' | 'logging' | 'model'>,
    feature: keyof typeof FEATURE_MASK_FLAG,
): {supported: 'none' | 'all'} | {supported: 'partial'; notSupportedNames: string[]} {
    const {logging, model} = services;
    const log = logging.logger('viewmodel.conversation.supportsEditMessage');

    // Display names of contacts that don't support message editing
    const notSupportedNames: string[] = [];

    const receiver = conversation.controller.receiver();
    switch (receiver.type) {
        case ReceiverType.CONTACT: {
            // Check whether contact supports editing
            const featureMask = receiver.get().view.featureMask;
            return {
                supported: checkFeatureMaskSupportsFeature(featureMask, feature) ? 'all' : 'none',
            };
        }
        case ReceiverType.GROUP: {
            // Check whether group members support editing
            //
            // Note: The list of members does not include the group creator, nor does it
            // include the user.
            const memberIdentities = [...receiver.get().view.members].map(
                (member) => member.get().view.identity,
            );
            for (const identity of memberIdentities) {
                const member = model.contacts.getByIdentity(identity)?.get();
                if (member === undefined) {
                    log.error(`Could not find group member contact for identity ${identity}`);
                    continue;
                }
                if (!checkFeatureMaskSupportsFeature(member.view.featureMask, feature)) {
                    notSupportedNames.push(member.view.displayName);
                }
            }

            const creator = receiver.get().view.creator;
            if (creator !== 'me') {
                // The user is not the creator, hence we need to check the creator's feature mask as well.
                // If the creator is a Gateway ID that is not monitored, don't show it in the list.
                const creatorIdentity = creator.get().view.identity;
                if (
                    !(
                        isGroupManagedByGateway(creatorIdentity) &&
                        !isGroupManagedAndMonitoredByGateway(
                            receiver.get().view.displayName,
                            creatorIdentity,
                        )
                    ) &&
                    !checkFeatureMaskSupportsFeature(creator.get().view.featureMask, feature)
                ) {
                    notSupportedNames.push(creator.get().view.displayName);
                }
            }

            if (
                (creator === 'me' && notSupportedNames.length === memberIdentities.length) ||
                (creator !== 'me' && notSupportedNames.length === memberIdentities.length + 1)
            ) {
                return {supported: 'none'};
            } else if (notSupportedNames.length === 0) {
                return {supported: 'all'};
            }
            return {supported: 'partial', notSupportedNames};
        }
        case ReceiverType.DISTRIBUTION_LIST:
            // TODO(DESK-771) Distribution lists
            return {supported: 'none'};
        default:
            return unreachable(receiver);
    }
}

export function getSupportedFeatures(
    conversation: Conversation,
    services: Pick<ServicesForViewModel, 'device' | 'logging' | 'model'>,
): FeatureMaskMap {
    const featureSet: FeatureMaskMap = new Map();
    const editSupport = supportsFeature(conversation, services, 'EDIT_MESSAGE_SUPPORT');
    if (editSupport.supported === 'all') {
        featureSet.set(FEATURE_MASK_FLAG.EDIT_MESSAGE_SUPPORT, {
            supported: true,
            notSupportedNames: [],
        });
    } else if (editSupport.supported === 'partial') {
        featureSet.set(FEATURE_MASK_FLAG.EDIT_MESSAGE_SUPPORT, {
            supported: true,
            notSupportedNames: editSupport.notSupportedNames,
        });
    } else {
        featureSet.set(FEATURE_MASK_FLAG.EDIT_MESSAGE_SUPPORT, {supported: false});
    }

    const deleteSupport = supportsFeature(conversation, services, 'DELETED_MESSAGES_SUPPORT');
    if (deleteSupport.supported === 'all') {
        featureSet.set(FEATURE_MASK_FLAG.DELETED_MESSAGES_SUPPORT, {
            supported: true,
            notSupportedNames: [],
        });
    } else if (deleteSupport.supported === 'partial') {
        featureSet.set(FEATURE_MASK_FLAG.DELETED_MESSAGES_SUPPORT, {
            supported: true,
            notSupportedNames: deleteSupport.notSupportedNames,
        });
    } else {
        featureSet.set(FEATURE_MASK_FLAG.DELETED_MESSAGES_SUPPORT, {supported: false});
    }

    return featureSet;
}
