/**
 * All enums to be used must be declared in this file. They are disallowed in
 * any other place via an eslint rule.
 *
 * Use `npm run safe-enums:generate` to generate safer enum variants from them.
 *
 * Then, import the safe enum variant from `common/enum/index.ts`.
 *
 * Details on why standard enums in TypeScript are not type safe enough:
 *
 * - https://stackoverflow.com/a/55459814
 * - https://github.com/microsoft/TypeScript/issues/32690
 */
export {};

/**
 * ENDPOINT
 * ========
 */

/**
 * Available transfer handler tags.
 */
export const enum TransferTag {
    // Builtin
    PROXY = 0,
    THROW = 1,

    // Object
    TRANSFER_PROPERTIES = 2,

    // Stores
    STORE = 3,
    MODEL_STORE = 4,
    SET_STORE = 5,

    // Errors
    BLOB_BACKEND_ERROR = 6,
    CACHE_STORAGE_RESOURCE_CACHE_ERROR = 7,
    CONNECTION_CLOSED_ERROR = 8,
    CRYPTO_ERROR = 9,
    DIRECTORY_ERROR = 10,
    ENCODING_ERROR = 11,
    FILE_STORAGE_ERROR = 12,
    KEY_STORAGE_ERROR = 13,
    INCOMING_REFLECTED_MESSAGE_TASK_ERROR = 14,
    MIGRATION_ERROR = 15,
    PROTOCOL_ERROR = 16,
    TYPE_TRANSFORM_ERROR = 17,
    COMPRESSION_ERROR = 18,
    SAFE_ERROR = 19,
    BACKEND_CREATION_ERROR = 20,
    TASK_ERROR = 21,
}

/**
 * PROTOCOL
 * ========
 */

/**
 * WebSocket close code, extended by the Mediator Protocol 4xxx custom close
 * codes.
 *
 * @generate name convert
 */
export enum CloseCode {
    /** Normal closure, e.g. when the user is explicitly disconnecting. */
    NORMAL = 1000,
    /** Server is shutting down or browser is navigating away. */
    SERVER_SHUTDOWN = 1001,
    /** Connection was closed without receiving a close frame. */
    ABNORMAL_CLOSURE = 1006,

    /** Chat server connection closed. */
    CSP_CLOSED = 4000,
    /** Chat server connection could not be established. */
    CSP_UNABLE_TO_ESTABLISH = 4001,
    /** Internal error related to chat server connection. */
    CSP_INTERNAL_ERROR = 4009,

    /** Protocol error. */
    PROTOCOL_ERROR = 4010,
    /** Transaction TTL exceeded. */
    TRANSACTION_TTL_EXCEEDED = 4011,
    /** Unexpected acknowledgement was received by the server. */
    UNEXPECTED_ACK = 4012,
    /** Client considered the connection to be timed out. */
    CLIENT_TIMEOUT = 4013,

    /** Unsupported protocol version. */
    UNSUPPORTED_PROTOCOL_VERSION = 4110,
    /** Device limit reached. */
    DEVICE_LIMIT_REACHED = 4111,
    /**
     * Device id was used for another connection.
     *
     * Note: It is fine to ignore this in connections that are currently closing.
     */
    DEVICE_ID_REUSED = 4112,
    /** Dropped by another device. */
    DEVICE_DROPPED = 4113,
    /** Reflection queue length limit reached (device data was deleted on mediator server). */
    REFLECTION_QUEUE_LENGTH_LIMIT_REACHED = 4114,
    /** Expected device slot state mismatch. */
    EXPECTED_DEVICE_SLOT_STATE_MISMATCH = 4115,

    /** Internal client error. */
    INTERNAL_ERROR = 5000,
    /** Web socket connection could not be established. */
    WEBSOCKET_UNABLE_TO_ESTABLISH = 5001,
}

/**
 * Combined connection state towards the Mediator server and the Chat server.
 *
 * @generate name store
 */
export enum ConnectionState {
    CONNECTING,
    HANDSHAKE,
    PARTIALLY_CONNECTED,
    CONNECTED,
    DISCONNECTED,
}

/**
 * Chat server protocol authentication state.
 *
 * @generate name
 */
export enum CspAuthState {
    CLIENT_HELLO,
    SERVER_HELLO,
    LOGIN_ACK,
    COMPLETE,
}

