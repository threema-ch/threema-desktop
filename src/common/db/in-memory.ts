import {
    type GlobalPropertyKey,
    type MessageQueryDirection,
    GroupUserState,
    ReceiverType,
} from '~/common/enum';
import {type Logger} from '~/common/logging';
import {type GroupId, type IdentityString, type MessageId} from '~/common/network/types';
import {type Settings} from '~/common/settings';
import {type i53, type i64, type u53, type u64} from '~/common/types';
import {assert} from '~/common/utils/assert';
import {LazyMap} from '~/common/utils/map';

import {
    type DatabaseBackend,
    type DbAnyMessage,
    type DbContact,
    type DbContactUid,
    type DbConversation,
    type DbConversationUid,
    type DbCreate,
    type DbCreateConversationMixin,
    type DbCreated,
    type DbFileMessage,
    type DbGet,
    type DbGlobalProperty,
    type DbGlobalPropertyUid,
    type DbGroup,
    type DbGroupMemberUid,
    type DbGroupUid,
    type DbHas,
    type DbList,
    type DbMessageUid,
    type DbReceiverLookup,
    type DbRemove,
    type DbTable,
    type DbTextMessage,
    type DbUid,
    type DbUnreadMessageCountMixin,
    type DbUpdate,
} from '.';

/**
 * Valid index types.
 */
type IndexType = string | i53 | u53 | i64 | u64 | symbol;

/**
 * Transforms a field's value into an index that can be stored in and
 * retrieved from a {@link Map} while ensuring uniqueness.
 */
type IndexHashFunction<TValue, TKey extends keyof TValue> = (field: TValue[TKey]) => IndexType;

/**
 * Maps each field to an {@link IndexHashFunction}.
 */
type IndexHashFunctions<TValue, TKey extends keyof TValue> = {
    readonly [P in TKey]: IndexHashFunction<TValue, TKey>;
};

/**
 * Maps a field to an index holding references to entries for quick lookups.
 */
interface UniqueIndex<TValue, TKey extends keyof TValue> {
    map: Map<IndexType, TValue>;
    hashFunction: IndexHashFunction<TValue, TKey>;
}

/**
 * Maps each field to an {@link UniqueIndex}.
 */
type Indices<TValue, TKey extends keyof TValue> = {
    [P in TKey]: UniqueIndex<TValue, TKey>;
};

// Global UID counter variable. Ensures that every UID is unique.
let CURRENT_UID: DbUid = 0n;

/**
 * In-memory table based on {@link Map}s. Supports multiple indices.
 *
 * Getting from any index is cheap. When creating, updating or removing,
 * all indices will be updated which makes those operations slightly more
 * expensive, yet still cheap.
 */
class InMemoryTable<V extends DbTable, I extends keyof V> {
    private readonly _map: Map<V['uid'], V> = new Map();
    private readonly _indices: Indices<V, I>;

    public constructor(indices: IndexHashFunctions<V, I>) {
        this._indices = Object.fromEntries(
            Object.entries(indices).map(([index, hashFunction]) => [
                index,
                {
                    map: new Map<IndexType, typeof index>(),
                    hashFunction,
                },
            ]),
        ) as unknown as Indices<V, I>; // Ugly cast
    }

    /**
     * Map all values of the table.
     */
    public all<K extends keyof V>(keys: readonly K[]): Pick<V, K>[] {
        return Array.from(this._map.values()).map((value) => {
            const copy: Partial<V> = {};
            for (const key of keys) {
                // TODO(WEBMD-686): We need to copy `value` recursively here
                copy[key] = value[key];
            }
            return copy as Pick<V, K>;
        });
    }

    /**
     * Count values of the table.
     *
     * If a predicate function is specified, only consider values for which the predicate returns
     * true.
     */
    public count(predicate?: (value: V) => boolean): u53 {
        let count = 0;
        for (const value of this._map.values()) {
            if (predicate === undefined || predicate(value)) {
                count++;
            }
        }
        return count;
    }

    /**
     * Create a new entry.
     */
    public create(value: DbCreate<V>): DbCreated<V> {
        // Assign a new UID
        assert(CURRENT_UID < 2n ** 64n - 1n, 'Max UID reached');
        const uid = CURRENT_UID++ as V['uid'];

        // Create entry
        // TODO(WEBMD-686): We need to copy `value` recursively here
        const entry = {...value, uid} as unknown as V; // Uglotron 3000
        this._create(entry);
        return uid;
    }

