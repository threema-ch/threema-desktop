import type {
    SqliteDateTimeFormat,
    SqliteDateTimeFormatType,
} from 'ts-sql-query/connections/SqliteConfiguration';
import {SqliteConnection} from 'ts-sql-query/connections/SqliteConnection';
import type {QueryRunner} from 'ts-sql-query/queryRunners/QueryRunner';
import type {SqliteSqlBuilder} from 'ts-sql-query/sqlBuilders/SqliteSqlBuilder';

import {isNonceHash, isPublicKey, isReadonlyRawKey} from '~/common/crypto';
import {GROUP_CALL_KEY_LENGTH, wrapRawGroupCallKey} from '~/common/crypto/group-call';
import {
    DATABASE_KEY_LENGTH,
    type DbMessageReactionUid,
    type DbContactUid,
    type DbConversationUid,
    type DbDistributionListUid,
    type DbFileDataUid,
    type DbGlobalPropertyUid,
    type DbGroupMemberUid,
    type DbGroupUid,
    type DbMessageUid,
    type DbNonceUid,
    type DbMessageHistoryUid,
    type DbStatusMessageUid,
    type DbRunningGroupCallUid,
    type DbPersistentProtocolStateUid,
} from '~/common/db';
import {
    AcquaintanceLevelUtils,
    ActivityStateUtils,
    BlobDownloadStateUtils,
    ContactNotificationTriggerPolicyUtils,
    ConversationCategoryUtils,
    ConversationVisibilityUtils,
    GlobalPropertyKeyUtils,
    GroupNotificationTriggerPolicyUtils,
    GroupUserStateUtils,
    IdentityTypeUtils,
    ImageRenderingTypeUtils,
    MessageReactionUtils,
    MessageTypeUtils,
    NonceScopeUtils,
    NotificationSoundPolicyUtils,
    PersistentProtocolStateTypeUtils,
    ReadReceiptPolicyUtils,
    StatusMessageTypeUtils,
    SyncStateUtils,
    TypingIndicatorPolicyUtils,
    VerificationLevelUtils,
    WorkVerificationLevelUtils,
} from '~/common/enum';
import {TypeTransformError} from '~/common/error';
import {isFileId, wrapFileEncryptionKey} from '~/common/file-storage';
import type {Logger} from '~/common/logging';
import {isBlobId} from '~/common/network/protocol/blob';
import {
    ensureDistributionListId,
    ensureGroupId,
    ensureMessageId,
    isFeatureMask,
    isIdentityString,
    isNickname,
} from '~/common/network/types';
import {wrapRawBlobKey} from '~/common/network/types/keys';
import {isF64, isU8, type u8, type u53, tag} from '~/common/types';
import {exhausted, unreachable} from '~/common/utils/assert';
import {byteView} from '~/common/utils/byte';

import {sync} from './sync';

/**
 * Collection of custom database types.
 */
