/** Table declarations. */
import {Table} from 'ts-sql-query/Table';

import {type NonceHash, type PublicKey} from '~/common/crypto';
import {
    type DbContactUid,
    type DbConversationUid,
    type DbDistributionListUid,
    type DbFileDataUid,
    type DbGlobalPropertyUid,
    type DbGroupMemberUid,
    type DbGroupUid,
    type DbMessageUid,
    type DbNonceUid,
} from '~/common/db';
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
    type MessageReaction,
    type MessageType,
    type NonceScope,
    type NotificationSoundPolicy,
    type ReadReceiptPolicy,
    type SyncState,
    type TypingIndicatorPolicy,
    type VerificationLevel,
    type WorkVerificationLevel,
} from '~/common/enum';
import {type FileEncryptionKey, type FileId} from '~/common/file-storage';
import {type BlobId} from '~/common/network/protocol/blob';
import {
    type DistributionListId,
    type FeatureMask,
    type GroupId,
    type IdentityString,
    type MessageId,
    type Nickname,
} from '~/common/network/types';
import {type RawBlobKey} from '~/common/network/types/keys';
import {CUSTOM_TYPES, type DBConnection} from '~/common/node/db/connection';
import {type f64, type ReadonlyUint8Array, type u8, type u53} from '~/common/types';

/**
 * A contact.
 *
 * Constraints:
 *
 * - The identity must be unique
 * - The publicKey must be unique
 */
export const tContact = new (class TContact extends Table<DBConnection, 'TContact'> {
    public uid = this.autogeneratedPrimaryKey<DbContactUid>(
        'uid',
        'custom',
        CUSTOM_TYPES.CONTACT_UID,
    );

    /**
     * The 8-character Threema ID of the contact.
     */
    public identity = this.column<IdentityString>('identity', 'custom', CUSTOM_TYPES.IDENTITY);

    /**
     * Public key bytes.
     */
    public publicKey = this.column<PublicKey>('publicKey', 'custom', CUSTOM_TYPES.PUBLIC_KEY);

    /**
     * Timestamp when this contact was first stored.
     */
    public createdAt = this.column('createdAt', 'localDateTime');

    /**
     * First name of the contact.
     */
    public firstName = this.column('firstName', 'string');

    /**
     * Last name of the contact.
     */
    public lastName = this.column('lastName', 'string');

    /**
     * Nickname of the contact (excluding the `~`).
     */
    public nickname = this.optionalColumn<Nickname>('nickname', 'custom', CUSTOM_TYPES.NICKNAME);

    /**
     * Verification level of the contact.
     */
    public verificationLevel = this.column<VerificationLevel>(
        'verificationLevel',
        'custom',
        CUSTOM_TYPES.VERIFICATION_LEVEL,
    );

    /**
     * Work verification level of the contact.
     */
    public workVerificationLevel = this.column<WorkVerificationLevel>(
        'workVerificationLevel',
        'custom',
        CUSTOM_TYPES.WORK_VERIFICATION_LEVEL,
    );

    /**
     * Identity type of the contact.
     */
    public identityType = this.column<IdentityType>(
        'identityType',
        'custom',
        CUSTOM_TYPES.IDENTITY_TYPE,
    );

    /**
     * Acquaintance level of the contact.
     */
    public acquaintanceLevel = this.column<AcquaintanceLevel>(
        'acquaintanceLevel',
        'custom',
        CUSTOM_TYPES.ACQUAINTANCE_LEVEL,
    );

    /**
     * Activity state of the contact.
     */
    public activityState = this.column<ActivityState>(
        'activityState',
        'custom',
        CUSTOM_TYPES.ACTIVITY_STATE,
    );

    /**
     * Features supported by this contact.
     */
    public featureMask = this.column<FeatureMask>(
        'featureMask',
        'custom',
        CUSTOM_TYPES.FEATURE_MASK,
    );

    /**
     * Contact synchronization state.
     */
    public syncState = this.column<SyncState>('syncState', 'custom', CUSTOM_TYPES.SYNC_STATE);

    /**
     * Typing indicator policy override for the contact.
     */
    public typingIndicatorPolicyOverride = this.optionalColumn<TypingIndicatorPolicy>(
        'typingIndicatorPolicyOverride',
        'custom',
        CUSTOM_TYPES.TYPING_INDICATOR_POLICY,
    );

    /**
     * Read receipt policy override for the contact.
     */
    public readReceiptPolicyOverride = this.optionalColumn<ReadReceiptPolicy>(
        'readReceiptPolicyOverride',
        'custom',
        CUSTOM_TYPES.READ_RECEIPT_POLICY,
    );

    /**
     * Notification trigger policy override for the contact.
     */
    public notificationTriggerPolicyOverride =
        this.optionalColumn<ContactNotificationTriggerPolicy>(
            'notificationTriggerPolicyOverride',
            'custom',
            CUSTOM_TYPES.CONTACT_NOTIFICATION_TRIGGER_POLICY,
        );

    /**
     * Notification trigger policy override expiration date for the contact.
     */
    public notificationTriggerPolicyOverrideExpiresAt = this.optionalColumn(
        'notificationTriggerPolicyOverrideExpiresAt',
        'localDateTime',
    );

    /**
     * Notification sound policy override for the contact.
     */
    public notificationSoundPolicyOverride = this.optionalColumn<NotificationSoundPolicy>(
        'notificationSoundPolicyOverride',
        'custom',
        CUSTOM_TYPES.NOTIFICATION_SOUND_POLICY,
    );

    /**
     * The color lookup index.
     */
    public colorIndex = this.column<u8>('colorIndex', 'custom', CUSTOM_TYPES.U8);

    /**
     * Profile picture set by the contact.
     */
    public profilePictureContactDefined = this.optionalColumn<ReadonlyUint8Array>(
        'profilePictureContactDefined',
        'custom',
        CUSTOM_TYPES.UINT8ARRAY,
    );

    /**
     * Profile picture set by the creator in the Threema Gateway control
     * panel. Only applicable to Threema Gateway IDs (starting with a `*`).
     */
    public profilePictureGatewayDefined = this.optionalColumn<ReadonlyUint8Array>(
        'profilePictureGatewayDefined',
        'custom',
        CUSTOM_TYPES.UINT8ARRAY,
    );

    /**
     * Profile picture set by the user.
     */
    public profilePictureUserDefined = this.optionalColumn<ReadonlyUint8Array>(
        'profilePictureUserDefined',
        'custom',
        CUSTOM_TYPES.UINT8ARRAY,
    );

    /**
     * Blob ID of the last profile picture sent to this contact.
     */
    public profilePictureBlobIdSent = this.optionalColumn<BlobId>(
        'profilePictureBlobIdSent',
        'custom',
        CUSTOM_TYPES.BLOB_ID,
    );

    public constructor() {
        super('contacts'); // Table name in the database
    }
})();