/**
 * Mediator protocol authentication state.
 *
 * @generate name
 */
export enum D2mAuthState {
    SERVER_HELLO,
    COMPLETE,
}

/**
 * Mediator leader state.
 *
 * @generate name store
 */
export enum D2mLeaderState {
    NONLEADER,
    LEADER,
}

/**
 * Device to mediator protocol payload type.
 *
 * @generate name
 */
export enum D2mPayloadType {
    PROXY = 0x00,
    SERVER_HELLO = 0x10,
    CLIENT_HELLO = 0x11,
    SERVER_INFO = 0x12,
    REFLECTION_QUEUE_DRY = 0x20,
    ROLE_PROMOTED_TO_LEADER = 0x21,
    GET_DEVICES_INFO = 0x30,
    DEVICES_INFO = 0x31,
    DROP_DEVICE = 0x32,
    DROP_DEVICE_ACK = 0x33,
    SET_SHARED_DEVICE_DATA = 0x34,
    BEGIN_TRANSACTION = 0x40,
    BEGIN_TRANSACTION_ACK = 0x41,
    COMMIT_TRANSACTION = 0x42,
    COMMIT_TRANSACTION_ACK = 0x43,
    TRANSACTION_REJECTED = 0x44,
    TRANSACTION_ENDED = 0x45,
    REFLECT = 0x80,
    REFLECT_ACK = 0x81,
    REFLECTED = 0x82,
    REFLECTED_ACK = 0x83,
}

/**
 * Chat server protocol 'clever extension' type.
 */
export enum CspExtensionType {
    CLIENT_INFO = 0x00,
    CSP_DEVICE_ID = 0x01,
    MESSAGE_PAYLOAD_VERSION = 0x02,
    DEVICE_COOKIE = 0x03,
}

/**
 * CSP message payload struct version to be used.
 */
export enum CspMessagePayloadVersion {
    LEGACY_MESSAGE = 0x00,
    MESSAGE_WITH_METADATA_BOX = 0x01,
}

/**
 * Chat server protocol payload type.
 *
 * @generate name
 */
export enum CspPayloadType {
    ECHO_REQUEST = 0x00,
    ECHO_RESPONSE = 0x80,
    OUTGOING_MESSAGE = 0x01,
    OUTGOING_MESSAGE_ACK = 0x81,
    INCOMING_MESSAGE = 0x02,
    INCOMING_MESSAGE_ACK = 0x82,
    UNBLOCK_INCOMING_MESSAGES = 0x03,
    SET_CONNECTION_IDLE_TIMEOUT = 0x30,
    QUEUE_SEND_COMPLETE = 0xd0,
    LAST_EPHEMERAL_KEY_HASH = 0xd1,
    CLOSE_ERROR = 0xe0,
    ALERT = 0xe1,
}

/**
 * Chat server protocol message flag.
 */
export enum CspMessageFlag {
    NONE = 0x00,
    SEND_PUSH_NOTIFICATION = 0x01,
    DONT_QUEUE = 0x02,
    DONT_ACK = 0x04,
    GROUP_MESSAGE = 0x10,
    IMMEDIATE_DELIVERY_REQUIRED = 0x20,
    DONT_SEND_DELIVERY_RECEIPTS = 0x80,
}

/**
 * E2EE conversation message type.
 *
 * @generate name convert
 */
export enum CspE2eConversationType {
    TEXT = 0x01,
    DEPRECATED_IMAGE = 0x02,
    LOCATION = 0x10,
    DEPRECATED_AUDIO = 0x14,
    DEPRECATED_VIDEO = 0x13,
    FILE = 0x17,
    POLL_SETUP = 0x15,
    POLL_VOTE = 0x16,
    CALL_OFFER = 0x60,
    CALL_ANSWER = 0x61,
    CALL_ICE_CANDIDATE = 0x62,
    CALL_HANGUP = 0x63,
    CALL_RINGING = 0x64,
}

/**
 * E2EE status update type.
 *
 * @generate name
 */
export enum CspE2eStatusUpdateType {
    DELIVERY_RECEIPT = 0x80,
    TYPING_INDICATOR = 0x90,
}

/**
 * E2EE contact control type.
 *
 * @generate name
 */