export const CUSTOM_TYPES = {
    // (Alphabetically sorted in each group)

    // UIDs (tagging)
    CONTACT_UID: 'DbContactUid',
    CONVERSATION_UID: 'DbConversationUid',
    DISTRIBUTION_LIST_UID: 'DbDistributionListUid',
    GROUP_UID: 'DbGroupUid',
    MESSAGE_REACTION_UID: 'DbMessageReactionUid',
    MESSAGE_UID: 'DbMessageUid',
    MESSAGE_HISTORY_UID: 'DbMessageHistoryUid',
    STATUS_MESSAGE_UID: 'DbStatusMessageUid',
    PERSISTENT_PROTOCOL_STATE_UID: 'DbPersistentProtocolStateUid',
    GROUP_MEMBER_UID: 'DbGroupMemberUid',
    FILE_DATA_UID: 'DbFileDataUid',
    GLOBAL_PROPERTY_UID: 'DbGlobalPropertyUid',
    NONCE_UID: 'DbNonceUid',
    RUNNING_GROUP_CALL_UID: 'DbRunningGroupCallUid',

    // Enums (value constraints)
    ACQUAINTANCE_LEVEL: 'AcquaintanceLevel',
    ACTIVITY_STATE: 'ActivityState',
    BLOB_DOWNLOAD_STATE: 'BlobDownloadState',
    CONTACT_NOTIFICATION_TRIGGER_POLICY: 'ContactNotificationTriggerPolicy',
    CONVERSATION_CATEGORY: 'ConversationCategory',
    CONVERSATION_VISIBILITY: 'ConversationVisibility',
    GLOBAL_PROPERTY_KEY: 'GlobalPropertyKey',
    GROUP_NOTIFICATION_TRIGGER_POLICY: 'GroupNotificationTriggerPolicy',
    GROUP_USER_STATE: 'GroupUserState',
    IDENTITY_TYPE: 'IdentityType',
    IMAGE_RENDERING_TYPE: 'ImageRenderingType',
    MESSAGE_REACTION: 'MessageReaction',
    MESSAGE_TYPE: 'MessageType',
    NOTIFICATION_SOUND_POLICY: 'NotificationSoundPolicy',
    READ_RECEIPT_POLICY: 'ReadReceiptPolicy',
    STATUS_MESSAGE_TYPE: 'StatusMessageType',
    PERSISTENT_PROTOCOL_STATE_TYPE: 'PersistentProtocolStateType',

    SYNC_STATE: 'SyncState',
    TYPING_INDICATOR_POLICY: 'TypingIndicatorPolicy',
    VERIFICATION_LEVEL: 'VerificationLevel',
    WORK_VERIFICATION_LEVEL: 'WorkVerificationLevel',
    NONCE_SCOPE: 'NonceScope',

    // New-types (value constraints and tagging)
    BLOB_ID: 'BlobId',
    FILE_ID: 'FileId',
    FEATURE_MASK: 'FeatureMask',
    IDENTITY: 'IdentityString',
    PUBLIC_KEY: 'PublicKey',
    NICKNAME: 'Nickname',
    NONCE_HASH: 'NonceHash',

    // Mapped types (value constraints, mapping and optional tagging)
    BLOB_KEY: 'RawBlobKey',
    FILE_ENCRYPTION_KEY: 'FileEncryptionKey',
    MESSAGE_ID: 'MessageId',
    GROUP_ID: 'GroupId',
    DISTRIBUTION_LIST_ID: 'DistributionListId',
    GROUP_CALL_KEY: 'GroupCallKey',

    // Other
    UINT8ARRAY: 'Uint8Array',
    U8: 'u8',
    U53: 'u53',
    F64: 'f64',
    BOOLEAN: 'boolean',
} as const;
type CustomType = (typeof CUSTOM_TYPES)[keyof typeof CUSTOM_TYPES];

/**
 * SQLite database connection with support for all our custom types.
 */
export class DBConnection extends SqliteConnection<'DBConnection'> {
    public constructor(
        private readonly _log: Logger,
        queryRunner: QueryRunner,
        sqlBuilder?: SqliteSqlBuilder,
    ) {
        super(queryRunner, sqlBuilder);
        this.allowEmptyString = true;
    }

    /**
     * Control how dates and times are stored in SQLite.
     */
    public override getDateTimeFormat(type: SqliteDateTimeFormatType): SqliteDateTimeFormat {
        switch (type) {
            case 'date':
                // Note: Probably not used, we always use timestamps (datetimes).
                this._log.warn('Unexpected date value');
                return 'localdate as text';
            case 'time':
                // Note: Probably not used, we always use timestamps (datetimes).
                this._log.warn('Unexpected time value');
                return 'UTC as text using Z timezone';
            case 'dateTime':
                return 'Unix time milliseconds as integer';
            default:
                return unreachable(type, 'Invalid date time format type');
        }
    }

