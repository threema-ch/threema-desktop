import {wrapRawKey, type ReadonlyRawKey} from '@threema/crypto';
import type {BaseUrl, IdentityString} from '@threema/domain';
import type {NonceScope} from '@threema/protocol/enum';
import type {ReadonlyUint8Array} from '@threema/ts-utils/array/readonly-uint8-array';
import {UTF8} from '@threema/ts-utils/codec/utf8';
import {tag, type WeakOpaque} from '@threema/ts-utils/meta/newtype';
import type {SequenceNumberU32} from '@threema/ts-utils/sequence-number/sequence-number-u32';
import type {SequenceNumberU64} from '@threema/ts-utils/sequence-number/sequence-number-u64';

import type {Cookie, CryptoBox, NonceUnguardedScope} from '~/common/crypto';
import type {DbStatusMessageUid} from '~/common/db';
import type {Device} from '~/common/device';
import {ReceiverType} from '~/common/enum';
import type {AnyReceiver} from '~/common/model';
import {getIdentityString} from '~/common/model/contact';
import {isU64, type u32, type u64} from '~/common/types';
import {unreachable} from '~/common/utils/assert';

// Note: These live in `@threema/domain` so that shared packages can use them without depending on
// this app. They are re-exported here to keep the existing import sites working.
//
// TODO(DESK-2248): Remove re-exports in favor of updating the changed imports.
export {
    ensureBaseUrl,
    ensureIdentityString,
    ensureNickname,
    isIdentityString,
    isNickname,
    validateUrl,
    type BaseUrl,
    type IdentityString,
    type Nickname,
    type ValidateUrlProperties,
} from '@threema/domain';

export type DeviceName = WeakOpaque<string, {readonly deviceName: unique symbol}>;

/**
 * Type guard for {@link DeviceName}.
 */
export function isDeviceName(deviceName: unknown): deviceName is DeviceName {
    return typeof deviceName === 'string' && deviceName.length > 0;
}

/**
 * Ensure input is a valid {@link DeviceName}.
 */
export function ensureDeviceName(deviceName: string): DeviceName {
    if (!isDeviceName(deviceName)) {
        throw new Error(`Not a valid device name: '${deviceName}'`);
    }
    return deviceName;
}

/**
 * The client's Threema ID as ASCII bytes.
 */
export type IdentityBytes = WeakOpaque<Uint8Array, {readonly IdentityBytes: unique symbol}>;

const DEVICE_COOKIE_LENGTH = 16;

/** Device cookie of 16 bytes. */
export type DeviceCookie = WeakOpaque<ReadonlyUint8Array, {readonly DeviceCookie: unique symbol}>;

/**
 * Type guard for {@link DeviveCookie}.
 */
export function isDeviceCookie(cookieBytes: unknown): cookieBytes is DeviceCookie {
    return cookieBytes instanceof Uint8Array && cookieBytes.byteLength === DEVICE_COOKIE_LENGTH;
}

/**
 * Ensure input is a valid {@link DeviceCookie}.
 */
export function ensureDeviceCookie(cookie: ReadonlyUint8Array): DeviceCookie {
    if (!isDeviceCookie(cookie)) {
        throw new Error(
            `Expected device cookie to be ${DEVICE_COOKIE_LENGTH} bytes but has ${cookie.byteLength} bytes`,
        );
    }
    return cookie;
}

/**
 * The client's device ID towards the chat server.
 */
export type CspDeviceId = WeakOpaque<u64, {readonly CspDeviceId: unique symbol}>;

/**
 * Type guard for {@link CspDeviceId}.
 */
export function isCspDeviceId(id: unknown): id is CspDeviceId {
    return isU64(id);
}

/**
 * Ensure input is a valid {@link CspDeviceId}.
 */
export function ensureCspDeviceId(id: unknown): CspDeviceId {
    if (!isCspDeviceId(id)) {
        throw new Error(`Not a valid CSP device id: '${id}'`);
    }
    return id;
}

/**
 * The client's device ID towards the mediator server.
 */
export type D2mDeviceId = WeakOpaque<u64, {readonly D2mDeviceId: unique symbol}>;

/**
 * Type guard for {@link D2mDeviceId}.
 */
export function isD2mDeviceId(id: unknown): id is D2mDeviceId {
    return isU64(id);
}

/**
 * Ensure input is a valid {@link D2mDeviceId}.
 */
export function ensureD2mDeviceId(id: unknown): D2mDeviceId {
    if (!isD2mDeviceId(id)) {
        throw new Error(`Not a valid D2M device id: '${id}'`);
    }
    return id;
}