    /**
     * Update all given values of an entry, leave the remaining as-is.
     */
    public set(update: DbUpdate<V>): void {
        // Remove previous entry
        const value = this._remove(update.uid);
        if (value === undefined) {
            throw new Error(`Could not update, UID ${update.uid} not found in database`);
        }

        // TODO(WEBMD-686): We need to copy `update` recursively here
        Object.assign(value, update);

        // Recreate entry
        this._create(value);
    }

    /**
     * Return where an entry for a specific UID exists.
     */
    public hasByUid(uid: V['uid']): boolean {
        return this._map.has(uid);
    }

    /**
     * Return where an entry for a specific index exists.
     */
    public hasByIndex<K extends I>(index: K, field: V[K]): boolean {
        const {map, hashFunction} = this._indices[index];
        return map.has(hashFunction(field));
    }

    /**
     * Return a copy of the stored entry, if found.
     */
    public getByUid(uid: V['uid']): DbGet<V> {
        const value = this._map.get(uid);
        if (value === undefined) {
            return undefined;
        }
        // TODO(WEBMD-686): We need to copy `value` recursively here
        return {...value};
    }

    /**
     * Return a copy of the stored entry, if found.
     */
    public getByIndex<KI extends I, KV extends keyof V>(
        index: KI,
        field: V[KI],
    ): DbGet<{uid: V['uid']} & Pick<V, KV>> {
        const {map, hashFunction} = this._indices[index];
        const value = map.get(hashFunction(field));
        if (value === undefined) {
            return undefined;
        }
        // TODO(WEBMD-686): We need to copy `value` recursively here
        return {...value};
    }

    /**
     * Return a copy of the last value, if any.
     */
    public getLast(): DbGet<V> {
        // TODO(WEBMD-686): Can we make this less expensive?
        const [value] = [...this._map.values()].reverse();
        if ((value as V | undefined) === undefined) {
            return undefined;
        }
        // TODO(WEBMD-686): We need to copy `value` recursively here
        return {...value};
    }

    /**
     * Remove an entry, if existing. No-op if the entry did not exist.
     */
    public remove(uid: DbRemove<V>): boolean {
        return this._remove(uid) !== undefined;
    }

    /**
     * Create a new entry.
     *
     * Important: Caller must ensure that another entry with the same UID does
     *            not exist!
     */
    private _create(value: V): void {
        // Set on primary map
        this._map.set(value.uid, value);

        // Set entry on indices
        for (const [index, {map, hashFunction}] of Object.entries(this._indices) as [
            index: I,
            lookup: UniqueIndex<V, I>,
        ][]) {
            // Ensure that the index is unique
            const field = value[index];
            const hashedField = hashFunction(field);
            if (map.has(hashedField)) {
                throw new Error(`Key for index '${String(index)}' is not unique: ${field}`);
            }
            map.set(hashedField, value);
        }
    }

    /**
     * Remove an entry, if existing.
     */
    private _remove(uid: V['uid']): V | undefined {
        // Lookup in primary map
        const value = this._map.get(uid);
        if (value === undefined) {
            return undefined;
        }

        // Remove entry from indices
        for (const [index, {map, hashFunction}] of Object.entries(this._indices) as [
            index: I,
            lookup: UniqueIndex<V, I>,
        ][]) {
            const field = value[index];
            map.delete(hashFunction(field));
        }

        // Remove from primary map
        this._map.delete(uid);
        return value;
    }
}

/**
 * A noop index hash function.
 */
function noop<F extends IndexType>(field: F): F {
    return field;
}

const CONVERSATION_INDICES = {
    // We use a different map for each kind of receiver, so we can just drop
    // the type and use the receiver UID directly as it is guaranteed to be
    // unique within the map.
    receiver: (receiver: DbReceiverLookup) => receiver.uid,
} as const;

/**
 * An in-memory data store.
 */
export class InMemoryDatabaseBackend implements DatabaseBackend {
    private readonly _log: Logger;
    private readonly _contacts = new InMemoryTable<DbContact, 'identity'>({
        identity: noop,
    } as const);
    private readonly _conversations = new InMemoryTable<
        DbConversation,
        keyof typeof CONVERSATION_INDICES
    >(CONVERSATION_INDICES);
    private readonly _messages = new LazyMap<DbConversationUid, InMemoryTable<DbAnyMessage, 'id'>>(
        () =>
            new InMemoryTable<DbAnyMessage, 'id'>({
                id: noop,
            } as const),
    );

    private readonly _groupsByCreator = new LazyMap<
        IdentityString,
        InMemoryTable<DbGroup, 'groupId'>
    >(
        () =>
            new InMemoryTable<DbGroup, 'groupId'>({
                groupId: noop,
            } as const),
    );