export enum CspE2eContactControlType {
    CONTACT_SET_PROFILE_PICTURE = 0x18,
    CONTACT_DELETE_PROFILE_PICTURE = 0x19,
    CONTACT_REQUEST_PROFILE_PICTURE = 0x1a,
}

/**
 * E2EE group control type.
 *
 * @generate name convert
 */
export enum CspE2eGroupControlType {
    GROUP_SETUP = 0x4a,
    GROUP_NAME = 0x4b,
    GROUP_LEAVE = 0x4c,
    GROUP_SET_PROFILE_PICTURE = 0x50,
    GROUP_DELETE_PROFILE_PICTURE = 0x54,
    GROUP_REQUEST_SYNC = 0x51,
    GROUP_CALL_START = 0x4f,
}

/**
 * E2EE group conversation type.
 *
 * @generate name convert
 */
export enum CspE2eGroupConversationType {
    GROUP_TEXT = 0x41,
    GROUP_LOCATION = 0x42,
    DEPRECATED_GROUP_IMAGE = 0x43,
    GROUP_AUDIO = 0x45,
    GROUP_VIDEO = 0x44,
    GROUP_FILE = 0x46,
    GROUP_POLL_SETUP = 0x52,
    GROUP_POLL_VOTE = 0x53,
}

/**
 * E2EE group status update type.
 *
 * @generate name
 */
export enum CspE2eGroupStatusUpdateType {
    GROUP_DELIVERY_RECEIPT = 0x81,
}

/**
 * E2EE forward security type.
 *
 * @generate name
 */
export enum CspE2eForwardSecurityType {
    FORWARD_SECURITY_ENVELOPE = 0xa0,
}

/**
 * E2EE delivery receipt status.
 *
 * @generate convert name
 */
export enum CspE2eDeliveryReceiptStatus {
    RECEIVED = 0x01,
    READ = 0x02,
    ACKNOWLEDGED = 0x03,
    DECLINED = 0x04,
}

/**
 * Receiver of an end-to-end encrypted message.
 *
 * @generate convert name
 */
export enum ReceiverType {
    CONTACT = 0,
    DISTRIBUTION_LIST = 1,
    GROUP = 2,
}

/**
 * Message direction.
 *
 * @generate name
 */
export enum MessageDirection {
    INBOUND = 0,
    OUTBOUND = 1,
}

/**
 * Task message filter instruction.
 *
 * @generate name
 */
export enum MessageFilterInstruction {
    ACCEPT = 0,
    BYPASS_OR_BACKLOG = 1,
    REJECT = 2,
}

/**
 * All possible message types.
 *
 * Note: When adding more message types, the mapping {@link CspE2eTypeToMessageType} must be updated
 *       as well!
 *
 * WARNING: Do not change the internal representation of this enum, since those values are stored
 *          directly in the database!
 *
 * @generate convert
 */
export enum MessageType {
    TEXT = 'text',
    FILE = 'file',
    // IMAGE = 'image',
    // VIDEO = 'video',
    // AUDIO = 'audio',
    // POLL = 'poll',
    // LOCATION = 'location',
}

/**
 * Source that triggered some kind of update.
 */
export enum TriggerSource {
    /**
     * An update triggered by synchronisation from another device.
     *
     * This should never trigger further messages to other devices.
     */
    SYNC = 0,
    /**
     * An update triggered locally, e.g. by a user interaction.
     *
     * This will always trigger messages to other devices.
     */
    LOCAL = 1,
    /**
     * An update triggered remotely, e.g. by an incoming message.
     *
     * The task that was triggered by the remote message will take care of reflection, but further
     * side effects (e.g. implicit contact creation) will need to be reflected separately.
     */
    REMOTE = 2,
}

/**
 * Message reaction.
 *
 * WARNING: Do not change the internal representation of this enum,
 *          since those values are stored directly in the database!
 *
 * @generate convert name
 */
export enum MessageReaction {
    ACKNOWLEDGE = 0,
    DECLINE = 1,
}

/**
 * Message fetch direction (either older or newer messages).
 */
export enum MessageQueryDirection {
    OLDER = 0,
    NEWER = 1,
}

/**
 * Features available for a contact (32 bit mask).
 */