/**
 * A client sequence number counter value.
 */
export type ClientSequenceNumberValue = WeakOpaque<
    u64,
    {readonly ClientSequenceNumberValue: unique symbol}
>;

/**
 * A server sequence number counter value.
 */
export type ServerSequenceNumberValue = WeakOpaque<
    u64,
    {readonly ServerSequenceNumberValue: unique symbol}
>;

/**
 * The client's sequence number counter.
 */
export type ClientSequenceNumber = WeakOpaque<
    SequenceNumberU64<ClientSequenceNumberValue>,
    {readonly ClientSequenceNumber: unique symbol}
>;

/**
 * The server's sequence number counter.
 */
export type ServerSequenceNumber = WeakOpaque<
    SequenceNumberU64<ServerSequenceNumberValue>,
    {readonly ServerSequenceNumber: unique symbol}
>;

/**
 * Client Connection Cookie (16 bytes, replaced for each connection attempt).
 */
export type ClientCookie = WeakOpaque<Cookie, {readonly ClientCookie: unique symbol}>;

/**
 * Server Connection Cookie (16 bytes), available after `server-hello` has been received.
 */
export type ServerCookie = WeakOpaque<Cookie, {readonly ServerCookie: unique symbol}>;

/**
 * Chat Server Payload Box.
 *
 * Note: No nonce guard needs to be present since `TCK` is ephemeral.
 */
export type CspPayloadBox = WeakOpaque<
    CryptoBox<
        ServerCookie,
        ClientCookie,
        ServerSequenceNumberValue,
        ClientSequenceNumberValue,
        NonceUnguardedScope
    >,
    {readonly CspPayloadBox: unique symbol}
>;

/**
 * Chat Server E2EE Message crypto box.
 */
export type CspE2eBox = WeakOpaque<
    CryptoBox<never, never, never, never, NonceScope.CSP>,
    {readonly CspE2eBox: unique symbol}
>;

/**
 * Mediator Challenge Box.
 */
export type D2mChallengeBox = WeakOpaque<
    CryptoBox<never, never, never, never, NonceScope.D2D>,
    {readonly D2mChallengeBox: unique symbol}
>;

/**
 * Reflect counter value.
 */
export type ReflectSequenceNumberValue = WeakOpaque<
    u32,
    {readonly ReflectIdSequenceNumberValue: unique symbol}
>;

/**
 * Reflect sequence number.
 */
export type ReflectSequenceNumber = WeakOpaque<
    SequenceNumberU32<ReflectSequenceNumberValue>,
    {readonly ReflectSequenceNumber: unique symbol}
>;

/**
 * A message ID.
 */
export type MessageId = WeakOpaque<u64, {readonly Messageid: unique symbol}>;

/**
 * Type guard for {@link MessageId}.
 */
export function isMessageId(id: unknown): id is MessageId {
    return isU64(id);
}

/**
 * Ensure input is a valid {@link MessageId}.
 */
export function ensureMessageId(id: unknown): MessageId {
    if (!isMessageId(id)) {
        throw new Error(`Not a valid message id: '${id}'`);
    }
    return id;
}

export type StatusMessageId = WeakOpaque<string, {readonly statusMessageId: unique symbol}>;

/**
 * Type guard for {@link StatusMessageId}.
 */
export function isStatusMessageId(id: unknown): id is StatusMessageId {
    return typeof id === 'string' && !isNaN(parseInt(id, 10));
}

/**
 * Ensure input is a valid {@link StatusMessageId}.
 */
export function ensureStatusMessageId(id: unknown): StatusMessageId {
    if (!isStatusMessageId(id)) {
        throw new Error(`Not a valid status message id: '${id}'`);
    }
    return id;
}

export function statusMessageIdtoStatusMessageUid(id: StatusMessageId): DbStatusMessageUid {
    try {
        return BigInt(id) as DbStatusMessageUid;
    } catch {
        throw new Error(
            `Not a valid Status message ID as it cannot be casted to a status message uid`,
        );
    }
}

export function statusMessageUidToStatusMessageId(uid: DbStatusMessageUid): StatusMessageId {
    return ensureStatusMessageId(uid.toString());
}

/**
 * A 64-bit group ID.
 */
export type GroupId = WeakOpaque<u64, {readonly GroupId: unique symbol}>;

/**
 * Type guard for {@link GroupId}
 */
export function isGroupId(id: unknown): id is GroupId {
    return isU64(id);
}

/**
 * Ensure input is a valid {@link GroupId}.
 */