/**
 * A group.
 *
 * Constraints:
 *
 * - The (creatorIdentity, groupId) pair must be unique
 */
export const tGroup = new (class TGroup extends Table<DBConnection, 'TGroup'> {
    public uid = this.autogeneratedPrimaryKey<DbGroupUid>('uid', 'custom', CUSTOM_TYPES.GROUP_UID);

    /**
     * Identity of the group creator.
     */
    public creatorIdentity = this.column<IdentityString>(
        'creatorIdentity',
        'custom',
        CUSTOM_TYPES.IDENTITY,
    );

    /**
     * Group ID, 8 bytes.
     */
    public groupId = this.column<GroupId>('groupId', 'custom', CUSTOM_TYPES.GROUP_ID);

    /**
     * Group name. May be an empty string.
     */
    public name = this.column('name', 'string');

    /**
     * Timestamp when this group was first stored.
     */
    public createdAt = this.column('createdAt', 'localDateTime');

    /**
     * The user's state within the group.
     */
    public userState = this.column<GroupUserState>(
        'userState',
        'custom',
        CUSTOM_TYPES.GROUP_USER_STATE,
    );

    /**
     * Notification trigger policy override for the group.
     */
    public notificationTriggerPolicyOverride = this.optionalColumn<GroupNotificationTriggerPolicy>(
        'notificationTriggerPolicyOverride',
        'custom',
        CUSTOM_TYPES.GROUP_NOTIFICATION_TRIGGER_POLICY,
    );

    /**
     * Notification trigger policy override expiration date for the group.
     */
    public notificationTriggerPolicyOverrideExpiresAt = this.optionalColumn(
        'notificationTriggerPolicyOverrideExpiresAt',
        'localDateTime',
    );

    /**
     * Notification sound policy override for the group.
     */
    public notificationSoundPolicyOverride = this.optionalColumn<NotificationSoundPolicy>(
        'notificationSoundPolicyOverride',
        'custom',
        CUSTOM_TYPES.NOTIFICATION_SOUND_POLICY,
    );

    /**
     * The color lookup index.
     */
    public colorIndex = this.column<u8>('colorIndex', 'custom', CUSTOM_TYPES.U8);

    /**
     * Profile picture set by the group admin.
     */
    public profilePictureAdminDefined = this.optionalColumn<ReadonlyUint8Array>(
        'profilePictureAdminDefined',
        'custom',
        CUSTOM_TYPES.UINT8ARRAY,
    );

    public constructor() {
        super('groups'); // Table name in the database
    }
})();