    private readonly _groupMembers = new LazyMap<
        DbGroupUid,
        InMemoryTable<
            {readonly uid: DbGroupMemberUid; readonly contactUid: DbContactUid},
            'contactUid'
        >
    >(
        () =>
            new InMemoryTable<
                {readonly uid: DbGroupMemberUid; readonly contactUid: DbContactUid},
                'contactUid'
            >({
                contactUid: noop,
            } as const),
    );

    private readonly _settings: Partial<Settings> = {};

    private readonly _globalProperties: {
        [TKey in GlobalPropertyKey]?: {value: Uint8Array; readonly uid: DbGlobalPropertyUid};
    } = {};

    public constructor(log: Logger) {
        this._log = log;
        this._log.info('In-memory database initialised');
    }

    /** @inheritdoc */
    public createContact(
        contact: DbCreate<DbContact> & DbCreateConversationMixin,
    ): DbCreated<DbContact> {
        // Create the contact first
        const uid = this._contacts.create(contact);

        // Now, create the associated conversation
        this._conversations.create({
            receiver: {type: ReceiverType.CONTACT, uid},
            lastUpdate: contact.lastUpdate,
            category: contact.category,
            visibility: contact.visibility,
        });
        return uid;
    }

    /** @inheritdoc */
    public hasContactByIdentity(identity: IdentityString): DbHas<DbContact> {
        return this._contacts.getByIndex('identity', identity)?.uid;
    }

    /** @inheritdoc */
    public getContactByUid(uid: DbContactUid): DbGet<DbContact> {
        return this._contacts.getByUid(uid);
    }

    /** @inheritdoc */
    public updateContact(contact: DbUpdate<DbContact>): void {
        this._contacts.set(contact);
    }

    /** @inheritdoc */
    public removeContact(uid: DbRemove<DbContact>): boolean {
        // Lookup the associated conversation
        const conversation = this._conversations.getByIndex('receiver', {
            type: ReceiverType.CONTACT,
            uid,
        });
        if (conversation === undefined) {
            return false;
        }

        // Remove all messages of the conversation
        this._messages.pop(conversation.uid);

        // Then, remove the conversation
        this._conversations.remove(conversation.uid);

        // Next, remove all remaining messages from this user (e.g. in group conversations)
        // TODO(WEBMD-770): Ensure that group messages don't get silently deleted when removing a contact
        for (const [groupConversationUid, messages] of [...this._messages.entries()]) {
            const messageUidsToBeDeleted = messages
                .all(['uid', 'senderContactUid'])
                .filter(({senderContactUid}) => senderContactUid === uid)
                .map(({uid: messageId}) => messageId);

            const groupConversation = this._messages.get(groupConversationUid);
            for (const messageUid of messageUidsToBeDeleted) {
                groupConversation.remove(messageUid);
            }
        }

        // Now, remove the contact
        return this._contacts.remove(uid);
    }

    /** @inheritdoc */
    public getAllContactUids(): DbList<DbContact, 'uid'> {
        return this._contacts.all(['uid']);
    }

    /** @inheritdoc */
    public createGroup(group: DbCreate<DbGroup> & DbCreateConversationMixin): DbCreated<DbGroup> {
        // Create the group first
        const uid = this._groupsByCreator.get(group.creatorIdentity).create(group);

        // Now, create the associated conversation
        this._conversations.create({
            receiver: {type: ReceiverType.GROUP, uid},
            lastUpdate: group.lastUpdate ?? new Date(),
            category: group.category,
            visibility: group.visibility,
        });
        return uid;
    }

    /** @inheritdoc */
    public hasGroupByIdAndCreator(groupId: GroupId, creator: IdentityString): DbHas<DbGroup> {
        return this._groupsByCreator.get(creator).getByIndex('groupId', groupId)?.uid;
    }

    /** @inheritdoc */
    public getGroupByUid(uid: DbGroupUid): DbGet<DbGroup> {
        for (const [, groupMap] of this._groupsByCreator.entries()) {
            const group = groupMap.getByUid(uid);
            if (group !== undefined) {
                return group;
            }
        }
        return undefined;
    }

    /** @inheritdoc */
    public updateGroup(update: DbUpdate<DbGroup>): void {
        const existingGroup = this.getGroupByUid(update.uid);

        if (existingGroup === undefined) {
            throw new Error(`Could not update, UID ${update.uid} does not exist`);
        }

        this._groupsByCreator.get(existingGroup.creatorIdentity).set(update);
    }