export function ensureGroupId(id: u64): GroupId {
    if (!isGroupId(id)) {
        throw new Error(`Not a valid group id: '${id}'`);
    }
    return id;
}

/**
 * A 64-bit distribution list ID.
 */
export type DistributionListId = WeakOpaque<u64, {readonly DistributionListId: unique symbol}>;

/**
 * Type guard for {@link DistributionListId}
 */
export function isDistributionListId(id: unknown): id is DistributionListId {
    return isU64(id);
}

/**
 * Ensure input is a valid {@link DistributionListId}.
 */
export function ensureDistributionListId(id: u64): DistributionListId {
    if (!isDistributionListId(id)) {
        throw new Error(`Not a valid distribution list id: '${id}'`);
    }
    return id;
}

/**
 * A 64-bit poll ID.
 */
export type PollId = WeakOpaque<u64, {readonly PollId: unique symbol}>;

/**
 * Type guard for {@link PollId}
 */
export function isPollId(id: unknown): id is PollId {
    return isU64(id);
}

/**
 * Ensure input is a valid {@link PollId}.
 */
export function ensurePollId(id: u64): PollId {
    if (!isPollId(id)) {
        throw new Error(`Not a valid poll id: '${id}'`);
    }
    return id;
}

/**
 * CSP features supported by a device or available for a contact (64 bit mask).
 *
 * IMPORTANT: The flags determine what a device/contact is capable of, not whether the settings
 * allow for it. For example, group calls may be supported but ignored if disabled in the settings.
 *
 * Must be compatible with {@link common.CspFeatureMaskFlag} (except for the number type).
 */
export const FEATURE_MASK_FLAG = {
    // No features available
    NONE: 0x00n,
    // Can handle voice messages.
    VOICE_MESSAGE_SUPPORT: 0x01n,
    // Can handle groups.
    GROUP_SUPPORT: 0x02n,
    // Can handle polls.
    POLL_SUPPORT: 0x04n,
    // Can handle file messages.
    FILE_MESSAGE_SUPPORT: 0x08n,
    // Can handle 1:1 audio calls.
    O2O_AUDIO_CALL_SUPPORT: 0x10n,
    // Can handle 1:1 video calls.
    O2O_VIDEO_CALL_SUPPORT: 0x20n,
    // Can handle forward security.
    FORWARD_SECURITY_SUPPORT: 0x40n,
    // Can handle group calls.
    GROUP_CALL_SUPPORT: 0x80n,
    // Can handle edited messages.
    EDIT_MESSAGE_SUPPORT: 0x100n,
    // Can handle deleted messages.
    DELETED_MESSAGES_SUPPORT: 0x200n,
    // Can handle emoji reactions.
    EMOJI_REACTION_SUPPORT: 0x400n,
} as const;

/**
 * Feature bitmask (64 bits).
 *
 * For valid bitmask values, see {@link FEATURE_MASK_FLAG}.
 */
export type FeatureMask = WeakOpaque<u64, {readonly FeatureMask: unique symbol}>;

/**
 * Type guard for {@link FeatureMask}.
 */
export function isFeatureMask(mask: unknown): mask is FeatureMask {
    return isU64(mask);
}

/**
 * Ensure input is a valid {@link FeatureMask}.
 */
export function ensureFeatureMask(mask: unknown): FeatureMask {
    if (!isFeatureMask(mask)) {
        throw new Error(`Expected feature mask to be a u64 but it's value is '${mask}''`);
    }
    return mask;
}

/**
 * Server group. Must consist of [a-zA-Z0-9] only.
 */
export type ServerGroup = WeakOpaque<string, {readonly ServerGroup: unique symbol}>;

/**
 * Type guard for {@link ServerGroup}.
 */
export function isServerGroup(serverGroup: unknown): serverGroup is ServerGroup {
    return typeof serverGroup === 'string' && /^[0-9a-zA-Z]+$/u.test(serverGroup);
}

/**
 * Ensure input is a valid {@link ServerGroup}.
 */
export function ensureServerGroup(serverGroup: string): ServerGroup {
    if (!isServerGroup(serverGroup)) {
        throw new Error(`Not a valid server group: ${serverGroup}`);
    }
    return serverGroup;
}

/**
 * Emoji reactions
 *
 * An emoji reaction is a string that consists of at most one grapheme-cluster.
 */
export type EmojiReaction = WeakOpaque<string, {readonly EmojiReaction: unique symbol}>;
export function isEmojiReaction(emojiReaction: unknown): emojiReaction is EmojiReaction {
    return typeof emojiReaction === 'string' && UTF8.encode(emojiReaction).byteLength <= 64;
}
export function ensureEmojiReaction(emojiReaction: string): EmojiReaction {
    if (!isEmojiReaction(emojiReaction)) {
        throw new Error(`Not a valid single emoji: ${emojiReaction}`);
    }
    return emojiReaction;
}