/**
 * A group membership.
 */
export const tGroupMember = new (class TGropupMembers extends Table<DBConnection, 'TGroupMember'> {
    public uid = this.autogeneratedPrimaryKey<DbGroupMemberUid>(
        'uid',
        'custom',
        CUSTOM_TYPES.GROUP_MEMBER_UID,
    );

    /**
     * Group UID, 8 bytes.
     */
    public groupUid = this.column<DbGroupUid>('groupUid', 'custom', CUSTOM_TYPES.GROUP_UID);

    /**
     * Contact UID, 8 bytes.
     */
    public contactUid = this.column<DbContactUid>('contactUid', 'custom', CUSTOM_TYPES.CONTACT_UID);

    public constructor() {
        super('groupMembers'); // Table name in the database
    }
})();

/**
 * A distribution list.
 */
export const tDistributionList = new (class TDistributionList extends Table<
    DBConnection,
    'TDistributionList'
> {
    public uid = this.primaryKey<DbDistributionListUid>(
        'uid',
        'custom',
        CUSTOM_TYPES.DISTRIBUTION_LIST_UID,
    );

    // TODO(DESK-334): Add distribution list ID

    /**
     * Distribution list ID, 8 bytes.
     */
    public distributionListId = this.column<DistributionListId>(
        'distributionListId',
        'custom',
        CUSTOM_TYPES.DISTRIBUTION_LIST_ID,
    );

    /**
     * Distribution list name. May be an empty string.
     */
    public name = this.column('name', 'string');

    /**
     * Timestamp when this distribution list was first stored.
     */
    public createdAt = this.column('createdAt', 'localDateTime');

    /**
     * The color lookup index.
     */
    public colorIndex = this.column<u8>('colorIndex', 'custom', CUSTOM_TYPES.U8);

    public constructor() {
        super('distributionLists'); // Table name in the database
    }
})();

/**
 * A conversation.
 *
 * Constraints:
 *
 * - Of the three fields (contactUid, groupUid, distributionListUid) exactly one must be set
 * - All three fields (contactUid, groupUid, distributionListUid) must be unique
 */
export const tConversation = new (class TConversation extends Table<DBConnection, 'TConversation'> {
    public uid = this.autogeneratedPrimaryKey<DbConversationUid>(
        'uid',
        'custom',
        CUSTOM_TYPES.CONVERSATION_UID,
    );

    /**
     * Timestamp of the last conversation update (e.g. due to an inbound or outbound message).
     * If not provided, the conversation should not be displayed.
     *
     * This timestamp should never go back in time. For example, if the last incoming message is
     * deleted, the `lastUpdate` timestamp of that message still remains stored.
     */
    public lastUpdate = this.optionalColumn('lastUpdate', 'localDateTime');

    /**
     * Contact associated with this conversation (if any).
     */
    public contactUid = this.optionalColumn<DbContactUid>(
        'contactUid',
        'custom',
        CUSTOM_TYPES.CONTACT_UID,
    );

    /**
     * Group associated with this conversation (if any).
     */
    public groupUid = this.optionalColumn<DbGroupUid>('groupUid', 'custom', CUSTOM_TYPES.GROUP_UID);

    /**
     * Distribution list associated with this conversation (if any).
     */
    public distributionListUid = this.optionalColumn<DbDistributionListUid>(
        'distributionListUid',
        'custom',
        CUSTOM_TYPES.DISTRIBUTION_LIST_UID,
    );

    /**
     * Category of the conversation.
     */
    public category = this.column<ConversationCategory>(
        'category',
        'custom',
        CUSTOM_TYPES.CONVERSATION_CATEGORY,
    );

    /**
     * Visibility of the conversation.
     */
    public visibility = this.column<ConversationVisibility>(
        'visibility',
        'custom',
        CUSTOM_TYPES.CONVERSATION_VISIBILITY,
    );

    public constructor() {
        super('conversations'); // Table name in the database
    }
})();

