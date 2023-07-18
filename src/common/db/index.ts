import {type ServicesForBackend} from '~/common/backend';
import {type PublicKey, type RawKey, wrapRawKey} from '~/common/crypto';
import {
    type AcquaintanceLevel,
    type ActivityState,
    type BlobDownloadState,
    type ContactNotificationTriggerPolicy,
    type ConversationCategory,
    type ConversationVisibility,
    type GlobalPropertyKey,
    type GroupNotificationTriggerPolicy,
    type GroupUserState,
    type IdentityType,
    type ImageRenderingType,
    type MessageQueryDirection,
    type MessageReaction,
    type MessageType,
    type NotificationSoundPolicy,
    type ReadReceiptPolicy,
    type ReceiverType,
    type SyncState,
    type TypingIndicatorPolicy,
    type VerificationLevel,
    type WorkVerificationLevel,
} from '~/common/enum';
import {type FileEncryptionKey, type FileId} from '~/common/file-storage';
import {type BlobId} from '~/common/network/protocol/blob';
import {
    type FeatureMask,
    type GroupId,
    type IdentityString,
    type MessageId,
    type Nickname,
} from '~/common/network/types';
import {type RawBlobKey} from '~/common/network/types/keys';
import {type Settings} from '~/common/settings';
import {
    type ReadonlyUint8Array,
    type u8,
    type u53,
    type u64,
    type WeakOpaque,
} from '~/common/types';

/**
 * Key length of a database key in bytes.
 */
export const DATABASE_KEY_LENGTH = 32;

/**
 * Raw database key (32 bytes).
 *
 * IMPORTANT: DO NOT hold a reference to this key beyond construction
 *            of a {@link SqliteDatabaseBackend}.
 */
export type RawDatabaseKey = WeakOpaque<RawKey<32>, {readonly RawDatabaseKey: unique symbol}>;

/**
 * Wrap a key into a {@link RawDatabaseKey}.
 *
 * @throws {CryptoError} in case the key is not 32 bytes long.
 */
export function wrapRawDatabaseKey(key: Uint8Array): RawDatabaseKey {
    return wrapRawKey(key, DATABASE_KEY_LENGTH) as RawDatabaseKey;
}

/**
 * Services required by the database factory.
 */
export type ServicesForDatabaseFactory = Pick<ServicesForBackend, 'config'>;

/**
 * Allowed UID types for the database backend implementations.
 */
export type DbUid = u64;

/**
 * Constraint all tables must fulfill.
 */
export interface DbTable {
    readonly uid: DbUid;
}

/**
 * UID pick of a table.
 */
export interface PickUid<T extends DbTable, O = undefined> {
    readonly uid: T['uid'] | O;
}

/**
 * Extract the UID type from a table.
 */
export type UidOf<T extends DbTable> = T['uid'];

/**
 * Data required to create an entry.
 */
export type DbCreate<T extends DbTable> = Omit<T, 'uid'>;

/**
 * Pointer returned after creating an entry (i.e. the UID).
 */
export type DbCreated<T extends DbTable> = T['uid'];

/**
 * Pointer to an entry that exists (i.e. the UID) or `undefined`.
 */
export type DbHas<T extends DbTable> = T['uid'] | undefined;

/**
 * Data returned when retrieving an entry.
 *
 * Note: A copy is returned, so it is safe to modify as desired.
 */
export type DbGet<T extends DbTable> = T | undefined;

/**
 * Data returned when retrieving all existing entries.
 */
export type DbList<T extends DbTable, K extends keyof T = keyof T> = readonly Pick<T, K>[];

/**
 * Data required to update an entry.
 */
export type DbUpdate<T extends DbTable, TRequiredKeys extends keyof T = never> = Partial<T> &
    Pick<T, 'uid'> &
    Pick<T, TRequiredKeys>;

/**
 * Data required to remove an entry.
 */
export type DbRemove<T extends DbTable> = T['uid'];