/**
 * Identify a contact conversation.
 */
export interface ContactConversationId {
    readonly type: ReceiverType.CONTACT;
    readonly identity: IdentityString;
}

/**
 * Identify a group conversation.
 */
export interface GroupConversationId {
    readonly type: ReceiverType.GROUP;
    readonly creatorIdentity: IdentityString;
    readonly groupId: GroupId;
}

/**
 * Identify a distribution list conversation.
 */
export interface DistributionListConversationId {
    readonly type: ReceiverType.DISTRIBUTION_LIST;
    readonly distributionListId: DistributionListId;
}

/**
 * Identify a conversation.
 */
export type ConversationId =
    | ContactConversationId
    | GroupConversationId
    | DistributionListConversationId;

export type RemoteSecretHash = WeakOpaque<
    ReadonlyUint8Array,
    {readonly RemoteSecretHash: unique symbol}
>;
const REMOTE_SECRET_HASH_LENGTH = 32;
/**
 * Type guard for {@link RemoteSecretHash}.
 */
export function isRemoteSecretHash(raw: unknown): raw is RemoteSecretHash {
    return raw instanceof Uint8Array && raw.byteLength === REMOTE_SECRET_HASH_LENGTH;
}
/**
 * Ensure input is a valid {@link RemoteSecretHash}.
 */
export function ensureRemoteSecretHash(hash: unknown): RemoteSecretHash {
    if (!isRemoteSecretHash(hash)) {
        throw new Error(`Not a valid RS hash: ${hash}`);
    }
    return hash;
}

export type RemoteSecretAuthenticationToken = WeakOpaque<
    ReadonlyUint8Array,
    {readonly RemoteSecretAuthenticationToken: unique symbol}
>;
const REMOTE_SECRET_AUTHENTICATION_LENGTH = 32;
/**
 * Type guard for {@link RemoteSecretAuthenticationToken}.
 */
export function isRemoteSecretAuthenticationToken(
    raw: unknown,
): raw is RemoteSecretAuthenticationToken {
    return raw instanceof Uint8Array && raw.byteLength === REMOTE_SECRET_AUTHENTICATION_LENGTH;
}
/**
 * Ensure input is a valid {@link RemoteSecretAuthenticationToken}.
 */
export function ensureRemoteSecretAuthenticationToken(
    token: unknown,
): RemoteSecretAuthenticationToken {
    if (!isRemoteSecretAuthenticationToken(token)) {
        throw new Error(`Not a valid RS authentication token: ${token}`);
    }
    return token;
}

export interface RemoteSecretData {
    readonly token: RemoteSecretAuthenticationToken;
    readonly endpoint: BaseUrl;
    readonly hash: RemoteSecretHash;
}

const REMOTE_SECRET_LENGTH = 32;
/**
 * The remote secret. Must be exactly 32 bytes long
 */
export type RawRemoteSecret = WeakOpaque<
    ReadonlyRawKey<typeof REMOTE_SECRET_LENGTH>,
    {readonly RawRemoteSecret: unique symbol}
>;
/**
 * Wrap a key into a {@link RawRemoteSecret}.
 *
 * @throws {CryptoError} in case the key is not 32 bytes long.
 */
export function wrapRemoteSecret(secret: Uint8Array): RawRemoteSecret {
    return tag<RawRemoteSecret>(wrapRawKey(secret, REMOTE_SECRET_LENGTH).asReadonly());
}

/**
 * Whether or not to overwrite the default reflection property of a group message with never.
 */
export type GroupMessageReflectSetting = 'default' | 'never';

/**
 * Return a {@link ConversationId} for the specified receiver model.
 */
export function conversationIdForReceiver(device: Device, receiver: AnyReceiver): ConversationId {
    switch (receiver.type) {
        case ReceiverType.CONTACT:
            return {type: ReceiverType.CONTACT, identity: receiver.view.identity};
        case ReceiverType.GROUP:
            return {
                type: ReceiverType.GROUP,
                creatorIdentity: getIdentityString(device, receiver.view.creator),
                groupId: receiver.view.groupId,
            };
        case ReceiverType.DISTRIBUTION_LIST:
            // TODO(DESK-236): Implement distribution list
            throw new Error('Distribution lists not yet implemented');
        default:
            return unreachable(receiver);
    }
}