/**
 * A message in a conversation.
 *
 * Constraints:
 *
 * - Either none or both (lastReaction, lastReactionAt) fields must be set
 * - The contactUid may only be null for outgoing messages
 */
export const tMessage = new (class TMessage extends Table<DBConnection, 'TMessage'> {
    public uid = this.autogeneratedPrimaryKey<DbMessageUid>(
        'uid',
        'custom',
        CUSTOM_TYPES.MESSAGE_UID,
    );

    /**
     * The CSP message ID.
     *
     * Note: This is stored as a BLOB and not an INTEGER because SQLite only has signed integers. If
     *       we wanted to store unsigned 64bit integers in an INTEGER field, we'd have to convert
     *       them to signed integers (Java style), which is really ugly. Instead, we store the raw
     *       bytes (in little-endian order).
     */
    public messageId = this.column<MessageId>('messageId', 'custom', CUSTOM_TYPES.MESSAGE_ID);

    /**
     * The contact that sent this message.
     *
     * Note: If provided, this is an inbound message. If not provided, this is
     *       an outbound message.
     */
    public senderContactUid = this.optionalColumn<DbContactUid>(
        'senderContactUid',
        'custom',
        CUSTOM_TYPES.CONTACT_UID,
    );

    /**
     * The conversation associated with this message.
     */
    public conversationUid = this.column<DbConversationUid>(
        'conversationUid',
        'custom',
        CUSTOM_TYPES.CONVERSATION_UID,
    );

    /**
     * Timestamp for when the message...
     *
     * - Outbound: ...has been created on the local device.
     * - Inbound: ...has been created on the remote device.
     *
     * Note: For inbound messages, this timestamp may have an arbitrary value as it's controlled by
     *       the sender.
     */
    public createdAt = this.column('createdAt', 'localDateTime');

    /**
     * Optional timestamp for when the message...
     *
     * - Outbound: ...has been delivered to and acknowledged by the chat server.
     * - Inbound: ...has been received from the chat server and reflected to the mediator server by
     *     the leader device.
     *
     * Note: The value is always known for inbound messages but not known until acknowledged for
     *       outbound messages.
     *
     * Note: In the models, this is split up into the virtual fields `sentAt` and `receivedAt`,
     *       depending on the message direction.
     */
    public processedAt = this.optionalColumn('processedAt', 'localDateTime');

    /**
     * Optional timestamp for when the outbound message has been delivered to the recipient and the
     * 'received' delivery receipt was reflected to the mediator server.
     *
     * Note: This value is never set for inbound messages.
     */
    public deliveredAt = this.optionalColumn('deliveredAt', 'localDateTime');

    /**
     * Optional timestamp for when...
     *
     * - Outbound: ...the 'read' delivery receipt message or the 'OutgoingMessageUpdate' with
     *     'update=read' has been reflected to the mediator server.
     * - Inbound: ...the 'read' delivery receipt message has been reflected to the mediator server
     *     by the leader device.
     */
    public readAt = this.optionalColumn('readAt', 'localDateTime');

    /**
     * Optional reaction to a message.
     */
    public lastReaction = this.optionalColumn<MessageReaction>(
        'lastReaction',
        'custom',
        CUSTOM_TYPES.MESSAGE_REACTION,
    );

    /**
     * Timestamp of the last reaction.
     */
    public lastReactionAt = this.optionalColumn('lastReactionAt', 'localDateTime');

    /**
     * Unparsed raw body. Only provided for inbound messages.
     */
    public raw = this.optionalColumn<ReadonlyUint8Array>('raw', 'custom', CUSTOM_TYPES.UINT8ARRAY);

    /**
     * Message type, e.g. "text" or "location".
     *
     * Note: Storing this as TEXT instead of an INTEGER because it makes joined queries much easier
     *       to read.
     */
    public messageType = this.column<MessageType>(
        'messageType',
        'custom',
        CUSTOM_TYPES.MESSAGE_TYPE,
    );

    /**
     * Incrementing thread ID used for sorting.
     */
    public threadId = this.column('threadId', 'bigint');

    public constructor() {
        super('messages'); // Table name in the database
    }
})();