/**
 * Constraint all receivers must fulfill.
 */
export interface DbReceiverCommon<T extends ReceiverType, U extends DbUid> {
    readonly type: T;
    readonly uid: U;
}

/**
 * A database contact UID.
 */
export type DbContactUid = WeakOpaque<DbUid, {readonly DbContactUid: unique symbol}>;

/**
 * A database contact.
 */
export type DbContact = {
    readonly identity: IdentityString;
    readonly publicKey: PublicKey;
    readonly createdAt: Date;
    firstName: string;
    lastName: string;
    nickname?: Nickname;
    verificationLevel: VerificationLevel;
    workVerificationLevel: WorkVerificationLevel;
    identityType: IdentityType;
    acquaintanceLevel: AcquaintanceLevel;
    activityState: ActivityState;
    featureMask: FeatureMask;
    syncState: SyncState;
    typingIndicatorPolicyOverride?: TypingIndicatorPolicy;
    readReceiptPolicyOverride?: ReadReceiptPolicy;
    notificationTriggerPolicyOverride?: {
        readonly policy: ContactNotificationTriggerPolicy;
        readonly expiresAt?: Date;
    };
    notificationSoundPolicyOverride?: NotificationSoundPolicy;
    profilePictureContactDefined?: ReadonlyUint8Array;
    profilePictureGatewayDefined?: ReadonlyUint8Array;
    profilePictureUserDefined?: ReadonlyUint8Array;
    profilePictureBlobIdSent?: BlobId;
    readonly colorIndex: u8;
} & DbReceiverCommon<ReceiverType.CONTACT, DbContactUid>;

/**
 * A database distribution list UID.
 */
export type DbDistributionListUid = WeakOpaque<
    DbUid,
    {readonly DbDistributionListUid: unique symbol}
>;

/**
 * A database distribution list.
 */
export type DbDistributionList = {
    name: string;
    readonly colorIndex: u8;
} & DbReceiverCommon<ReceiverType.DISTRIBUTION_LIST, DbDistributionListUid>;

/**
 * A database group UID.
 */
export type DbGroupUid = WeakOpaque<DbUid, {readonly DbGroupUid: unique symbol}>;

/**
 * A database group membership UID.
 */
export type DbGroupMemberUid = WeakOpaque<DbUid, {readonly DbGroupMemberUid: unique symbol}>;

/**
 * A database group.
 */
export type DbGroup = {
    readonly groupId: GroupId;
    readonly creatorIdentity: IdentityString;
    readonly createdAt: Date;
    name: string;
    userState: GroupUserState;
    notificationTriggerPolicyOverride?: {
        readonly policy: GroupNotificationTriggerPolicy;
        readonly expiresAt?: Date;
    };
    notificationSoundPolicyOverride?: NotificationSoundPolicy;
    profilePictureAdminDefined?: ReadonlyUint8Array;
    readonly colorIndex: u8;
} & DbReceiverCommon<ReceiverType.GROUP, DbGroupUid>;

/**
 * A database receiver may be a contact, a group or a distribution list.
 */
export type DbReceiver = DbContact | DbDistributionList | DbGroup;

/**
 * A type/uid pair that uniquely identifies a {@link DbContact}. See also {@link DbReceiverLookup}.
 */
export type DbContactReceiverLookup = Pick<DbContact, 'type' | 'uid'>;

/**
 * A type/uid pair that uniquely identifies a {@link DbDistributionList}. See also {@link DbReceiverLookup}.
 */
export type DbDistributionListReceiverLookup = Pick<DbDistributionList, 'type' | 'uid'>;

/**
 * A type/uid pair that uniquely identifies a {@link DbGroup}. See also {@link DbReceiverLookup}.
 */
export type DbGroupReceiverLookup = Pick<DbGroup, 'type' | 'uid'>;

/**
 * A type/uid pair that uniquely identifies a {@link DbReceiver}.
 */