    /**
     * Transform a raw value as returned by the database driver to a rich type
     * as specified by the {@link type} parameter.
     *
     * For simple newtypes, this might mean that the raw values will be
     * validated and returned. For more complex types (for example RGB colors,
     * which are stored as 3-byte blobs) destructuring and/or conversion may
     * take place as well.
     *
     * @param value The raw value as returned by the database driver.
     * @param type The type tag. This will be one of the {@link CUSTOM_TYPES}
     *   variants.
     * @returns The converted and validated value.
     * @throws {TypeTransformError} If conversion fails.
     */
    // eslint-disable-next-line @typescript-eslint/naming-convention
    public override transformValueFromDB(value: unknown, type: string): unknown {
        if (value === null || value === undefined) {
            return super.transformValueFromDB(value, type);
        }

        // Helper closure
        function fail(): never {
            throw TypeTransformError.forValue('decode', value, type);
        }

        /**
         * Helper to convert from u64 to u53
         */
        function u64ToU53<T extends u53>(
            value_: unknown,
            isValidT: (number: u53) => number is T,
        ): T {
            if (typeof value !== 'bigint') {
                fail();
            }

            // Note: This conversion is technically not safe but we stored the value from a u53 at
            // some point, so we can expect it to be a u53.
            const number = Number(value);
            if (!isValidT(number)) {
                fail();
            }
            return number;
        }

        /**
         * Helper to convert from u64 to u8
         */
        function u64ToU8<T extends u8>(value_: unknown, isValidT: (number: u8) => number is T): T {
            if (typeof value !== 'bigint') {
                fail();
            }

            // Note: This conversion is technically not safe but we stored the value from a u8 at
            // some point, so we can expect it to be a u8.
            const number = Number(value);
            if (!isValidT(number)) {
                fail();
            }
            return number;
        }

        /**
         * A no-op type guard for u53 values. Used in combination with {@link u64ToU53}.
         */
        function isPlainU53(number: u53): number is u53 {
            return true;
        }

        // Exhaustively match all custom types and fall back to the built-in
        // type handling.
        //
        // Note: We're **not** trusting values coming from the database to fit
        //       out constrained new-types, so validation is necessary.
        //
        // IMPORTANT: Since we're dealing with `value` being of `unknown` type
        //            here, double check that your match arm is correct!
        const maybeCustomType = type as CustomType;
        switch (maybeCustomType) {
            // UIDs (tagging)
            case CUSTOM_TYPES.CONTACT_UID:
                return typeof value === 'bigint' ? tag<DbContactUid>(value) : fail();
            case CUSTOM_TYPES.CONVERSATION_UID:
                return typeof value === 'bigint' ? tag<DbConversationUid>(value) : fail();
            case CUSTOM_TYPES.DISTRIBUTION_LIST_UID:
                return typeof value === 'bigint' ? tag<DbDistributionListUid>(value) : fail();
            case CUSTOM_TYPES.GROUP_UID:
                return typeof value === 'bigint' ? tag<DbGroupUid>(value) : fail();
            case CUSTOM_TYPES.GROUP_MEMBER_UID:
                return typeof value === 'bigint' ? tag<DbGroupMemberUid>(value) : fail();
            case CUSTOM_TYPES.FILE_DATA_UID:
                return typeof value === 'bigint' ? tag<DbFileDataUid>(value) : fail();
            case CUSTOM_TYPES.MESSAGE_REACTION_UID:
                return typeof value === 'bigint' ? tag<DbMessageReactionUid>(value) : fail();
            case CUSTOM_TYPES.MESSAGE_UID:
                return typeof value === 'bigint' ? tag<DbMessageUid>(value) : fail();
            case CUSTOM_TYPES.STATUS_MESSAGE_UID:
                return typeof value === 'bigint' ? tag<DbStatusMessageUid>(value) : fail();
            case CUSTOM_TYPES.PERSISTENT_PROTOCOL_STATE_UID:
                return typeof value === 'bigint'
                    ? tag<DbPersistentProtocolStateUid>(value)
                    : fail();
            case CUSTOM_TYPES.GLOBAL_PROPERTY_UID:
                return typeof value === 'bigint' ? tag<DbGlobalPropertyUid>(value) : fail();
            case CUSTOM_TYPES.NONCE_UID:
                return typeof value === 'bigint' ? tag<DbNonceUid>(value) : fail();
            case CUSTOM_TYPES.MESSAGE_HISTORY_UID:
                return typeof value === 'bigint' ? tag<DbMessageHistoryUid>(value) : fail();
            case CUSTOM_TYPES.RUNNING_GROUP_CALL_UID:
                return typeof value === 'bigint' ? tag<DbRunningGroupCallUid>(value) : fail();

            // Enums (value constraints)
            case CUSTOM_TYPES.ACQUAINTANCE_LEVEL:
                return u64ToU53(value, AcquaintanceLevelUtils.contains);
            case CUSTOM_TYPES.ACTIVITY_STATE:
                return u64ToU53(value, ActivityStateUtils.contains);
            case CUSTOM_TYPES.BLOB_DOWNLOAD_STATE:
                return u64ToU53(value, BlobDownloadStateUtils.contains);
            case CUSTOM_TYPES.CONTACT_NOTIFICATION_TRIGGER_POLICY:
                return u64ToU53(value, ContactNotificationTriggerPolicyUtils.contains);
            case CUSTOM_TYPES.CONVERSATION_CATEGORY:
                return u64ToU53(value, ConversationCategoryUtils.contains);
            case CUSTOM_TYPES.CONVERSATION_VISIBILITY:
                return u64ToU53(value, ConversationVisibilityUtils.contains);
            case CUSTOM_TYPES.GLOBAL_PROPERTY_KEY:
                return GlobalPropertyKeyUtils.fromString;
            case CUSTOM_TYPES.GROUP_NOTIFICATION_TRIGGER_POLICY:
                return u64ToU53(value, GroupNotificationTriggerPolicyUtils.contains);
            case CUSTOM_TYPES.IDENTITY_TYPE:
                return u64ToU53(value, IdentityTypeUtils.contains);
            case CUSTOM_TYPES.IMAGE_RENDERING_TYPE:
                return u64ToU53(value, ImageRenderingTypeUtils.contains);
            case CUSTOM_TYPES.MESSAGE_TYPE:
                return MessageTypeUtils.contains(value) ? value : fail();
            case CUSTOM_TYPES.MESSAGE_REACTION:
                // Note: When queried directly, a bigint is returned, but in an aggregation,
                // ts-sql-query returns a number. For now, support both variants.
                if (typeof value === 'bigint') {
                    return u64ToU53(value, MessageReactionUtils.contains);
                }
                return MessageReactionUtils.contains(value) ? value : fail();

            case CUSTOM_TYPES.GROUP_USER_STATE:
                return u64ToU53(value, GroupUserStateUtils.contains);
            case CUSTOM_TYPES.NOTIFICATION_SOUND_POLICY:
                return u64ToU53(value, NotificationSoundPolicyUtils.contains);
            case CUSTOM_TYPES.READ_RECEIPT_POLICY:
                return u64ToU53(value, ReadReceiptPolicyUtils.contains);
            case CUSTOM_TYPES.STATUS_MESSAGE_TYPE:
                return typeof value === 'string'
                    ? StatusMessageTypeUtils.fromString(value)
                    : fail();
            case CUSTOM_TYPES.PERSISTENT_PROTOCOL_STATE_TYPE:
                return u64ToU53(value, PersistentProtocolStateTypeUtils.contains);
            case CUSTOM_TYPES.SYNC_STATE:
                return u64ToU53(value, SyncStateUtils.contains);
            case CUSTOM_TYPES.TYPING_INDICATOR_POLICY:
                return u64ToU53(value, TypingIndicatorPolicyUtils.contains);
            case CUSTOM_TYPES.VERIFICATION_LEVEL:
                return u64ToU53(value, VerificationLevelUtils.contains);
            case CUSTOM_TYPES.WORK_VERIFICATION_LEVEL:
                return u64ToU53(value, WorkVerificationLevelUtils.contains);
            case CUSTOM_TYPES.NONCE_SCOPE:
                return u64ToU53(value, NonceScopeUtils.contains);

            // New-types (value constraints and tagging)
            case CUSTOM_TYPES.BLOB_ID:
                return isBlobId(value) ? value : fail();
            case CUSTOM_TYPES.FILE_ID:
                return isFileId(value) ? value : fail();
            case CUSTOM_TYPES.FEATURE_MASK:
                return isFeatureMask(value) ? value : fail();
            case CUSTOM_TYPES.IDENTITY:
                return isIdentityString(value) ? value : fail();
            case CUSTOM_TYPES.PUBLIC_KEY:
                return isPublicKey(value) ? value : fail();
            case CUSTOM_TYPES.NICKNAME:
                return isNickname(value) ? value : undefined;
            case CUSTOM_TYPES.NONCE_HASH:
                return isNonceHash(value) ? value : fail();

            // Mapped types (value constraints, mapping and optional tagging)
            case CUSTOM_TYPES.BLOB_KEY:
                return value instanceof Uint8Array ? wrapRawBlobKey(value) : fail();
            case CUSTOM_TYPES.FILE_ENCRYPTION_KEY:
                return value instanceof Uint8Array ? wrapFileEncryptionKey(value) : fail();
            case CUSTOM_TYPES.MESSAGE_ID:
                return value instanceof Uint8Array && value.byteLength === 8
                    ? ensureMessageId(byteView(DataView, value).getBigUint64(0, true))
                    : fail();
            case CUSTOM_TYPES.GROUP_ID:
                return value instanceof Uint8Array && value.byteLength === 8
                    ? ensureGroupId(byteView(DataView, value).getBigUint64(0, true))
                    : fail();
            case CUSTOM_TYPES.DISTRIBUTION_LIST_ID:
                return value instanceof Uint8Array && value.byteLength === 8
                    ? ensureDistributionListId(byteView(DataView, value).getBigUint64(0, true))
                    : fail();
            case CUSTOM_TYPES.GROUP_CALL_KEY:
                return value instanceof Uint8Array ? wrapRawGroupCallKey(value) : fail();

            // Other
            case CUSTOM_TYPES.UINT8ARRAY:
                return value instanceof Uint8Array ? value : fail();
            case CUSTOM_TYPES.U8:
                return u64ToU8(value, isU8);
            case CUSTOM_TYPES.U53:
                return u64ToU53(value, isPlainU53);
            case CUSTOM_TYPES.F64:
                return isF64(value) ? value : fail();
            case CUSTOM_TYPES.BOOLEAN:
                return typeof value === 'bigint' && [0n, 1n].includes(value)
                    ? value === 1n
                    : fail();

            default:
                // Fallback to built-in type handling
                return exhausted(maybeCustomType, super.transformValueFromDB(value, type));
        }
    }