    /** @inheritdoc */
    public removeGroup(uid: DbRemove<DbGroup>): boolean {
        // Lookup the associated conversation
        const conversation = this._conversations.getByIndex('receiver', {
            type: ReceiverType.GROUP,
            uid,
        });
        if (conversation === undefined) {
            return false;
        }

        // Remove all messages of the conversation
        this._messages.pop(conversation.uid);

        // Then, remove the conversation
        this._conversations.remove(conversation.uid);

        // Then, remove the group members
        this._groupMembers.pop(uid);

        // Now, remove the group
        const existingGroup = this.getGroupByUid(uid);
        if (existingGroup === undefined) {
            return false;
        }
        return this._groupsByCreator.get(existingGroup.creatorIdentity).remove(uid);
    }

    /** @inheritdoc */
    public getAllGroupUids(): DbList<DbGroup, 'uid'> {
        return [...this._groupsByCreator.entries()].flatMap(([_, groupMap]) =>
            groupMap.all(['uid']),
        );
    }

    /** @inheritdoc */
    public getAllGroupMemberContactUids(groupUid: DbGroupUid): DbList<DbContact, 'uid'> {
        return this._groupMembers
            .get(groupUid)
            .all(['contactUid'])
            .map(({contactUid}) => ({
                uid: contactUid,
            }));
    }

    /** @inheritdoc */
    public getAllActiveGroupUidsByMember(contactUid: DbContactUid): DbList<DbGroup, 'uid'> {
        // TODO(WEBMD-770): Do not take into account only active groups
        const activeGroupUids = [...this._groupsByCreator.entries()]
            .flatMap(([_, groupMap]) => groupMap.all(['uid', 'userState']))
            .filter(({userState}) => userState === GroupUserState.MEMBER)
            .map(({uid}) => uid);

        return [...this._groupMembers.entries()]
            .filter(
                ([uid, members]) =>
                    members.hasByIndex('contactUid', contactUid) && activeGroupUids.includes(uid),
            )
            .map(([uid]) => ({uid}));
    }

    /** @inheritdoc */
    public hasGroupMember(groupUid: DbGroupUid, contactUid: DbContactUid): boolean {
        const members = this._groupMembers.get(groupUid);
        return members.hasByIndex('contactUid', contactUid);
    }

    /** @inheritdoc */
    public createGroupMember(groupUid: DbGroupUid, contactUid: DbContactUid): void {
        // Foreign key checks
        if (this.getGroupByUid(groupUid) === undefined) {
            throw new Error(`Foreign key violation, group with UID ${groupUid} does not exist`);
        }
        if (!this._contacts.hasByUid(contactUid)) {
            throw new Error(`Foreign key violation, contact with UID ${contactUid} does not exist`);
        }

        const members = this._groupMembers.get(groupUid);
        members.create({contactUid});
    }

    /** @inheritdoc */
    public removeGroupMember(groupUid: DbGroupUid, contactUid: DbContactUid): boolean {
        const members = this._groupMembers.get(groupUid);
        const memberUid = members.getByIndex('contactUid', contactUid)?.uid;
        if (memberUid === undefined) {
            return false;
        }
        return members.remove(memberUid);
    }

    /** @inheritdoc */
    public getConversationByUid(
        uid: DbConversationUid,
    ): DbGet<DbConversation & DbUnreadMessageCountMixin> {
        const conversation = this._conversations.getByUid(uid);
        if (conversation === undefined) {
            return undefined;
        }
        return {...conversation, ...this._getUnreadMessageCount(conversation)};
    }

    /** @inheritdoc */
    public getConversationOfReceiver(
        receiver: DbReceiverLookup,
    ): DbGet<DbConversation & DbUnreadMessageCountMixin> {
        const conversation = this._conversations.getByIndex('receiver', receiver);
        if (conversation === undefined) {
            return undefined;
        }
        return {...conversation, ...this._getUnreadMessageCount(conversation)};
    }

    /** @inheritdoc */
    public updateConversation(conversation: DbUpdate<DbConversation>): void {
        this._conversations.set(conversation);
    }

    /** @inheritdoc */
    public getAllConversationReceivers(): DbList<DbConversation, 'receiver'> {
        return this._conversations.all(['receiver']);
    }

    /** @inheritdoc */
    public createTextMessage(message: DbCreate<DbTextMessage>): DbCreated<DbTextMessage> {
        return this._messages.get(message.conversationUid).create(message);
    }

    /** @inheritdoc */
    public createFileMessage(message: DbCreate<DbFileMessage>): DbCreated<DbFileMessage> {
        return this._messages.get(message.conversationUid).create(message);
    }

    /** @inheritdoc */
    public hasMessageById(
        conversationUid: DbConversationUid,
        messageId: MessageId,
    ): DbHas<DbAnyMessage> {
        return this._messages.get(conversationUid).getByIndex('id', messageId)?.uid;
    }

