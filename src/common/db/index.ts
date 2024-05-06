import type {ServicesForBackend} from '~/common/backend';
import {type NonceHash, type PublicKey, type RawKey, wrapRawKey} from '~/common/crypto';
import type {
    AcquaintanceLevel,
    ActivityState,
    BlobDownloadState,
    ContactNotificationTriggerPolicy,
    ConversationCategory,
    ConversationVisibility,
    GlobalPropertyKey,
    GroupNotificationTriggerPolicy,
    GroupUserState,
    IdentityType,
    ImageRenderingType,
    MessageQueryDirection,
    MessageReaction,
    MessageType,
    NonceScope,
    NotificationSoundPolicy,
    ReadReceiptPolicy,
    ReceiverType,
    StatusMessageType,
    SyncState,
    TypingIndicatorPolicy,
    VerificationLevel,
    WorkVerificationLevel,
} from '~/common/enum';
import type {FileEncryptionKey, FileId} from '~/common/file-storage';
import type {
    AnyNonDeletedMessageType,
    IdentityStringOrMe,
    MediaBasedMessageType,
    TextBasedMessageType,
} from '~/common/model/types/message';
import type {BlobId} from '~/common/network/protocol/blob';
import type {
    FeatureMask,
    GroupId,
    IdentityString,
    MessageId,
    Nickname,
    StatusMessageId,
} from '~/common/network/types';
import type {RawBlobKey} from '~/common/network/types/keys';
import type {Settings} from '~/common/settings';
import type {f64, ReadonlyUint8Array, u8, u53, u64, WeakOpaque} from '~/common/types';

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
    readonly colorIndex: u8;
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
    readonly colorIndex: u8;
    name: string;
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
    readonly colorIndex: u8;
    name: string;
    userState: GroupUserState;
    notificationTriggerPolicyOverride?: {
        readonly policy: GroupNotificationTriggerPolicy;
        readonly expiresAt?: Date;
    };
    notificationSoundPolicyOverride?: NotificationSoundPolicy;
    profilePictureAdminDefined?: ReadonlyUint8Array;
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
 * A database history message Uid.
 */
export type DbMessageHistoryUid = WeakOpaque<DbUid, {readonly DbMessageHistoryUid: unique symbol}>;

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
     * Unparsed raw body. Only provided for inbound messages.
     */
    readonly raw?: ReadonlyUint8Array;

    /**
     * Auto-incrementing thread ID used for sorting.
     */
    readonly threadId: u64;

    /**
     * Ordinal for message ordering. Note: Higher `ordinal` means the message is newer.
     */
    readonly ordinal: u53;

    /**
     * Optional timestamp for when the message...
     *
     * - Outbound: The "sentAt" timestamp.
     * - Inbound: The "receivedAt" timestamp.
     *
     * Note: The value is always known for inbound messages but not known until acknowledged for
     *       outbound messages.
     */
    readonly processedAt?: Date;

    /**
     * Optional timestamp for when the message...
     *
     * - Outbound: We have received the delivery receipt (either directly from the CSP if we are the
     *   lead device, i.e. "fromRemote", or reflected, i.e. "fromSync") for a message that we sent.
     * - Inbound: Must be undefined
     */
    readonly deliveredAt?: Date;

    /** Optional timestamp for when a message was edited. Defaults to null if a message was never edited.*/
    readonly lastEditedAt?: Date;

    /** Optional timestamp for when a message was deleted. Defaults to null if a message has not been deleted yet. */
    readonly deletedAt?: Date;

    /**
     * Optional timestamp for when the 'read' delivery receipt message...
     *
     * - Outbound: Has been reflected to other devices / by another device.
     * - Inbound: Has been reflected to other devices / by another device.
     */
    readonly readAt?: Date;

    /**
     * An array of reactions to the corresponding message.
     * Is empty when the message was never reacted to.
     */
    readonly reactions: Pick<DbMessageReaction, 'reaction' | 'reactionAt' | 'senderIdentity'>[];

    /**
     * An array of versions of this message.
     * Is empty if the message has no version history (i.e has never been edited).
     */
    readonly history: Pick<DbMessageHistory, 'editedAt' | 'text'>[];
}

/**
 * Data required to create a message entry.
 */
export type DbCreateMessage<T extends DbTable> = Omit<DbCreate<T>, 'ordinal'>;

export type DbMessageReactionUid = WeakOpaque<DbUid, {readonly dbGroupReactions: unique symbol}>;

/** The table for group reactions */
export interface DbMessageReaction {
    readonly uid: DbMessageReactionUid;

