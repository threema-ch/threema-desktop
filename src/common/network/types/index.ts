import {type Cookie, type CryptoBox, type NonceGuard, type NonceUnguarded} from '~/common/crypto';
import {ReceiverType} from '~/common/enum';
import {type AnyReceiver} from '~/common/model';
import {type u32, type u53, type u64, type WeakOpaque, isU64} from '~/common/types';
import {unreachable} from '~/common/utils/assert';
import {type SequenceNumberU32, type SequenceNumberU64} from '~/common/utils/sequence-number';

/**
 * The client's Threema ID as a string.
 *
 * See {@link IDENTITY_STRING_RE} for its pattern.
 *
 */
export type IdentityString = WeakOpaque<string, {readonly IdentityString: unique symbol}>;

/**
 * Regular expression for {@link IdentityString}.
 *
 * Note: This is not 100% accurate since some characters and numbers are disallowed. But it's
 *       accurate enough for our purposes.
 */
const IDENTITY_STRING_RE = /^[A-Z0-9*]{1}[A-Z0-9]{7}$/u;

/**
 * Type guard for {@link IdentityString}.
 */
export function isIdentityString(identity: unknown): identity is IdentityString {
    return typeof identity === 'string' && IDENTITY_STRING_RE.test(identity);
}

/**
 * Ensure input is a valid {@link IdentityString}.
 */
export function ensureIdentityString(identity: unknown): IdentityString {
    if (!isIdentityString(identity)) {
        throw new Error(`Not a valid Threema ID: ${identity}`);
    }
    return identity;
}

/**
 * The public nickname of a user as a string.
 */
export type PublicNickname = WeakOpaque<string, {readonly PublicNickname: unique symbol}>;

/**
 * Type guard for {@link PublicNickname}.
 */
export function isPublicNickname(publicNickname: unknown): publicNickname is PublicNickname {
    return typeof publicNickname === 'string' && publicNickname.length > 0;
}

/**
 * Ensure input is a valid {@link PublicNickname}.
 */
export function ensurePublicNickname(publicNickname: string): PublicNickname {
    if (!isPublicNickname(publicNickname)) {
        throw new Error(`Not a valid public nickname: '${publicNickname}'`);
    }
    return publicNickname;
}

/**
 * The client's Threema ID as ASCII bytes.
 */
export type IdentityBytes = WeakOpaque<Uint8Array, {readonly IdentityBytes: unique symbol}>;

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
 * Client Connection Cookie (16 bytes, replaced for each
 * connection attempt).
 */
export type ClientCookie = WeakOpaque<Cookie, {readonly ClientCookie: unique symbol}>;

/**
 * Server Connection Cookie (16 bytes), available after `server-hello`
 * has been received.
 */
export type ServerCookie = WeakOpaque<Cookie, {readonly ServerCookie: unique symbol}>;

/**
 * Chat Server Protocol nonce guard.
 */
export type CspNonceGuard = WeakOpaque<NonceGuard, {readonly CspNonceGuard: unique symbol}>;

/**
 * Device to Mediator and Device to Device Protocol nonce guard.
 */
export type D2xNonceGuard = WeakOpaque<NonceGuard, {readonly D2xNonceGuard: unique symbol}>;

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
        NonceUnguarded
    >,
    {readonly CspPayloadBox: unique symbol}
>;

/**
 * Chat Server E2EE Message crypto box.
 */
export type CspE2eBox = WeakOpaque<
    CryptoBox<never, never, never, never, CspNonceGuard>,
    {readonly CspE2eBox: unique symbol}
>;

/**
 * Mediator Challenge Box.
 */
export type D2mChallengeBox = WeakOpaque<
    CryptoBox<never, never, never, never, D2xNonceGuard>,
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
    return typeof id === 'bigint' && id >= 0 && id < 2n ** 64n;
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
 * Feature bitmask. It is ensured that this only contains OR-ed
 * {@link FeatureMaskFlag}s.
 */
export type FeatureMask = WeakOpaque<u32, {readonly FeatureMask: unique symbol}>;

/**
 * Type guard for {@link FeatureMask}.
 */
export function isFeatureMask(mask: unknown): mask is FeatureMask {
    return typeof mask === 'number' && mask < 2 ** 32;
}

/**
 * Ensure input is a valid {@link FeatureMask}.
 */
export function ensureFeatureMask(mask: u53): FeatureMask {
    if (!isFeatureMask(mask)) {
        throw new Error(`Expected feature mask to be a u32 but it's value is '${mask}''`);
    }
    return mask;
}

/**
 * Server group. Must consist of [a-zA-Z0-9] only.
 *
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

/**
 * Return a {@link ConversationId} for the specified receiver model.
 */
export function conversationIdForReceiver(receiver: AnyReceiver): ConversationId {
    switch (receiver.type) {
        case ReceiverType.CONTACT:
            return {type: ReceiverType.CONTACT, identity: receiver.view.identity};
        case ReceiverType.GROUP:
            return {
                type: ReceiverType.GROUP,
                creatorIdentity: receiver.view.creatorIdentity,
                groupId: receiver.view.groupId,
            };
        case ReceiverType.DISTRIBUTION_LIST:
            // TODO(WEBMD-236): Implement distribution list
            throw new Error('Distribution lists not yet implemented');
        default:
            return unreachable(receiver);
    }
}