export enum FeatureMaskFlag {
    /** No additional features available */
    NONE = 0x00_00_00_00,
    /** Can handle audio messages. */
    AUDIO_MESSAGE_SUPPORT = 0x00_00_00_01,
    /** Can handle groups. */
    GROUP_SUPPORT = 0x00_00_00_02,
    /** Can handle polls. */
    POLL_SUPPORT = 0x00_00_00_04,
    /** Can handle file messages. */
    FILE_MESSAGE_SUPPORT = 0x00_00_00_08,
    /** Can handle audio calls. */
    AUDIO_CALL_SUPPORT = 0x00_00_00_10,
    /** Can handle video calls. */
    VIDEO_CALL_SUPPORT = 0x00_00_00_20,
}

/**
 * Global Property Keys of this client. Used as key for the globalProperties table.
 *
 * @generate convert name
 */
export enum GlobalPropertyKey {
    /** Connection Metadata of the last successfull mediator connection */
    LAST_MEDIATOR_CONNECTION = 'lastMediatorConnection',
}

/**
 * PROTOBUF
 * ========
 *
 * WARNING: Do not change the internal representation of these enums since those values are used
 *          directly by the protocol **and** are stored directly in the database!
 *
 * TODO(DESK-48): These enums are pulled from protobuf-generated files. We should generate them directly!
 */

/** @generate convert */
export enum D2dCspMessageType {
    INVALID = 0,
    TEXT = 1,
    DEPRECATED_IMAGE = 2,
    LOCATION = 16,
    DEPRECATED_AUDIO = 20,
    DEPRECATED_VIDEO = 19,
    FILE = 23,
    POLL_SETUP = 21,
    POLL_VOTE = 22,
    CALL_OFFER = 96,
    CALL_ANSWER = 97,
    CALL_ICE_CANDIDATE = 98,
    CALL_HANGUP = 99,
    CALL_RINGING = 100,
    DELIVERY_RECEIPT = 128,
    TYPING_INDICATOR = 144,
    CONTACT_SET_PROFILE_PICTURE = 24,
    CONTACT_DELETE_PROFILE_PICTURE = 25,
    CONTACT_REQUEST_PROFILE_PICTURE = 26,
    GROUP_SETUP = 74,
    GROUP_NAME = 75,
    GROUP_LEAVE = 76,
    GROUP_SET_PROFILE_PICTURE = 80,
    GROUP_DELETE_PROFILE_PICTURE = 84,
    GROUP_REQUEST_SYNC = 81,
    GROUP_CALL_START = 79,
    GROUP_TEXT = 65,
    GROUP_LOCATION = 66,
    GROUP_IMAGE = 67,
    GROUP_AUDIO = 69,
    GROUP_VIDEO = 68,
    GROUP_FILE = 70,
    GROUP_POLL_SETUP = 82,
    GROUP_POLL_VOTE = 83,
    GROUP_DELIVERY_RECEIPT = 129,
}
/** @generate convert */
export enum AcquaintanceLevel {
    /**
     * The contact was explicitly added by the user or a 1:1 conversation with
     * the contact has been initiated.
     */
    DIRECT = 0,
    /**
     * The contact is part of a group the user is also part of. The contact was
     * not explicitly added and no 1:1 conversation has been initiated.
     */
    GROUP = 1,
}
/** @generate convert */
export enum ActivityState {
    ACTIVE = 0,
    INACTIVE = 1,
    INVALID = 2,
}
/** @generate convert */
export enum ContactNotificationTriggerPolicy {
    NEVER = 0,
}
/** @generate convert */
export enum ConversationCategory {
    DEFAULT = 0,
    PROTECTED = 1,
}
/** @generate convert */
export enum ConversationVisibility {
    SHOW = 0,
    ARCHIVED = 1,
    PINNED = 2,
}
/** @generate convert */
export enum GroupNotificationTriggerPolicy {
    MENTIONED = 0,
    NEVER = 1,
}
/** @generate convert */
export enum IdentityType {
    REGULAR = 0,
    WORK = 1,
}
/** @generate convert */
export enum NotificationSoundPolicy {
    MUTED = 0,
}
/** @generate convert */
export enum ReadReceiptPolicy {
    SEND_READ_RECEIPT = 0,
    DONT_SEND_READ_RECEIPT = 1,
}
/** @generate convert */
export enum SyncState {
    INITIAL = 0,
    IMPORTED = 1,
    CUSTOM = 2,
}
/** @generate convert name */
export enum TransactionScope {
    USER_PROFILE_SYNC = 0,
    CONTACT_SYNC = 1,
    GROUP_SYNC = 2,
    DISTRIBUTION_LIST_SYNC = 3,
    SETTINGS_SYNC = 4,
    NEW_DEVICE_SYNC = 5,
}
/** @generate convert */
export enum TypingIndicatorPolicy {
    SEND_TYPING_INDICATOR = 0,
    DONT_SEND_TYPING_INDICATOR = 1,
}
/** @generate convert */
export enum VerificationLevel {
    UNVERIFIED = 0,
    SERVER_VERIFIED = 1,
    FULLY_VERIFIED = 2,
}
/** @generate convert */
export enum WorkVerificationLevel {
    NONE = 0,
    WORK_SUBSCRIPTION_VERIFIED = 1,
}
/** @generate convert */
export enum DeviceSlotState {
    NEW = 0,
    EXISTING = 1,
}
/** @generate convert name */
export enum GroupUserState {
    /** The user is a member (or creator) of the group. */
    MEMBER = 0,
    /** The user has been kicked from the group. Implies that the group has been marked as _left_. */
    KICKED = 1,
    /** The user left the group. Implies that the group has been marked as _left_. */
    LEFT = 2,
}
/** @generate convert */
export enum ContactSyncPolicy {
    NOT_SYNCED = 0,
    SYNC = 1,
}
/** @generate convert */
export enum UnknownContactPolicy {
    ALLOW_UNKNOWN = 0,
    BLOCK_UNKNOWN = 1,
}
/** @generate convert */
export enum CallPolicy {
    ALLOW_CALL = 0,
    DENY_CALL = 1,
}
/** @generate convert */
export enum CallConnectionPolicy {
    ALLOW_DIRECT = 0,
    REQUIRE_RELAY = 1,
}
/** @generate convert */
export enum ScreenshotPolicy {
    ALLOW_SCREENSHOT = 0,
    DENY_SCREENSHOT = 1,
}
/** @generate convert */
export enum KeyboardDataCollectionPolicy {
    ALLOW_DATA_COLLECTION = 0,
    DENY_DATA_COLLECTION = 1,
}