    /**
     * The timestamp of the reaction
     *
     * It is updated when the reaction goes from ACKNOWLEDGED to DECLINED and vice versa.
     */
    readonly reactionAt: Date;

    readonly reaction: MessageReaction;

    /**
     * The sender of the reaction. If it is oneself, the identity string is 'me'
     */
    readonly senderIdentity: IdentityStringOrMe;

    readonly messageUid: DbMessageUid;
}

/**
 * A table for message histories Each entry describes a version of a message, referring to its text.
 */
export interface DbMessageHistory {
    readonly uid: DbMessageHistoryUid;
    /**
     * The timestamp of this particular edit.
     */
    readonly editedAt: Date;
    /**
     * The text that this edit has resulted in. It can be empty for non-text messages (i.e
     * captions). It is the respons ibility of the backend/frontend to make sure that text messages
     * are not edited to be empty.
     */
    readonly text?: string;
    /**
     * The messageUid of the message that this version belongs to.
     */
    readonly messageUid: DbMessageUid;
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
    readonly mediaType: string;
    readonly thumbnailMediaType?: string;
    readonly fileName?: string;
    readonly fileSize: u53;
    readonly caption?: string;
    readonly correlationId?: string;
    fileData?: DbFileData;
    thumbnailFileData?: DbFileData;
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
 * Fields of the database video message data table.
 */
export interface DbVideoMessageFragment extends DbBaseFileMessageFragment {
    readonly duration?: f64;
    readonly dimensions?: {
        readonly height: u53;
        readonly width: u53;
    };
}
export type DbVideoMessage = DbVideoMessageFragment & DbMessageCommon<MessageType.VIDEO>;

/**
 * Fields of the database audio message data table.
 */
export interface DbAudioMessageFragment extends DbBaseFileMessageFragment {
    readonly duration?: f64;
}
export type DbAudioMessage = DbAudioMessageFragment & DbMessageCommon<MessageType.AUDIO>;

/**
 * A deleted message cannot have a raw body, nor can it be edited, have reactions or have a history.
 */
export type DbDeletedMessage = Omit<
    DbMessageCommon<MessageType.DELETED>,
    'raw' | 'lastEditedAt' | 'reactions' | 'history'
> &
    Required<Pick<DbMessageCommon<MessageType.DELETED>, 'deletedAt'>>;

/**
 * A file data UID.
 */
export type DbFileDataUid = WeakOpaque<DbUid, {readonly DbFileDataUid: unique symbol}>;

export type DbAnyNonDeletedMessage =
    | DbTextMessage
    | DbFileMessage
    | DbImageMessage
    | DbVideoMessage
    | DbAudioMessage;

/*
 * Any database message.
 */
export type DbAnyMessage = DbAnyNonDeletedMessage | DbDeletedMessage;

/**
 * Any database media (file-based) message
 */
export type DbAnyMediaMessage = DbFileMessage | DbImageMessage | DbVideoMessage | DbAudioMessage;

/**
 * The editable parts of a message in the database.
 *
 * This includes the text (for text messages) or caption (for media messages) along with the
 * `lastEditedAt` timestamp.
 */
export type DbMessageEditFor<TMessageType extends MessageType> =
    TMessageType extends TextBasedMessageType
        ? Required<Pick<DbUpdate<DbTextMessage>, 'text' | 'lastEditedAt'>>
        : TMessageType extends MediaBasedMessageType
          ? Required<Pick<DbUpdate<DbAnyMediaMessage>, 'caption' | 'lastEditedAt'>>
          : never;

/**
 * Map from message type to a specific database message type.
 */
export type DbMessageFor<TType extends MessageType> = {
    text: DbTextMessage;
    file: DbFileMessage;
    image: DbImageMessage;
    video: DbVideoMessage;
    audio: DbAudioMessage;
    deleted: DbDeletedMessage;
}[TType];

/*
 * Helper type for queries to the message database Text can be undefined because it might be empty
 * for file messages
 */
export interface DbMessageLastEdit {
    text?: string;
    lastEditedAt?: Date;
    createdAt: Date;
}

/**
 * A status message UID.
 */
export type DbStatusMessageUid = WeakOpaque<DbUid, {readonly DbStatusMessageUid: unique symbol}>;

export interface DbStatusMessage {
    readonly createdAt: Date;
    readonly conversationUid: DbConversationUid;
    /**
     * Unique identifier of a status message.
     */
    readonly id: StatusMessageId;
    readonly ordinal: u53;
    readonly statusBytes: ReadonlyUint8Array;
    readonly type: StatusMessageType;
    readonly uid: DbStatusMessageUid;
}

/**
 * Data required to create a status message entry.
 */
export type DbCreateStatusMessage<T extends DbTable> = Omit<DbCreate<T>, 'id' | 'ordinal'>;

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
 * A database message UID.
 */
export type DbNonceUid = WeakOpaque<DbUid, {readonly DbNonceUid: unique symbol}>;

export interface DbNonce {
    readonly uid: DbNonceUid;
    readonly scope: NonceScope;
    readonly nonce: NonceHash;
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
export interface DatabaseBackend extends NonceDatabaseBackend {
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
     *
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
    readonly createTextMessage: (
        message: DbCreateMessage<DbTextMessage>,
    ) => DbCreated<DbTextMessage>;