export type DbReceiverLookup =
    | DbContactReceiverLookup
    | DbDistributionListReceiverLookup
    | DbGroupReceiverLookup;

/**
 * A database conversation UID.
 */
export type DbConversationUid = WeakOpaque<DbUid, {readonly DbConversationUid: unique symbol}>;

/**
 * A database conversation.
 */
export interface DbConversation {
    readonly uid: DbConversationUid;
    readonly receiver: DbReceiverLookup;
    lastUpdate?: Date;
    category: ConversationCategory;
    visibility: ConversationVisibility;
}

/**
 * The unread message count of a database conversation.
 */
export interface DbUnreadMessageCountMixin {
    unreadMessageCount: u53;
}

/**
 * Create mixin for a database conversation.
 */
export type DbCreateConversationMixin = DbCreate<
    Omit<DbConversation, 'receiver' | 'unreadMessageCount'>
>;

/**
 * A database message UID.
 */
export type DbMessageUid = WeakOpaque<DbUid, {readonly DbMessageUid: unique symbol}>;

/**
 * Attributes very close to the columns in the DB.
 */
export interface DbMessageCommon<T extends MessageType> {
    /**
     * Primary key.
     */
    readonly uid: DbMessageUid;

    /**
     * 8 byte message ID.
     */
    readonly id: MessageId;

    /**
     * Message type (e.g. text, file, etc).
     */
    readonly type: T;

    /**
     * UID of the contact that sent this message.
     *
     * Note: If provided, this is an inbound message. If not provided, this is
     *       an outbound message.
     */
    readonly senderContactUid?: DbContactUid;

    /**
     * UID of the associated conversation.
     */
    readonly conversationUid: DbConversationUid;

    /**
     * Timestamp for when the message...
     *
     * - Outbound: Has been created on the local device.
     * - Inbound: Has been created on the remote device.
     *
     * Note: For inbound messages, this timestamp may have an arbitrary value as it's controlled by
     *       the sender.
     */
    readonly createdAt: Date;

    /**
     * Optional timestamp for when the message...
     *
     * - Outbound: The "sentAt" timestamp.
     * - Inbound: The "receivedAt" timestamp.
     *
     * Note: The value is always known for inbound messages but not known until acknowledged for
     *       outbound messages.
     */
    processedAt?: Date;

    /**
     * Optional timestamp for when the message...
     *
     * - Outbound: We have received the delivery receipt (either directly from the CSP if we are the
     *   lead device, i.e. "fromRemote", or reflected, i.e. "fromSync") for a message that we sent.
     * - Inbound: Must be undefined
     */
    deliveredAt?: Date;

    /**
     * Optional timestamp for when the 'read' delivery receipt message...
     *
     * - Outbound: Has been reflected to other devices / by another device.
     * - Inbound: Has been reflected to other devices / by another device.
     */
    readAt?: Date;

    /**
     * Optional reaction to a message.
     */
    lastReaction?: {
        readonly at: Date;
        readonly type: MessageReaction;
    };

    /**
     * Unparsed raw body. Only provided for inbound messages.
     */
    readonly raw?: ReadonlyUint8Array;

    /**
     * Auto-incrementing thread ID used for sorting.
     */
    readonly threadId: u64;
}

/**
 * A database text message.
 */
export interface DbTextMessageFragment {
    /**
     * The message text.
     */
    readonly text: string;
    /**
     * The optional quoted message id.
     */
    readonly quotedMessageId?: MessageId;
}
export type DbTextMessage = DbTextMessageFragment & DbMessageCommon<MessageType.TEXT>;

export interface DbFileData {
    readonly fileId: FileId;
    readonly encryptionKey: FileEncryptionKey;
    readonly unencryptedByteCount: u53;
    readonly storageFormatVersion: u53;
}

/**
 * Fields shared among all file-based message data tables in the database.
 */