    /** @inheritdoc */
    public getMessageByUid(uid: DbMessageUid): DbGet<DbAnyMessage> {
        for (const [, messageTable] of this._messages.entries()) {
            const message = messageTable.getByUid(uid);
            if (message !== undefined) {
                return message;
            }
        }
        return undefined;
    }

    /** @inheritdoc */
    public getLastMessage(conversationUid: DbConversationUid): DbGet<DbAnyMessage> {
        // TODO(WEBMD-296): Order correctly
        return this._messages.get(conversationUid).getLast();
    }

    /** @inheritdoc */
    public updateMessage(
        conversationUid: DbConversationUid,
        message: DbUpdate<DbAnyMessage, 'type'>,
    ): void {
        const messages = this._messages.get(conversationUid);
        const existing = messages.getByUid(message.uid);
        assert(
            existing !== undefined,
            `Attempted to update message ${message.uid} that does not exist`,
        );
        assert(
            existing.type === message.type,
            'Attempted to update a message with an invalid message type, expected ' +
                `${existing.type}, got ${message.type}`,
        );
        messages.set(message);
    }

    /** @inheritdoc */
    public removeMessage(conversationUid: DbConversationUid, uid: DbRemove<DbAnyMessage>): boolean {
        return this._messages.get(conversationUid).remove(uid);
    }

    /** @inheritdoc */
    public removeAllMessages(conversationUid: DbConversationUid, resetLastUpdate: boolean): void {
        // Remove all messages
        this._messages.pop(conversationUid);

        // Reset `lastUpdate` if requested
        if (resetLastUpdate) {
            const conversation = this._conversations.getByUid(conversationUid);
            assert(conversation !== undefined, `Expected conversation ${conversationUid} to exist`);
            this._conversations.set({uid: conversationUid, lastUpdate: undefined});
        }
    }

    /** @inheritdoc */
    public getMessageUids(
        conversation: DbConversationUid,
        limit?: u53,
        reference?: {
            readonly uid: DbMessageUid;
            readonly direction: MessageQueryDirection;
        },
    ): DbList<DbAnyMessage, 'uid'> {
        // TODO(WEBMD-686): Implement this correctly only after the algorithm has been revised. It
        // (making a sliding window) probably won't work the way it is specced in the interface atm.
        //
        // TODO(WEBMD-296): Order correctly
        return this._messages.get(conversation).all(['uid']);
    }

    /** @inheritdoc */
    public setSettings<TKey extends keyof Settings>(
        category: TKey,
        settings: Settings[TKey],
    ): Settings[TKey] {
        this._settings[category] = settings;
        return settings;
    }

    /** @inheritdoc */
    public getSettings<TKey extends keyof Settings>(category: TKey): Settings[TKey] | undefined {
        return this._settings[category];
    }

    /** @inheritdoc */
    public getSettingsWithDefaults<TKey extends keyof Settings>(
        category: TKey,
        defaults: Settings[TKey],
    ): Settings[TKey] {
        return {
            ...defaults,
            ...this.getSettings(category),
        };
    }

    /** @inheritdoc */
    public updateGlobalProperty<TKey extends GlobalPropertyKey>(
        key: TKey,
        value: Uint8Array,
    ): void {
        const property = this._globalProperties[key];
        if (property === undefined) {
            throw new Error(`Global Property ${key} is not available in the database`);
        }

        property.value = value;
    }

    /** @inheritdoc */
    public createGlobalProperty<TKey extends GlobalPropertyKey>(
        key: TKey,
        value: Uint8Array,
    ): DbCreated<DbGlobalProperty<TKey>> {
        if (key in this._globalProperties) {
            throw new Error(`Global Property ${key} is already stored in database`);
        }

        const uid = CURRENT_UID++ as DbGlobalPropertyUid;
        this._globalProperties[key] = {uid, value};
        return uid;
    }

    /** @inheritdoc */
    public getGlobalProperty<TKey extends GlobalPropertyKey>(
        key: TKey,
    ): DbGet<DbGlobalProperty<TKey>> {
        const queryResult = this._globalProperties[key];
        if (queryResult === undefined) {
            return undefined;
        }
        return {
            ...queryResult,
            key,
        };
    }

    /**
     * Fetch the unread message count for the specified conversation.
     */
    private _getUnreadMessageCount(conversation: DbConversation): DbUnreadMessageCountMixin {
        return {
            unreadMessageCount: this._messages.get(conversation.uid).count((message) => {
                const isInbound = message.senderContactUid !== undefined;
                const isUnread = message.readAt === undefined;
                return isInbound && isUnread;
            }),
        };
    }
}