/**
 * Message data associated with text messages.
 */
export const tMessageTextData = new (class TMessageTextData extends Table<
    DBConnection,
    'TMessageTextData'
> {
    public uid = this.autogeneratedPrimaryKey('uid', 'bigint');

    /**
     * The message UID.
     */
    public messageUid = this.column<DbMessageUid>('messageUid', 'custom', CUSTOM_TYPES.MESSAGE_UID);

    /**
     * The message text.
     */
    public text = this.column('text', 'string');

    /**
     * The optional quoted message id.
     */
    public quotedMessageId = this.optionalColumn<MessageId>(
        'quotedMessageId',
        'custom',
        CUSTOM_TYPES.MESSAGE_ID,
    );

    public constructor() {
        super('messageTextData'); // Table name in the database
    }
})();

/**
 * Message data associated with non-media file messages.
 */
export const tMessageFileData = new (class TMessageFileData extends Table<
    DBConnection,
    'TMessageFileData'
> {
    public uid = this.autogeneratedPrimaryKey('uid', 'bigint');
    /**
     * The message UID.
     */
    public messageUid = this.column<DbMessageUid>('messageUid', 'custom', CUSTOM_TYPES.MESSAGE_UID);
    /**
     * Original file Blob ID (used for downloading).
     */
    public blobId = this.optionalColumn<BlobId>('blobId', 'custom', CUSTOM_TYPES.BLOB_ID);
    /**
     * Original thumbnail Blob ID (used for downloading).
     */
    public thumbnailBlobId = this.optionalColumn<BlobId>(
        'thumbnailBlobId',
        'custom',
        CUSTOM_TYPES.BLOB_ID,
    );
    /**
     * The download state for the file blob.
     *
     * Right now, this can only be 'failed' or undefined.
     */
    public blobDownloadState = this.optionalColumn<BlobDownloadState>(
        'blobDownloadState',
        'custom',
        CUSTOM_TYPES.BLOB_DOWNLOAD_STATE,
    );
    /**
     * The download state for the thumbnail blob.
     *
     * Right now, this can only be 'failed' or undefined.
     */
    public thumbnailBlobDownloadState = this.optionalColumn<BlobDownloadState>(
        'thumbnailBlobDownloadState',
        'custom',
        CUSTOM_TYPES.BLOB_DOWNLOAD_STATE,
    );
    /**
     * Encryption key used to decrypt the file and thumbnail blobs.
     */
    public encryptionKey = this.column<RawBlobKey>(
        'encryptionKey',
        'custom',
        CUSTOM_TYPES.BLOB_KEY,
    );
    /**
     * File data UID.
     */
    public fileDataUid = this.optionalColumn<DbFileDataUid>(
        'fileDataUid',
        'custom',
        CUSTOM_TYPES.FILE_DATA_UID,
    );
    /**
     * Thumbnail file data UID.
     */
    public thumbnailFileDataUid = this.optionalColumn<DbFileDataUid>(
        'thumbnailFileDataUid',
        'custom',
        CUSTOM_TYPES.FILE_DATA_UID,
    );
    /**
     * File media type (formerly known as MIME type).
     */
    public mediaType = this.column('mediaType', 'string');
    /**
     * Thumbnail media type (formerly known as MIME type).
     */
    public thumbnailMediaType = this.optionalColumn('thumbnailMediaType', 'string');
    /**
     * The original file name.
     */
    public fileName = this.optionalColumn('fileName', 'string');
    /**
     * The original file size in bytes.
     */
    public fileSize = this.column<u53>('fileSize', 'custom', CUSTOM_TYPES.U53);
    /**
     * Optional caption text.
     */
    public caption = this.optionalColumn('caption', 'string');
    /**
     * Optional Correlation ID.
     */
    public correlationId = this.optionalColumn('correlationId', 'string');

    public constructor() {
        super('messageFileData'); // Table name in the database
    }
})();

/**
 * Message data associated with image messages.
 */