export interface DbBaseFileMessageFragment {
    readonly blobId?: BlobId;
    readonly thumbnailBlobId?: BlobId;
    readonly blobDownloadState?: BlobDownloadState;
    readonly thumbnailBlobDownloadState?: BlobDownloadState;
    readonly encryptionKey: RawBlobKey;
    fileData?: DbFileData;
    thumbnailFileData?: DbFileData;
    readonly mediaType: string;
    readonly thumbnailMediaType?: string;
    readonly fileName?: string;
    readonly fileSize: u53;
    readonly caption?: string;
    readonly correlationId?: string;
}

/**
 * Fields of the database file message data table.
 */
export type DbFileMessageFragment = DbBaseFileMessageFragment;
export type DbFileMessage = DbFileMessageFragment & DbMessageCommon<MessageType.FILE>;

/**
 * Fields of the database image message data table.
 */
export interface DbImageMessageFragment extends DbBaseFileMessageFragment {
    readonly renderingType: ImageRenderingType;
    readonly animated: boolean;
    readonly dimensions?: {
        readonly height: u53;
        readonly width: u53;
    };
}
export type DbImageMessage = DbImageMessageFragment & DbMessageCommon<MessageType.IMAGE>;

/**
 * A file data UID.
 */
export type DbFileDataUid = WeakOpaque<DbUid, {readonly DbFileDataUid: unique symbol}>;

/**
 * Any database message.
 */
export type DbAnyMessage = DbTextMessage | DbFileMessage | DbImageMessage;

/**
 * Map from message type to a specific database message type.
 */
export type DbMessageFor<TType extends MessageType> = TType extends 'text'
    ? DbTextMessage
    : TType extends 'file'
    ? DbFileMessage
    : TType extends 'image'
    ? DbImageMessage
    : never;

/**
 * A database message UID.
 */
export type DbGlobalPropertyUid = WeakOpaque<DbUid, {readonly DbGlobalPropertyUid: unique symbol}>;

export interface DbGlobalProperty<TKey extends GlobalPropertyKey> {
    readonly uid: DbGlobalPropertyUid;
    readonly key: TKey;
    readonly value: ReadonlyUint8Array;
}

/**
 * The {@link DatabaseBackend} is an interface that abstracts away all calls directed at a concrete
 * database backend implementation. This allows implementing multiple persistence layers, e.g. an
 * in-memory store or an SQLite store.
 *
 * IMPORTANT: Calls that create or update data must be made with **exact** properties (i.e. no
 *   additional properties must be provided). Use {@link createExactPropertyValidator} appropriately
 *   in the associated model.
 */
export interface DatabaseBackend {
    /**
     * Create a new contact and an associated conversation.
     */
    readonly createContact: (
        contact: DbCreate<DbContact> & DbCreateConversationMixin,
    ) => DbCreated<DbContact>;

    /**
     * If the contact with the specified identity exists,
     * return its UID.
     */
    readonly hasContactByIdentity: (identity: IdentityString) => DbHas<DbContact>;

    /**
     * Get the contact with the specified UID.
     */
    readonly getContactByUid: (uid: DbContactUid) => DbGet<DbContact>;

    /**
     * Update the specified contact. Fields that are missing will be ignored.
     */
    readonly updateContact: (contact: DbUpdate<DbContact>) => void;

    /**
     * Remove the specified contact, its conversation and all associated messages. Return whether
     * the contact was found and removed.
     *
     * The caller must ensure that the contact is not member of any groups or distribution lists at
     * this point.
     *
     * @throws if contact is still a member of a group or distribution list
     */
    readonly removeContact: (uid: DbRemove<DbContact>) => boolean;

    /**
     * Return the uid for all contacts.
     */
    readonly getAllContactUids: () => DbList<DbContact, 'uid'>;

    /**
     * Create a new group and an associated conversation.
     *
     * TODO(DESK-544): createGroup assumes that the contact for the creatorIdentity already exists.
     */
    readonly createGroup: (
        group: DbCreate<DbGroup> & DbCreateConversationMixin,
    ) => DbCreated<DbGroup>;