    /**
     * Transform a value to its database representation as specified by the
     * {@link type} argument.
     *
     * For simple newtypes, this might mean that the raw values will be
     * validated and returned. For more complex types (for example RGB colors,
     * which are stored as 3-byte blobs) custom serialization may take place as
     * well.
     *
     * @param value The value that should be stored in the database.
     * @param type The type tag. This will be one of the {@link CUSTOM_TYPES}
     *   variants.
     * @returns The value in its database representation.
     * @throws {TypeTransformError} If conversion fails.
     */
    // eslint-disable-next-line @typescript-eslint/naming-convention
    public override transformValueToDB(value: unknown, type: string): unknown {
        if (value === null || value === undefined) {
            return super.transformValueToDB(value, type);
        }

        // Helper closure
        function fail(): never {
            throw TypeTransformError.forValue('encode', value, type);
        }

        // Exhaustively match all custom types and fall back to the built-in
        // type handling.
        //
        // Note: We're trusting our own type system, so constrained new-types
        //       will not be revalidated.
        //
        // IMPORTANT: Since we're dealing with `value` being of `unknown` type
        //            here, double check that your match arm is correct!

        const maybeCustomType = type as CustomType;
        switch (maybeCustomType) {
            // UIDs (tagging)
            case CUSTOM_TYPES.CONTACT_UID:
            case CUSTOM_TYPES.CONVERSATION_UID:
            case CUSTOM_TYPES.DISTRIBUTION_LIST_UID:
            case CUSTOM_TYPES.GROUP_UID:
            case CUSTOM_TYPES.GROUP_MEMBER_UID:
            case CUSTOM_TYPES.FILE_DATA_UID:
            case CUSTOM_TYPES.MESSAGE_REACTION_UID:
            case CUSTOM_TYPES.MESSAGE_UID:
            case CUSTOM_TYPES.STATUS_MESSAGE_UID:
            case CUSTOM_TYPES.PERSISTENT_PROTOCOL_STATE_UID:
            case CUSTOM_TYPES.GLOBAL_PROPERTY_UID:
            case CUSTOM_TYPES.NONCE_UID:
            case CUSTOM_TYPES.MESSAGE_HISTORY_UID:
            case CUSTOM_TYPES.RUNNING_GROUP_CALL_UID:
                // No transformation
                return value;

            // Enums (value constraints)
            case CUSTOM_TYPES.ACQUAINTANCE_LEVEL:
            case CUSTOM_TYPES.ACTIVITY_STATE:
            case CUSTOM_TYPES.BLOB_DOWNLOAD_STATE:
            case CUSTOM_TYPES.CONTACT_NOTIFICATION_TRIGGER_POLICY:
            case CUSTOM_TYPES.CONVERSATION_CATEGORY:
            case CUSTOM_TYPES.CONVERSATION_VISIBILITY:
            case CUSTOM_TYPES.GLOBAL_PROPERTY_KEY:
            case CUSTOM_TYPES.GROUP_NOTIFICATION_TRIGGER_POLICY:
            case CUSTOM_TYPES.GROUP_USER_STATE:
            case CUSTOM_TYPES.IDENTITY_TYPE:
            case CUSTOM_TYPES.IMAGE_RENDERING_TYPE:
            case CUSTOM_TYPES.MESSAGE_TYPE:
            case CUSTOM_TYPES.MESSAGE_REACTION:
            case CUSTOM_TYPES.NOTIFICATION_SOUND_POLICY:
            case CUSTOM_TYPES.READ_RECEIPT_POLICY:
            case CUSTOM_TYPES.STATUS_MESSAGE_TYPE:
            case CUSTOM_TYPES.PERSISTENT_PROTOCOL_STATE_TYPE:
            case CUSTOM_TYPES.SYNC_STATE:
            case CUSTOM_TYPES.TYPING_INDICATOR_POLICY:
            case CUSTOM_TYPES.VERIFICATION_LEVEL:
            case CUSTOM_TYPES.WORK_VERIFICATION_LEVEL:
            case CUSTOM_TYPES.NONCE_SCOPE:
                // No transformation
                return value;

            // New-types (value constraints and tagging)
            case CUSTOM_TYPES.BLOB_ID:
            case CUSTOM_TYPES.FILE_ID:
            case CUSTOM_TYPES.FEATURE_MASK:
            case CUSTOM_TYPES.IDENTITY:
            case CUSTOM_TYPES.NICKNAME:
            case CUSTOM_TYPES.PUBLIC_KEY:
            case CUSTOM_TYPES.NONCE_HASH:
                // No transformation
                return value;

            // Mapped types (value constraints, mapping and optional tagging)
            case CUSTOM_TYPES.BLOB_KEY:
            case CUSTOM_TYPES.FILE_ENCRYPTION_KEY:
                return isReadonlyRawKey(value, DATABASE_KEY_LENGTH) ? value.unwrap() : fail();
            case CUSTOM_TYPES.MESSAGE_ID:
            case CUSTOM_TYPES.GROUP_ID:
            case CUSTOM_TYPES.DISTRIBUTION_LIST_ID:
                if (typeof value === 'bigint') {
                    const array = new Uint8Array(8);
                    byteView(DataView, array).setBigUint64(0, value, true);
                    return array;
                }
                return fail();
            case CUSTOM_TYPES.GROUP_CALL_KEY:
                return isReadonlyRawKey(value, GROUP_CALL_KEY_LENGTH) ? value.unwrap() : fail();
            // Other
            case CUSTOM_TYPES.UINT8ARRAY:
                // No transformation
                return value;
            case CUSTOM_TYPES.U8:
            case CUSTOM_TYPES.U53:
            case CUSTOM_TYPES.F64:
                // No transformation
                return value;
            case CUSTOM_TYPES.BOOLEAN:
                return (value as boolean) ? 1 : 0;

            default:
                // Fallback to built-in type handling
                return exhausted(maybeCustomType, super.transformValueToDB(value, type));
        }
    }

    /**
     * Custom transaction wrapper that can deal with sync promises.
     */
    public syncTransaction<T>(executor: () => T, log: Logger): T {
        sync(this.beginTransaction());
        let needRollback = true;
        try {
            const result = executor();
            needRollback = false;
            return result;
        } finally {
            if (needRollback) {
                // This only happens if an exception occurred
                try {
                    sync(this.rollback());
                } catch (error) {
                    log.error(`Automatic rollback of transaction failed:`, error);
                    // Do not re-throw, to avoid masking the exception returned
                    // by the executor.
                }
            } else {
                sync(this.commit());
            }
        }
    }
}