export const tMessageImageData = new (class TMessageImageData extends Table<
    DBConnection,
    'TMessageImageData'
> {
    public uid = this.autogeneratedPrimaryKey('uid', 'bigint');
    /**
     * The message UID.
     */
    public messageUid = this.column<DbMessageUid>('messageUid', 'custom', CUSTOM_TYPES.MESSAGE_UID);
    /**
     * Original file Blob ID (used for downloading).
     */
    public blobId = this.optionalColumn<BlobId>('blobId', 'custom', CUSTOM_TYPES.BLOB_ID);
    /**
     * Original thumbnail Blob ID (used for downloading).
     */
    public thumbnailBlobId = this.optionalColumn<BlobId>(
        'thumbnailBlobId',
        'custom',
        CUSTOM_TYPES.BLOB_ID,
    );
    /**
     * The download state for the file blob.
     *
     * Right now, this can only be 'failed' or undefined.
     */
    public blobDownloadState = this.optionalColumn<BlobDownloadState>(
        'blobDownloadState',
        'custom',
        CUSTOM_TYPES.BLOB_DOWNLOAD_STATE,
    );
    /**
     * The download state for the thumbnail blob.
     *
     * Right now, this can only be 'failed' or undefined.
     */
    public thumbnailBlobDownloadState = this.optionalColumn<BlobDownloadState>(
        'thumbnailBlobDownloadState',
        'custom',
        CUSTOM_TYPES.BLOB_DOWNLOAD_STATE,
    );
    /**
     * Encryption key used to decrypt the file and thumbnail blobs.
     */
    public encryptionKey = this.column<RawBlobKey>(
        'encryptionKey',
        'custom',
        CUSTOM_TYPES.BLOB_KEY,
    );
    /**
     * File data UID.
     */
    public fileDataUid = this.optionalColumn<DbFileDataUid>(
        'fileDataUid',
        'custom',
        CUSTOM_TYPES.FILE_DATA_UID,
    );
    /**
     * Thumbnail file data UID.
     */
    public thumbnailFileDataUid = this.optionalColumn<DbFileDataUid>(
        'thumbnailFileDataUid',
        'custom',
        CUSTOM_TYPES.FILE_DATA_UID,
    );
    /**
     * File media type (formerly known as MIME type).
     */
    public mediaType = this.column('mediaType', 'string');
    /**
     * Thumbnail media type (formerly known as MIME type).
     */
    public thumbnailMediaType = this.optionalColumn('thumbnailMediaType', 'string');
    /**
     * The original file name.
     */
    public fileName = this.optionalColumn('fileName', 'string');
    /**
     * The original file size in bytes.
     */
    public fileSize = this.column<u53>('fileSize', 'custom', CUSTOM_TYPES.U53);
    /**
     * Optional caption text.
     */
    public caption = this.optionalColumn('caption', 'string');
    /**
     * Optional Correlation ID.
     */
    public correlationId = this.optionalColumn('correlationId', 'string');
    /**
     * Rendering type.
     *
     * 1: Regular image, 2: Sticker
     */
    public renderingType = this.column<ImageRenderingType>(
        'renderingType',
        'custom',
        CUSTOM_TYPES.IMAGE_RENDERING_TYPE,
    );
    /**
     * Whether this is an animated image.
     */
    public animated = this.column<boolean>('animated', 'custom', CUSTOM_TYPES.BOOLEAN);
    /**
     * Optional image height (in px).
     */
    public height = this.optionalColumn<u53>('height', 'custom', CUSTOM_TYPES.U53);
    /**
     * Optional image width (in px).
     */
    public width = this.optionalColumn<u53>('width', 'custom', CUSTOM_TYPES.U53);

    public constructor() {
        super('messageImageData'); // Table name in the database
    }
})();

/**
 * Message data associated with video messages.
 */