    /**
     * If the group with the specified id and creator exists, return its UID.
     */
    readonly hasGroupByIdAndCreator: (id: GroupId, creator: IdentityString) => DbHas<DbGroup>;

    /**
     * Get the group with the specified UID.
     */
    readonly getGroupByUid: (uid: DbGroupUid) => DbGet<DbGroup>;

    /**
     * Update the specified group. Fields that are missing will be ignored.
     */
    readonly updateGroup: (contact: DbUpdate<DbGroup>) => void;

    /**
     * Remove the specified group, its conversation and all associated messages.
     * Return whether the group was found and removed.
     */
    readonly removeGroup: (uid: DbRemove<DbGroup>) => boolean;

    /**
     * Return the uid for all groups.
     */
    readonly getAllGroupUids: () => DbList<DbGroup, 'uid'>;

    /**
     * Return the uids of all members of a group.
     */
    readonly getAllGroupMemberContactUids: (groupUid: DbGroupUid) => DbList<DbContact, 'uid'>;

    /**
     * Return the uids of all groups a contact is member of.
     */
    readonly getAllActiveGroupUidsByMember: (contactUid: DbContactUid) => DbList<DbGroup, 'uid'>;

    /**
     * Return whether the specified contact is part of the specified group.
     */
    readonly hasGroupMember: (groupUid: DbGroupUid, contactUid: DbContactUid) => boolean;

    /**
     * Add a group member to a group.
     *
     * @throws if group or contact does not exist
     * @throws if this group membership already exists
     */
    readonly createGroupMember: (groupUid: DbGroupUid, contactUid: DbContactUid) => void;

    /**
     * Remove a group membership. Return whether a membership was found and removed.
     *
     * TODO(DESK-538): When contact with AcquaintanceLevel.GROUP is removed from the last group, delete it
     */
    readonly removeGroupMember: (groupUid: DbGroupUid, contactUid: DbContactUid) => boolean;

    /**
     * Return the conversation with the specified UID, including the unread message count.
     */
    readonly getConversationByUid: (
        uid: DbConversationUid,
    ) => DbGet<DbConversation & DbUnreadMessageCountMixin>;

    /**
     * Return the conversation linked to a specified receiver, including the unread message count.
     */
    readonly getConversationOfReceiver: (
        receiver: DbReceiverLookup,
    ) => DbGet<DbConversation & DbUnreadMessageCountMixin>;

    /**
     * Update a specified conversation. Fields that are missing will be ignored.
     */
    readonly updateConversation: (conversation: DbUpdate<Omit<DbConversation, 'receiver'>>) => void;

    /**
     * Return the receivers for all conversations.
     */
    readonly getAllConversationReceivers: () => DbList<DbConversation, 'receiver'>;

    /**
     * Create a new text message.
     */
    readonly createTextMessage: (message: DbCreate<DbTextMessage>) => DbCreated<DbTextMessage>;

    /**
     * Create a new file message.
     */
    readonly createFileMessage: (message: DbCreate<DbFileMessage>) => DbCreated<DbFileMessage>;

    /**
     * Create a new image message.
     */
    readonly createImageMessage: (message: DbCreate<DbImageMessage>) => DbCreated<DbImageMessage>;

    /**
     * If the message ID exists in the conversation, return its UID.
     */
    readonly hasMessageById: (
        conversationUid: DbConversationUid,
        messageId: MessageId,
    ) => DbHas<DbAnyMessage>;

    /**
     * Get the message with the specified UID.
     */
    readonly getMessageByUid: (uid: DbMessageUid) => DbGet<DbAnyMessage>;

    /**
     * Get the last (most recent) message of the conversation.
     */
    readonly getLastMessage: (conversationUid: DbConversationUid) => DbGet<DbAnyMessage>;

