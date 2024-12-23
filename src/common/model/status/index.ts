import type {
    DbConversation,
    DbStatusMessage,
    DbConversationUid,
    UidOf,
    DbStatusMessageUid,
    DbCreateStatusMessage,
    DbAnyStatusMessage,
} from '~/common/db';
import {Existence, type StatusMessageType, StatusMessageTypeUtils} from '~/common/enum';
import {TRANSFER_HANDLER} from '~/common/index';
import type {Logger} from '~/common/logging';
import type {ServicesForModel} from '~/common/model/types/common';
import type {ConversationControllerHandle} from '~/common/model/types/conversation';
import type {
    AnyStatusMessageModelStore,
    AnyStatusMessageView,
    StatusMessageController,
    StatusMessageModelStores,
    StatusMessageModels,
    StatusMessageView,
} from '~/common/model/types/status';
import {ModelStoreCache} from '~/common/model/utils/model-cache';
import {ModelLifetimeGuard} from '~/common/model/utils/model-lifetime-guard';
import {ModelStore} from '~/common/model/utils/model-store';
import {STATUS_CODEC} from '~/common/status';
import type {u53} from '~/common/types';
import {assert} from '~/common/utils/assert';
import {PROXY_HANDLER} from '~/common/utils/endpoint';
import {LazyMap} from '~/common/utils/map';
import {omit} from '~/common/utils/object';
import {LocalSetStore, type IDerivableSetStore} from '~/common/utils/store/set-store';

// TODO(DESK-697)
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function createCaches() {
    return new LazyMap<
        UidOf<DbConversation>,
        ModelStoreCache<UidOf<DbAnyStatusMessage>, AnyStatusMessageModelStore>
    >(() => new ModelStoreCache<UidOf<DbAnyStatusMessage>, AnyStatusMessageModelStore>());
}

let caches = createCaches();

/**
 * TODO(DESK-697): Remove this
 */
export function recreateCaches(): void {
    caches = createCaches();
}

/**
 * Deactivate the model controller for all specified status messages.
 */
function deactivateStatusMessages(statusMessages: AnyStatusMessageModelStore[]): void {
    for (const statusMessage of statusMessages) {
        statusMessage.get().controller.lifetimeGuard.deactivate();
    }
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

export class StatusModelController<TType extends StatusMessageType>
    implements StatusMessageController<TType>
{
    public readonly [TRANSFER_HANDLER] = PROXY_HANDLER;
    public readonly lifetimeGuard = new ModelLifetimeGuard<StatusMessageView<TType>>();

    public constructor(public readonly uid: DbStatusMessageUid) {}
}

export class StatusModelStore<TType extends StatusMessageType> extends ModelStore<
    StatusMessageModels[TType]
> {
    public constructor(
        services: ServicesForModel,
        dbConversationUid: DbConversationUid,
        statusMessageUid: DbStatusMessageUid,
        view: StatusMessageView<TType>,
    ) {
        const {logging} = services;
        const tag = `status-message.${StatusMessageTypeUtils.NAME_OF[view.type]}`;
        super(view, new StatusModelController(statusMessageUid), dbConversationUid, view.type, {
            debug: {
                log: logging.logger(`model.${tag}`),
                tag,
            },
        });
    }
}

function statusMessageToView<TType extends StatusMessageType>(
    message: DbStatusMessage<TType>,
): AnyStatusMessageView {
    return {
        ...omit(message, ['statusBytes']),
        type: message.type,
        value: STATUS_CODEC[message.type].decode(message.statusBytes),
    } as AnyStatusMessageView;
}

function createStore(
    services: ServicesForModel,
    conversationUid: DbConversationUid,
    statusMessageUid: DbStatusMessageUid,
    statusMessageView: AnyStatusMessageView,
): AnyStatusMessageModelStore {
    return new StatusModelStore(
        services,
        conversationUid,
        statusMessageUid,
        statusMessageView,
    ) as AnyStatusMessageModelStore;
}

export function createStatusMessageModelStore(
    services: ServicesForModel,
    conversationUid: DbConversationUid,
    statusMessageUid: DbStatusMessageUid,
    statusMessageView: AnyStatusMessageView,
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
        log.warn('StatusMessageUid was not found in database');
        return;
    }
    if (statusMessage.conversationUid !== conversationUid) {
        log.warn(
            'Tried to delete a non-matching conversation-status message pair. Not deleting the status message',
        );
        throw new Error(
            `ConversationUid and StatusMessageUid mismatch. StatusUid belongs to conversation ${statusMessage.conversationUid} and not ${conversationUid}`,
        );
    }
    const removed = db.removeStatusMessage(statusMessage.uid);

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
    uid: UidOf<DbAnyStatusMessage>,
    existence: Existence.ENSURED,
): AnyStatusMessageModelStore {
    const {db} = services;

    return caches.get(conversation.uid).getOrAdd(uid, () => {
        // Lookup the message
        const message = db.getStatusMessageByUid(uid);
        assert(message !== undefined, `Expected status message with UID ${uid} to exist`);

        // Create a store
        return createStore(services, conversation.uid, uid, statusMessageToView(message));
    });
}

export function checkExistenceAndGetByUid(
    services: ServicesForModel,
    conversation: ConversationControllerHandle,
    uid: UidOf<DbAnyStatusMessage>,
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

export function createStatusMessage<TType extends StatusMessageType>(
    services: ServicesForModel,
    statusMessage: Omit<StatusMessageView<TType>, 'id' | 'ordinal'>,
): StatusMessageModelStores[TType] {
    const {db} = services;

    // Encode and create
    const statusBytes = STATUS_CODEC[statusMessage.type].encode(statusMessage.value);
    const dbCreate: DbCreateStatusMessage<DbAnyStatusMessage> = {
        conversationUid: statusMessage.conversationUid,
        createdAt: statusMessage.createdAt,
        statusBytes,
        type: statusMessage.type,
    };
    const uid = db.createStatusMessage(dbCreate);
    const fullStatusMessage = db.getStatusMessageByUid(uid);
    assert(fullStatusMessage !== undefined);

    const store = createStatusMessageModelStore(
        services,
        fullStatusMessage.conversationUid,
        uid,
        statusMessageToView(fullStatusMessage),
    );
    assert(store.type === statusMessage.type);
    return store as StatusMessageModelStores[TType];
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
