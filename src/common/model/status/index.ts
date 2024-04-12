import type {
    DbConversation,
    DbStatusMessage,
    DbConversationUid,
    UidOf,
    DbStatusMessageUid,
    DbCreateMessage,
} from '~/common/db';
import {Existence, StatusMessageType} from '~/common/enum';
import type {Logger} from '~/common/logging';
import {GroupMemberChangeStatusModelStore} from '~/common/model/status/group-member-change';
import {GroupNameChangeModelStore} from '~/common/model/status/group-name-change';
import type {ServicesForModel} from '~/common/model/types/common';
import type {ConversationControllerHandle} from '~/common/model/types/conversation';
import type {
    AnyStatusMessageModelStore,
    AnyStatusMessageView,
    GroupMemberChangeStatusView,
    GroupNameChangeStatusView,
} from '~/common/model/types/status';
import {LocalModelStoreCache} from '~/common/model/utils/model-cache';
import {STATUS_CODEC} from '~/common/status';
import type {u53} from '~/common/types';
import {assert, unreachable} from '~/common/utils/assert';
import {LazyMap} from '~/common/utils/map';
import {omit} from '~/common/utils/object';
import {LocalSetStore, type IDerivableSetStore} from '~/common/utils/store/set-store';

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function createCaches() {
    return new LazyMap<
        UidOf<DbConversation>,
        LocalModelStoreCache<UidOf<DbStatusMessage>, AnyStatusMessageModelStore>
    >(() => new LocalModelStoreCache<UidOf<DbStatusMessage>, AnyStatusMessageModelStore>());
}

let caches = createCaches();

export function recreateCaches(): void {
    caches = createCaches();
}

export function deactivateAndPurgeCache(conversationUid: UidOf<DbConversation>): void {
    // Purge all cached status messages from the cache for that conversation
    const set = caches.pop(conversationUid)?.setRef.deref()?.get();
    if (set === undefined) {
        return;
    }

    // Deactivate all cached status messages of that conversation
    deactivateStatusMessages([...set]);
}

/**
 * Deactivate the model controller for all specified status messages.
 */
function deactivateStatusMessages(statusMessages: AnyStatusMessageModelStore[]): void {
    for (const statusMessage of statusMessages) {
        statusMessage.get().controller.meta.deactivate();
    }
}

function statusMessageToView(message: DbStatusMessage): AnyStatusMessage {
    const common = {
        ...omit(message, ['statusBytes']),
    };
    switch (message.type) {
        case 'group-member-change':
            return {
                ...common,
                type: StatusMessageType.GROUP_MEMBER_CHANGE,
                value: STATUS_CODEC[message.type].decode(message.statusBytes as Uint8Array),
            };
        case 'group-name-change':
            return {
                ...common,
                type: StatusMessageType.GROUP_NAME_CHANGE,
                value: STATUS_CODEC[message.type].decode(message.statusBytes as Uint8Array),
            };
        default:
            return unreachable(message.type);
    }
}

function createStore(
    services: ServicesForModel,
    conversationUid: DbConversationUid,
    statusMessageUid: DbStatusMessageUid,
    statusMessageView: AnyStatusMessage,
): AnyStatusMessageModelStore {
    switch (statusMessageView.type) {
        case 'group-member-change':
            return new GroupMemberChangeStatusModelStore(
                statusMessageUid,
                services,
                conversationUid,
                statusMessageView,
            );
        case 'group-name-change':
            return new GroupNameChangeModelStore(
                statusMessageUid,
                services,
                conversationUid,
                statusMessageView,
            );
        default:
            return unreachable(statusMessageView);
    }
}

export function createStatusMessageModelStore(
    services: ServicesForModel,
    conversationUid: DbConversationUid,
    statusMessageUid: DbStatusMessageUid,
    statusMessageView: AnyStatusMessage,
): AnyStatusMessageModelStore {
    return caches
        .get(conversationUid)
        .getOrAdd(statusMessageUid, () =>
            createStore(services, conversationUid, statusMessageUid, statusMessageView),
        );
}

export function remove(
    services: ServicesForModel,
    log: Logger,
    conversationUid: UidOf<DbConversation>,
    uid: DbStatusMessageUid,
): void {
    const {db} = services;
    const statusMessage = db.getStatusMessageByUid(uid);
    if (statusMessage === undefined) {
        log.warn('StatusmessageUid was not found in database');
        return;
    }
    if (statusMessage.conversationUid !== conversationUid) {
        log.warn(
            'Tried to delete a non-matching conversation-status message pair. Not deleting the status message',
        );
        throw new Error(
            `ConversationUid and StatusMessageUid missmatch. StatusUid belongs to conversation ${statusMessage.conversationUid} and not ${conversationUid}`,
        );
    }
    const {removed} = db.removeStatusMessage(statusMessage.uid);

    if (!removed) {
        throw new Error(`Could not delete status message with ${uid} from database`);
    }
    caches.get(conversationUid).remove(statusMessage.uid);
}