    /**
     * Update the specified message. Fields that are missing will be ignored.
     *
     * When file messages are updated, it's possible that file message data is removed. If this
     * happens, the list of {@link FileId}s that can now be deleted from the storage is returned. It
     * is the responsibility of the caller to delete these files from the file storage.
     *
     * IMPORTANT: The `conversation.type` field **must not** be altered!
     */
    readonly updateMessage: (
        conversationUid: DbConversationUid,
        message: DbUpdate<DbAnyMessage, 'type'>,
    ) => {deletedFileIds: FileId[]};

    /**
     * Remove the message and associated data.
     *
     * Return whether a message was found and removed. Additionally, the list of {@link FileId}s
     * that were removed from the database is returned. This data should be used by the caller to
     * clean up the file storage.
     */
    readonly removeMessage: (
        conversationUid: DbConversationUid,
        uid: DbRemove<DbAnyMessage>,
    ) => {removed: boolean; deletedFileIds: FileId[]};

    /**
     * Remove all messages of a conversation.
     *
     * @param resetLastUpdate whether the `lastUpdate` field of the conversation should be reset in
     *   order to hide the conversation (`true`) or keep an empty conversation (`false`).
     * @returns the number of removed messages, as well as the list of {@link FileId}s that were
     *   removed from the database. This data should be used by the caller to clean up the file
     *   storage.
     */
    readonly removeAllMessages: (
        conversationUid: DbConversationUid,
        resetLastUpdate: boolean,
    ) => {removed: u53; deletedFileIds: FileId[]};

    /**
     * Mark all incoming messages of the given conversation as read.
     *
     * @returns the UID and message ID for all messages marked as read.
     */
    readonly markConversationAsRead: (
        conversationUid: DbConversationUid,
        readAt: Date,
    ) => DbList<DbAnyMessage, 'uid' | 'id'>;

    /**
     * Return `limit` amount (or all) message UIDs associated to a conversation.
     *
     * If the reference message UID is not defined, fetch the newest `limit` message UIDs.
     *
     * If the reference message UID is provided, fetch `limit-1` message UIDs newer/older than it.
     *
     * TODO(DESK-296): Order correctly. Right now, the order of messages returned is undefined.
     * Find out whether there is a logical order (older-to-newer or newer-to-old) that can be used
     * as-is. Take threading ID into account for sorting.
     */
    readonly getMessageUids: (
        conversationUid: DbConversationUid,
        limit?: u53,
        reference?: {
            readonly uid: DbMessageUid;
            readonly direction: MessageQueryDirection;
        },
    ) => DbList<DbAnyMessage, 'uid'>;

    /**
     * Store settings for a given category. It returns the given settings if the action was successful.
     */
    readonly setSettings: <TKey extends keyof Settings>(
        category: TKey,
        settings: Settings[TKey],
    ) => Settings[TKey];

    /**
     * Get settings for a given category if it exist. If the category does not exist in the
     * underlying storage 'undefined' will be returned.
     */
    readonly getSettings: <TKey extends keyof Settings>(
        category: TKey,
    ) => Settings[TKey] | undefined;

    /**
     * Update a property for a given key. It returns the property if the action was
     * successful.
     *
     * @throws Error if the property does not yet exist.
     */
    readonly updateGlobalProperty: <TKey extends GlobalPropertyKey>(
        key: TKey,
        value: Uint8Array,
    ) => void;

    /**
     * Create a new Property for a given keys. It returns the property if the action was successful.
     *
     * @throws Error if the property already exists.
     */
    readonly createGlobalProperty: <TKey extends GlobalPropertyKey>(
        key: TKey,
        value: Uint8Array,
    ) => DbCreated<DbGlobalProperty<TKey>>;

    /**
     * Get property for a given key if it exist. If the property does not exist in the underlying
     * storage 'undefined' will be returned.
     */
    readonly getGlobalProperty: <TKey extends GlobalPropertyKey>(
        key: TKey,
    ) => DbGet<DbGlobalProperty<TKey>>;
}