/**
 * ELECTRON
 * ========
 */

export enum ElectronIpcCommand {
    ERROR = 'error',
    GET_APP_PATH = 'getAppApath',
    GET_SYSTEM_INFO = 'getSystemInfo',
    LOG_TO_FILE = 'logToFile',
    DELETE_PROFILE_AND_RESTART = 'deleteProfileAndRestart',
    UPDATE_APP_BADGE = 'updateAppBadge',
}

/**
 * DATABASE
 * ========
 */

/**
 * The blob download state.
 *
 * @generate convert
 */
export enum BlobDownloadState {
    /** The blob download failed and should not be retried. */
    PERMANENT_FAILURE = 0,
}

/**
 * UTILITY
 * =======
 */

/**
 * Whether it has been ensured that an entity exists or not.
 */
export enum Existence {
    ENSURED = 0,
    UNKNOWN = 1,
}

/**
 * Delta update type.
 */
export enum DeltaUpdateType {
    ADDED = 0,
    DELETED = 1,
    CLEARED = 2,
}

/**
 * Button value flags for `MouseEvent.buttons`, see:
 * https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent/buttons
 */
export enum MouseEventButtons {
    /** No button. */
    NONE = 0,
    /** Primary, usually the left button. */
    PRIMARY = 1,
    /** Secondary, usually the right button. */
    SECONDARY = 2,
    /** Auxiliary, usually the middle/mouse wheel button. */
    AUXILIARY = 4,
    /** 4th button, typically the "Browser Back" button. */
    BACK = 8,
    /** 5th button, typically the "Browser Forward" button. */
    FORWARD = 16,
}

export enum Browser {
    CHROME = 0,
    CHROME_IOS = 1,
    FIREFOX = 2,
    FIREFOX_IOS = 3,
    EDGE = 4,
    OPERA = 5,
    SAFARI = 6,
    ELECTRON = 7,
    UNKNOWN = 8,
}