export const tMessageVideoData = new (class TMessageVideoData extends Table<
    DBConnection,
    'TMessageVideoData'
> {
    public uid = this.autogeneratedPrimaryKey('uid', 'bigint');
    /**
     * The message UID.
     */
    public messageUid = this.column<DbMessageUid>('messageUid', 'custom', CUSTOM_TYPES.MESSAGE_UID);
    /**
     * Original file Blob ID (used for downloading).
     */
    public blobId = this.optionalColumn<BlobId>('blobId', 'custom', CUSTOM_TYPES.BLOB_ID);
    /**
     * Original thumbnail Blob ID (used for downloading).
     */
    public thumbnailBlobId = this.optionalColumn<BlobId>(
        'thumbnailBlobId',
        'custom',
        CUSTOM_TYPES.BLOB_ID,
    );
    /**
     * The download state for the file blob.
     *
     * Right now, this can only be 'failed' or undefined.
     */
    public blobDownloadState = this.optionalColumn<BlobDownloadState>(
        'blobDownloadState',
        'custom',
        CUSTOM_TYPES.BLOB_DOWNLOAD_STATE,
    );
    /**
     * The download state for the thumbnail blob.
     *
     * Right now, this can only be 'failed' or undefined.
     */
    public thumbnailBlobDownloadState = this.optionalColumn<BlobDownloadState>(
        'thumbnailBlobDownloadState',
        'custom',
        CUSTOM_TYPES.BLOB_DOWNLOAD_STATE,
    );
    /**
     * Encryption key used to decrypt the file and thumbnail blobs.
     */
    public encryptionKey = this.column<RawBlobKey>(
        'encryptionKey',
        'custom',
        CUSTOM_TYPES.BLOB_KEY,
    );
    /**
     * File data UID.
     */
    public fileDataUid = this.optionalColumn<DbFileDataUid>(
        'fileDataUid',
        'custom',
        CUSTOM_TYPES.FILE_DATA_UID,
    );
    /**
     * Thumbnail file data UID.
     */
    public thumbnailFileDataUid = this.optionalColumn<DbFileDataUid>(
        'thumbnailFileDataUid',
        'custom',
        CUSTOM_TYPES.FILE_DATA_UID,
    );
    /**
     * File media type (formerly known as MIME type).
     */
    public mediaType = this.column('mediaType', 'string');
    /**
     * Thumbnail media type (formerly known as MIME type).
     */
    public thumbnailMediaType = this.optionalColumn('thumbnailMediaType', 'string');
    /**
     * The original file name.
     */
    public fileName = this.optionalColumn('fileName', 'string');
    /**
     * The original file size in bytes.
     */
    public fileSize = this.column<u53>('fileSize', 'custom', CUSTOM_TYPES.U53);
    /**
     * Optional caption text.
     */
    public caption = this.optionalColumn('caption', 'string');
    /**
     * Optional Correlation ID.
     */
    public correlationId = this.optionalColumn('correlationId', 'string');
    /**
     * Optional image height (in px).
     */
    public height = this.optionalColumn<u53>('height', 'custom', CUSTOM_TYPES.U53);
    /**
     * Optional image width (in px).
     */
    public width = this.optionalColumn<u53>('width', 'custom', CUSTOM_TYPES.U53);
    /**
     * Optional duration (in seconds).
     */
    public duration = this.optionalColumn<f64>('durationSeconds', 'custom', CUSTOM_TYPES.F64);

    public constructor() {
        super('messageVideoData'); // Table name in the database
    }
})();

/**
 * Message data associated with audio messages.
 */
export const tMessageAudioData = new (class TMessageAudioData extends Table<
    DBConnection,
    'TMessageAudioData'
> {
    public uid = this.autogeneratedPrimaryKey('uid', 'bigint');
    /**
     * The message UID.
     */
    public messageUid = this.column<DbMessageUid>('messageUid', 'custom', CUSTOM_TYPES.MESSAGE_UID);
    /**
     * Original file Blob ID (used for downloading).
     */
    public blobId = this.optionalColumn<BlobId>('blobId', 'custom', CUSTOM_TYPES.BLOB_ID);
    /**
     * The download state for the file blob.
     *
     * Right now, this can only be 'failed' or undefined.
     */
    public blobDownloadState = this.optionalColumn<BlobDownloadState>(
        'blobDownloadState',
        'custom',
        CUSTOM_TYPES.BLOB_DOWNLOAD_STATE,
    );
    /**
     * Encryption key used to decrypt the file and thumbnail blobs.
     */
    public encryptionKey = this.column<RawBlobKey>(
        'encryptionKey',
        'custom',
        CUSTOM_TYPES.BLOB_KEY,
    );
    /**
     * File data UID.
     */
    public fileDataUid = this.optionalColumn<DbFileDataUid>(
        'fileDataUid',
        'custom',
        CUSTOM_TYPES.FILE_DATA_UID,
    );
    /**
     * File media type (formerly known as MIME type).
     */
    public mediaType = this.column('mediaType', 'string');
    /**
     * The original file name.
     */
    public fileName = this.optionalColumn('fileName', 'string');
    /**
     * The original file size in bytes.
     */
    public fileSize = this.column<u53>('fileSize', 'custom', CUSTOM_TYPES.U53);
    /**
     * Optional caption text.
     */
    public caption = this.optionalColumn('caption', 'string');
    /**
     * Optional Correlation ID.
     */
    public correlationId = this.optionalColumn('correlationId', 'string');
    /**
     * Optional duration (in seconds).
     */
    public duration = this.optionalColumn<f64>('durationSeconds', 'custom', CUSTOM_TYPES.F64);

    public constructor() {
        super('messageAudioData'); // Table name in the database
    }
})();