    /**
     * Create a new file message.
     */
    readonly createFileMessage: (
        message: DbCreateMessage<DbFileMessage>,
    ) => DbCreated<DbFileMessage>;

    /**
     * Create a new image message.
     */
    readonly createImageMessage: (
        message: DbCreateMessage<DbImageMessage>,
    ) => DbCreated<DbImageMessage>;

    /**
     * Create a new video message.
     */
    readonly createVideoMessage: (
        message: DbCreateMessage<DbVideoMessage>,
    ) => DbCreated<DbVideoMessage>;

    /**
     * Create a new audio message.
     */
    readonly createAudioMessage: (
        message: DbCreateMessage<DbAudioMessage>,
    ) => DbCreated<DbAudioMessage>;

    /**
     * Add a status message to the db.
     */
    readonly createStatusMessage: (
        statusMessage: DbCreateStatusMessage<DbStatusMessage>,
    ) => DbCreated<DbStatusMessage>;

    /**
     * If the message ID exists in the conversation, return its UID.
     */
    readonly hasMessageById: (
        conversationUid: DbConversationUid,
        messageId: MessageId,
    ) => DbHas<DbAnyMessage>;

    /**
     * Returns true if the status message UID exists in this conversation.
     */
    readonly hasStatusMessageByUid: (
        conversationUid: DbConversationUid,
        uid: DbStatusMessageUid,
    ) => boolean;

    /**
     * Return identifiers (`conversationUid`, `id`, and `uid`) of all matching messages that contain
     * the given text (case-insensitive).
     *
     * Note: Quoted content will not be searched, nor will deleted messages.
     */
    readonly getMessageIdentifiersByText: (
        text: string,
        limit?: u53,
    ) => DbList<Pick<DbAnyNonDeletedMessage, 'conversationUid' | 'id' | 'uid'>>;

    /**
     * Get the message with the specified UID.
     */
    readonly getMessageByUid: (uid: DbMessageUid) => DbGet<DbAnyMessage>;

    /**
     * Get the status message with the specified UID.
     */
    readonly getStatusMessageByUid: (uid: DbStatusMessageUid) => DbGet<DbStatusMessage>;

    /**
     * Get the last (most recent) message of the conversation.
     */
    readonly getLastMessage: (conversationUid: DbConversationUid) => DbGet<DbAnyMessage>;

    /**
     * Get the last (most recent) status message of the conversation.
     */
    readonly getLastStatusMessage: (conversationUid: DbConversationUid) => DbGet<DbStatusMessage>;

    /**
     * Get the first (oldest), unread message of the conversation.
     */
    readonly getFirstUnreadMessage: (conversationUid: DbConversationUid) => DbGet<DbAnyMessage>;

    /**
     * Get all status messages of the conversation.
     */
    readonly getStatusMessagesOfConversation: (
        conversationUid: DbConversationUid,
    ) => Omit<DbStatusMessage, 'conversationUid' | 'id' | 'ordinal'>[];

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
        message: DbUpdate<DbAnyNonDeletedMessage, 'type'>,
    ) => {deletedFileIds: FileId[]};

    /**
     * Updates the `deliveredAt` and `readAt` timestamp of a deleted message.
     *
     * Returns false if the message could not be found or if it was not deleted.
     */
    readonly updateDeletedMessageTimestamps: (
        messageUid: DbMessageUid,
        timestamps: {deliveredAt: Date} | {readAt: Date},
    ) => boolean;

    /**
     * Create or update the reaction to a specified message.
     */
    readonly createOrUpdateMessageReaction: (reaction: DbCreate<DbMessageReaction>) => void;

    /**
     * Edit the text of an existing message of any type.
     *
     * Updates the main message table's `lastEditedAt` field of the corresponding message.
     */
    readonly editMessage: <TMessageType extends AnyNonDeletedMessageType>(
        messageUid: DbMessageUid,
        type: TMessageType,
        messageUpdate: DbMessageEditFor<TMessageType>,
    ) => void;