export function removeAllOfConversation(
    services: ServicesForModel,
    log: Logger,
    conversationUid: UidOf<DbConversation>,
): void {
    const {db} = services;
    const numRemoved = db.removeAllStatusMessagesOfConversation(conversationUid);
    const statusMessageSet = caches.get(conversationUid).setRef.deref();
    const statusMessagesToDeactivate =
        statusMessageSet === undefined ? [] : [...statusMessageSet.get()];
    log.info(`Deleted ${numRemoved} status messages from conversation ${conversationUid}`);
    caches.get(conversationUid).clear();
    deactivateStatusMessages(statusMessagesToDeactivate);
}

export function getByUid(
    services: ServicesForModel,
    conversation: ConversationControllerHandle,
    uid: UidOf<DbStatusMessage>,
    existence: Existence.ENSURED,
): AnyStatusMessageModelStore {
    const {db} = services;

    return caches.get(conversation.uid).getOrAdd(uid, () => {
        // Lookup the message
        const message = db.getStatusMessageByUid(uid);
        assert(message !== undefined, `Expected message with UID ${uid} to exist`);

        // Create a store
        return createStore(services, conversation.uid, uid, statusMessageToView(message));
    });
}

export function checkExistenceAndGetByUid(
    services: ServicesForModel,
    conversation: ConversationControllerHandle,
    uid: UidOf<DbStatusMessage>,
): AnyStatusMessageModelStore | undefined {
    const {db} = services;
    if (!db.hasStatusMessageByUid(conversation.uid, uid)) {
        return undefined;
    }
    return getByUid(services, conversation, uid, Existence.ENSURED);
}

export function getLastStatusMessage(
    services: ServicesForModel,
    conversation: ConversationControllerHandle,
): AnyStatusMessageModelStore | undefined {
    const {db} = services;

    const statusMessage = db.getLastStatusMessage(conversation.uid);

    if (statusMessage === undefined) {
        return undefined;
    }

    return caches
        .get(conversation.uid)
        .getOrAdd(statusMessage.uid, () =>
            createStore(
                services,
                conversation.uid,
                statusMessage.uid,
                statusMessageToView(statusMessage),
            ),
        );
}

export function getConversationStatusMessageCount(
    services: ServicesForModel,
    conversation: ConversationControllerHandle,
): u53 {
    const {db} = services;

    return db.getConversationStatusMessageCount(conversation.uid);
}

export function createStatusMessage(
    services: ServicesForModel,
    statusMessage:
        | Omit<GroupMemberChangeStatusView, 'ordinal'>
        | Omit<GroupNameChangeStatusView, 'ordinal'>,
): AnyStatusMessageModelStore {
    const {db} = services;

    let statusBytes: Uint8Array;
    switch (statusMessage.type) {
        case 'group-member-change':
            statusBytes = STATUS_CODEC[statusMessage.type].encode(statusMessage.value);
            break;
        case 'group-name-change':
            statusBytes = STATUS_CODEC[statusMessage.type].encode(statusMessage.value);
            break;
        default:
            return unreachable(statusMessage);
    }

    const dbCreate: DbCreateMessage<DbStatusMessage> = {
        conversationUid: statusMessage.conversationUid,
        createdAt: statusMessage.createdAt,
        statusBytes,
        type: statusMessage.type,
    };

    const uid = db.addStatusMessage(dbCreate);
    const fullStatusMessage = db.getStatusMessageByUid(uid);
    assert(fullStatusMessage !== undefined);

    return createStatusMessageModelStore(
        services,
        fullStatusMessage.conversationUid,
        uid,
        statusMessageToView(fullStatusMessage),
    );
}

export function allStatusMessagesOfConversation(
    services: ServicesForModel,
    conversation: ConversationControllerHandle,
): IDerivableSetStore<AnyStatusMessageModelStore> {
    return caches.get(conversation.uid).setRef.derefOrCreate(() => {
        const {db, logging} = services;
        const uids = [...db.getStatusMessageUids(conversation.uid)];
        const statusMessages = uids.map(({uid}) =>
            getByUid(services, conversation, uid, Existence.ENSURED),
        );
        const tag = `status-message[]`;
        return new LocalSetStore<AnyStatusMessageModelStore>(
            new Set(statusMessages as readonly AnyStatusMessageModelStore[]),
            {
                debug: {
                    log: logging.logger(`model.${tag}`),
                    tag,
                },
            },
        );
    });
}