/**
 * Metadata about stored files.
 */
export const tFileData = new (class TFileData extends Table<DBConnection, 'TFileData'> {
    public uid = this.autogeneratedPrimaryKey<DbFileDataUid>(
        'uid',
        'custom',
        CUSTOM_TYPES.FILE_DATA_UID,
    );

    /**
     * File ID assigned by the file storage.
     */
    public fileId = this.column<FileId>('fileId', 'custom', CUSTOM_TYPES.FILE_ID);

    /**
     * File encryption key (must be different for every file).
     */
    public encryptionKey = this.column<FileEncryptionKey>(
        'encryptionKey',
        'custom',
        CUSTOM_TYPES.FILE_ENCRYPTION_KEY,
    );

    /**
     * Unencrypted file size in bytes.
     */
    public unencryptedByteCount = this.column<u53>(
        'unencryptedByteCount',
        'custom',
        CUSTOM_TYPES.U53,
    );

    /**
     * Storage format version.
     */
    public storageFormatVersion = this.column<u53>(
        'storageFormatVersion',
        'custom',
        CUSTOM_TYPES.U53,
    );

    public constructor() {
        super('fileData'); // Table name in the database
    }
})();

/**
 * Key-value-based settings storage.
 */
export const tSettings = new (class TSettings extends Table<DBConnection, 'TSettings'> {
    public uid = this.autogeneratedPrimaryKey('uid', 'bigint');

    /**
     * The settings category.
     */
    public category = this.column('category', 'string');

    /**
     * The bytes of the category settings encoded with protobuf.
     */
    public settingsBytes = this.column<Uint8Array>(
        'settingsBytes',
        'custom',
        CUSTOM_TYPES.UINT8ARRAY,
    );

    public constructor() {
        super('settings'); // Table name in the database
    }
})();

/**
 * Key-value-based global properties storage.
 */
export const tGlobalProperty = new (class TGlobalProperty extends Table<
    DBConnection,
    'TGlobalProperty'
> {
    public uid = this.autogeneratedPrimaryKey<DbGlobalPropertyUid>(
        'uid',
        'custom',
        CUSTOM_TYPES.GLOBAL_PROPERTY_UID,
    );

    /**
     * The property identifier key.
     */
    public key = this.column<GlobalPropertyKey>('key', 'custom', CUSTOM_TYPES.GLOBAL_PROPERTY_KEY);

    /**
     * The bytes of the key's value.
     */
    public value = this.column<Uint8Array>('value', 'custom', CUSTOM_TYPES.UINT8ARRAY);

    public constructor() {
        super('globalProperties'); // Table name in the database
    }
})();

/**
 * Nonces Database.
 */
export const tNonce = new (class TNonce extends Table<DBConnection, 'TNonce'> {
    public uid = this.autogeneratedPrimaryKey<DbNonceUid>('uid', 'custom', CUSTOM_TYPES.NONCE_UID);

    /**
     * The property identifier key.
     */
    public scope = this.column<NonceScope>('scope', 'custom', CUSTOM_TYPES.NONCE_SCOPE);

    /**
     * The bytes of the key's value.
     */
    public nonce = this.column<NonceHash>('nonce', 'custom', CUSTOM_TYPES.NONCE_HASH);

    public constructor() {
        super('nonces'); // Table name in the database
    }
})();