    /**
     * Return all reactions for the message with the specified {@link uid}.
     */
    readonly getReactionsByMessageUid: (uid: DbMessageUid) => DbGet<DbMessageReaction>[];

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
     * Delete the message and associated data. This includes subtables, such as the type specific
     * message subtable, reactions and the history. Furthermore, it marks the message as deleted.
     * Additionally, the list of {@link FileId}s that were removed from the database is returned.
     * This data should be used by the caller to clean up the file storage. Note: This differs in
     * removing a message in a fundamental way: A message removal only happens locally while message
     * deletion is reflected and set to the recipient as well. This also means that the message
     * persists in the local database, marked as deleted, and a placeholder is shown for it on all
     * affected devices.
     */
    readonly deleteMessage: (
        conversationUid: DbConversationUid,
        uid: DbRemove<DbAnyMessage>,
        deletedAt: Date,
    ) => {deletedMessage: DbDeletedMessage | undefined; deletedFileIds: FileId[]};

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
     * Delete a status message given a UID.
     *
     * @returns whether a status message was deleted or not
     */
    readonly removeStatusMessage: (uid: DbRemove<DbStatusMessage>) => boolean;

    /**
     * Remove all status messages of a given conversation, no matter the type.
     *
     * @returns the number of deleted status messages
     */
    readonly removeAllStatusMessagesOfConversation: (uid: DbConversationUid) => u53;

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
     * - If a reference message is defined: fetch list of message UIDs older/newer than the
     *   reference message (and also including the reference message itself).
     * - If no reference message is defined: fetch list of the newest messages.
     *
     * @param conversationUid {@link DbConversationUid} of the conversation to search in.
     * @param limit The length of the list of results to return. Note: Possibly smaller, if there
     *   are fewer messages in the conversation than `limit`.
     * @param reference The reference ordinal to fetch around.
     * @returns List of message UIDs. If the combination of reference and conversationUid does not
     *   match, no message is returned.
     */
    readonly getMessageUids: (
        conversationUid: DbConversationUid,
        limit?: u53,
        reference?: {
            readonly direction: MessageQueryDirection;
            readonly ordinal: u53;
        },
    ) => DbList<DbAnyMessage, 'uid'>;

    /**
     * Return `limit` amount (or all) status message UIDs associated to a conversation.
     *
     * - If a reference status message is defined: fetch list of message UIDs older/newer than the
     *   reference status message (and also including the reference message itself).
     * - If no reference status message is defined: fetch list of the newest status messages.
     *
     * TODO(DESK-296): Order correctly. Right now, the order of status messages returned is
     * undefined. Find out whether there is a logical order (older-to-newer or newer-to-old) that
     * can be used as-is. Take threading ID into account for sorting.
     *
     * @param conversationUid {@link DbConversationUid} of the conversation to search in.
     * @param limit The length of the list of results to return. Note: Possibly smaller, if there
     *   are fewer status messages in the conversation than `limit`.
     * @param reference The reference ordinal to fetch around.
     * @returns List of status message UIDs. If the combination of reference and conversationUid
     *   does not match, no status message is returned.
     */
    readonly getStatusMessageUids: (
        conversationUid: DbConversationUid,
        limit?: u53,
        reference?: {
            readonly direction: MessageQueryDirection;
            readonly ordinal: u53;
        },
    ) => DbList<DbStatusMessage, 'uid'>;

    /**
     * Return the message count of a conversation
     */
    readonly getConversationMessageCount: (conversationUid: DbConversationUid) => u53;

    /**
     * Return the status message count of a conversation
     */
    readonly getConversationStatusMessageCount: (conversationUid: DbConversationUid) => u53;

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

export interface NonceDatabaseBackend {
    /**
     * Create a nonce in a specific nonce scope.
     *
     * @throws Error if the nonce already exists.
     */
    readonly addNonce: (scope: NonceScope, value: NonceHash) => DbCreated<DbNonce>;

    /**
     * Add multiple nonces to the database
     */
    readonly addNonces: (scope: NonceScope, nonces: NonceHash[]) => void;

    /**
     * Get the UID for a nonce if it exist. If the property does not exist in the underlying
     * storage, 'undefined' will be returned.
     */
    readonly hasNonce: (scope: NonceScope, value: NonceHash) => DbHas<DbNonce>;

    /**
     * Get all nonces for a specific scope.
     */
    readonly getAllNonces: (scope: NonceScope) => NonceHash[];
}
