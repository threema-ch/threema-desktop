import * as v from '@badrap/valita';

import {ensurePublicKey} from '~/common/crypto';
import {
    AcquaintanceLevel,
    IdentityType,
    MessageDirection,
    MessageReaction,
    VerificationLevelUtils,
} from '~/common/enum';
import {
    ensureGroupId,
    ensureIdentityString,
    ensureMessageId,
    type IdentityString,
} from '~/common/network/types';
import {type f64} from '~/common/types';
import {unreachable} from '~/common/utils/assert';
import {base64ToU8a} from '~/common/utils/base64';
import {hexToBytes} from '~/common/utils/byte';
import {hexLeToU64} from '~/common/utils/number';

export const OWN_IDENTITY = Symbol('own-identity');

function identityStringOrOwnIdentity(
    value: string,
): v.ValitaResult<IdentityString | typeof OWN_IDENTITY> {
    if (value === 'OWN_IDENTITY') {
        return v.ok(OWN_IDENTITY);
    }
    try {
        return v.ok(ensureIdentityString(value));
    } catch (error) {
        return v.err(`${error}`);
    }
}

const TRANSLATED_VALUE_SCHEMA = v
    .object({
        default: v.string(),
        de: v.string().optional(),
    })
    .rest(v.unknown());

const TEST_MESSAGE_BASE = {
    messageId: v.string().map(hexLeToU64).map(ensureMessageId).optional(),
    minutesAgo: v.number(),
    direction: v.union(v.literal('INCOMING'), v.literal('OUTGOING')).map((direction) => {
        switch (direction) {
            case 'INCOMING':
                return MessageDirection.INBOUND;
            case 'OUTGOING':
                return MessageDirection.OUTBOUND;
            default:
                return unreachable(direction);
        }
    }),
    isRead: v.boolean().optional(),
    lastReaction: v
        .union(v.literal('ACKNOWLEDGE'), v.literal('DECLINE'))
        .map((value) => {
            switch (value) {
                case 'ACKNOWLEDGE':
                    return MessageReaction.ACKNOWLEDGE;
                case 'DECLINE':
                    return MessageReaction.DECLINE;
                default:
                    return unreachable(value);
            }
        })
        .optional(),
    // Note: Only defined for groups
    identity: v.string().map(ensureIdentityString).optional(),
};

const TEST_MESSAGE_SCHEMA = v.union(
    v
        .object({
            ...TEST_MESSAGE_BASE,
            type: v.literal('TEXT'),
            content: TRANSLATED_VALUE_SCHEMA,
            contentQuoteV2: TRANSLATED_VALUE_SCHEMA.optional(),
        })
        .rest(v.unknown()),
    v
        .object({
            ...TEST_MESSAGE_BASE,
            type: v.literal('FILE'),
            content: v
                .object({
                    fileName: v.string(),
                    fileBytes: v.string().map(base64ToU8a),
                    mediaType: v.string(),
                    caption: TRANSLATED_VALUE_SCHEMA.optional(),
                })
                .rest(v.unknown()),
        })
        .rest(v.unknown()),
    v
        .object({
            ...TEST_MESSAGE_BASE,
            type: v.literal('IMAGE'),
            content: v
                .object({
                    imageBytes: v.string().map(base64ToU8a),
                    mediaType: v.string(),
                    caption: TRANSLATED_VALUE_SCHEMA.optional(),
                })
                .rest(v.unknown()),
        })
        .rest(v.unknown()),
    v
        .object({
            ...TEST_MESSAGE_BASE,
            type: v.literal('AUDIO'),
            content: v
                .object({
                    audioBytes: v.string().map(base64ToU8a),
                })
                .rest(v.unknown()),
        })
        .rest(v.unknown()),
    v
        .object({
            ...TEST_MESSAGE_BASE,
            type: v.literal('LOCATION'),
            content: v
                .object({
                    lat: v.number().map((value) => value as f64),
                    lon: v.number().map((value) => value as f64),
                    description: v.string(),
                })
                .rest(v.unknown()),
        })
        .rest(v.unknown()),
    v
        .object({
            ...TEST_MESSAGE_BASE,
            type: v.literal('VOIP_STATUS'),
            content: v
                .object({
                    type: v.string(),
                    duration: v.number().map((value) => value as f64),
                })
                .rest(v.unknown()),
        })
        .rest(v.unknown()),
    v
        .object({
            ...TEST_MESSAGE_BASE,
            type: v.literal('BALLOT'),
            content: v.object({}).rest(v.unknown()),
        })
        .rest(v.unknown()),
);

const TEST_CONTACT_SCHEMA = v
    .object({
        identity: v.string().map(ensureIdentityString),
        publicKey: v.string().map(hexToBytes).map(ensurePublicKey),
        name: v
            .object({
                first: v.string(),
                last: v.string(),
            })
            .rest(v.unknown()),
        verificationLevel: v.number().map(VerificationLevelUtils.fromNumber),
        acquaintanceLevel: v.union(v.literal('DIRECT'), v.literal('GROUP')).map((value) => {
            switch (value) {
                case 'DIRECT':
                    return AcquaintanceLevel.DIRECT;
                case 'GROUP':
                    return AcquaintanceLevel.GROUP;
                default:
                    return unreachable(value);
            }
        }),
        identityType: v.union(v.literal('WORK'), v.literal('REGULAR')).map((value) => {
            switch (value) {
                case 'WORK':
                    return IdentityType.WORK;
                case 'REGULAR':
                    return IdentityType.REGULAR;
                default:
                    return unreachable(value);
            }
        }),
        avatar: v.string().map(base64ToU8a).optional(),
        conversation: v.array(TEST_MESSAGE_SCHEMA),
    })
    .rest(v.unknown());

const TEST_GROUP_SCHEMA = v
    .object({
        id: v.string().map(hexLeToU64).map(ensureGroupId),
        creator: v.string().chain(identityStringOrOwnIdentity),
        name: TRANSLATED_VALUE_SCHEMA,
        members: v.array(v.string().chain(identityStringOrOwnIdentity)),
        createdMinutesAgo: v.number(),
        avatar: v.string().map(base64ToU8a).optional(),
        conversation: v.array(TEST_MESSAGE_SCHEMA),
    })
    .rest(v.unknown());

export const SCREENSHOT_DATA_JSON_SCHEMA = v
    .object({
        contacts: v.array(TEST_CONTACT_SCHEMA).default([]),
        groups: v.array(TEST_GROUP_SCHEMA).default([]),
    })
    .rest(v.unknown());

export type ScreenshotDataJson = Readonly<v.Infer<typeof SCREENSHOT_DATA_JSON_SCHEMA>>;

export type ScreenshotDataJsonContact = Readonly<v.Infer<typeof TEST_CONTACT_SCHEMA>>;
export type ScreenshotDataJsonGroup = Readonly<v.Infer<typeof TEST_GROUP_SCHEMA>>;
