import {ReceiverType} from '~/common/enum';
import type {Conversation} from '~/common/model';
import type {ConversationModelStore} from '~/common/model/conversation';
import type {AnyMessageModelStore} from '~/common/model/types/message';
import type {AnyStatusMessageModelStore} from '~/common/model/types/status';
import {getDebugTagForReceiver} from '~/common/model/utils/debug-tags';
import {
    FEATURE_MASK_FLAG,
    type FeatureMask,
    statusMessageUidToStatusMessageId,
    type StatusMessageId,
    type MessageId,
    isMessageId,
    isStatusMessageId,
} from '~/common/network/types';
import {unreachable, assert, assertUnreachable} from '~/common/utils/assert';
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
            : statusMessageUidToStatusMessageId(lastStatusMessage.controller.uid);
    }
    if (lastMessage !== undefined) {
        return lastMessage.view.id;
    }
    if (lastStatusMessage !== undefined) {
        return statusMessageUidToStatusMessageId(lastStatusMessage.controller.uid);
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

            // Subscribe to the "last conversation update" store. This ensures that the active
            // messages are re-derived whenever a message is added to or removed from the
            // conversation.
            getAndSubscribe(conversationModel.controller.lastConversationUpdateStore());

            // Subscribe to last "status message update" store so that the conversation content is updated
            // when a new status message comes in.
            getAndSubscribe(conversationModel.controller.conversationRefreshTriggerStore());

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
        (messageStore) =>
            viewModelRepository.conversationAnyMessage(conversationModelStore, messageStore),
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

function checkFeatureMaskSupportsEdit(featureMask: FeatureMask): boolean {
    // eslint-disable-next-line no-bitwise
    return (featureMask & FEATURE_MASK_FLAG.EDIT_MESSAGE_SUPPORT) !== 0x00n;
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
function supportsEditMessage(
    conversation: Conversation,
    services: Pick<ServicesForViewModel, 'device' | 'logging' | 'model'>,
): {supported: 'none' | 'all'} | {supported: 'partial'; notSupportedNames: string[]} {
    const {device, logging, model} = services;
    const log = logging.logger('viewmodel.conversation.supportsEditMessage');

    // Display names of contacts that don't support message editing
    const notSupportedNames: string[] = [];

    const receiver = conversation.controller.receiver();
    switch (receiver.type) {
        case ReceiverType.CONTACT: {
            // Check whether contact supports editing
            const featureMask = receiver.get().view.featureMask;
            return {supported: checkFeatureMaskSupportsEdit(featureMask) ? 'all' : 'none'};
        }
        case ReceiverType.GROUP: {
            // Check whether group members support editing
            //
            // Note: Right now, the list of members includes the group creator (if the user isn't
            // the creator). TODO(DESK-558): Ensure that the creator is included in this check!
            const memberIdentities = receiver
                .get()
                .view.members.filter((identity) => identity !== device.identity.string);
            for (const identity of memberIdentities) {
                const member = model.contacts.getByIdentity(identity)?.get();
                if (member === undefined) {
                    log.error(`Could not find group member contact for identity ${identity}`);
                    continue;
                }
                if (!checkFeatureMaskSupportsEdit(member.view.featureMask)) {
                    notSupportedNames.push(member.view.displayName);
                }
            }

            if (notSupportedNames.length === memberIdentities.length) {
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
