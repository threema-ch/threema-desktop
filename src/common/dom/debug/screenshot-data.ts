import * as v from '@badrap/valita';

import type {I18nLocales} from '~/app/ui/i18n-types';
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
    ensureNickname,
} from '~/common/network/types';
import {unreachable} from '~/common/utils/assert';
import {base64ToU8a} from '~/common/utils/base64';
import {hexToBytes} from '~/common/utils/byte';
import {hexLeToU64} from '~/common/utils/number';

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function translatedValueSchema<T>(valueSchema: v.Type<T>) {
    return v
        .object({
            default: valueSchema,
            de: valueSchema.optional(),
            fr: valueSchema.optional(),
        })
        .rest(v.unknown());
}

type TranslatedValueSchema<T> = v.Infer<ReturnType<typeof translatedValueSchema<T>>>;

const OTHER_IDENTITY_STRING_OR_ME_SCHEMA = v.union(
    v.string().map(ensureIdentityString),
    v.literal('me'),
);

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

    reactions: v
        .array(
            v.object({
                reaction: v.union(v.literal('ACKNOWLEDGE'), v.literal('DECLINE')).map((value) => {
                    switch (value) {
                        case 'ACKNOWLEDGE':
                            return MessageReaction.ACKNOWLEDGE;
                        case 'DECLINE':
                            return MessageReaction.DECLINE;
                        default:
                            return unreachable(value);
                    }
                }),
                senderIdentity: OTHER_IDENTITY_STRING_OR_ME_SCHEMA,
            }),
        )
        .optional(),
    // Note: Only defined for groups
    identity: v.string().map(ensureIdentityString).optional(),
};
const TEST_MESSAGE_SCHEMA = v.union(
    v
        .object({
            ...TEST_MESSAGE_BASE,
            type: v.literal('TEXT'),
            content: translatedValueSchema(v.string()),
            contentQuoteV2: translatedValueSchema(v.string()).optional(),
        })
        .rest(v.unknown()),
    v
        .object({
            ...TEST_MESSAGE_BASE,
            type: v.literal('FILE'),
            content: v
                .object({
                    fileName: v.string(),
                    fileBytes: v.string().map((value) => base64ToU8a(value)),
                    mediaType: v.string(),
                    caption: translatedValueSchema(v.string()).optional(),
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
                    imageBytes: v.string().map((value) => base64ToU8a(value)),
                    mediaType: v.string(),
                    caption: translatedValueSchema(v.string()).optional(),
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
                    audioBytes: v.string().map((value) => base64ToU8a(value)),
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
                    lat: v.number(),
                    lon: v.number(),
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
                    duration: v.number(),
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
        name: translatedValueSchema(
            v
                .object({
                    first: v.string(),
                    last: v.string(),
                })
                .rest(v.unknown()),
        ),
        verificationLevel: v.number().map((value) => VerificationLevelUtils.fromNumber(value)),
        acquaintanceLevel: v
            .union(v.literal('DIRECT'), v.literal('GROUP_OR_DELETED'))
            .map((value) => {
                switch (value) {
                    case 'DIRECT':
                        return AcquaintanceLevel.DIRECT;
                    case 'GROUP_OR_DELETED':
                        return AcquaintanceLevel.GROUP_OR_DELETED;
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
        avatar: v
            .string()
            .map((value) => base64ToU8a(value))
            .optional(),
        conversation: v.array(TEST_MESSAGE_SCHEMA),
    })
    .rest(v.unknown());

const TEST_GROUP_SCHEMA = v
    .object({
        id: v.string().map(hexLeToU64).map(ensureGroupId),
        creator: OTHER_IDENTITY_STRING_OR_ME_SCHEMA,
        name: translatedValueSchema(v.string()),
        members: v.array(OTHER_IDENTITY_STRING_OR_ME_SCHEMA),
        createdMinutesAgo: v.number(),
        avatar: v
            .string()
            .map((value) => base64ToU8a(value))
            .optional(),
        conversation: v.array(TEST_MESSAGE_SCHEMA),
    })
    .rest(v.unknown());

export const SCREENSHOT_DATA_JSON_SCHEMA = v
    .object({
        profile: v
            .object({
                identity: v.string().map(ensureIdentityString),
                nickname: v.string().map(ensureNickname).optional(),
                profilePicture: v.string().map((value) => base64ToU8a(value)),
            })
            .optional(),
        contacts: v.array(TEST_CONTACT_SCHEMA).default([]),
        groups: v.array(TEST_GROUP_SCHEMA).default([]),
    })
    .rest(v.unknown());

export type ScreenshotDataJson = Readonly<v.Infer<typeof SCREENSHOT_DATA_JSON_SCHEMA>>;

export type ScreenshotDataJsonContact = Readonly<v.Infer<typeof TEST_CONTACT_SCHEMA>>;
export type ScreenshotDataJsonGroup = Readonly<v.Infer<typeof TEST_GROUP_SCHEMA>>;

/**
 * Return a translated value for the specified language. Fall back to the default if value is not
 * available in this language.
 */
export function getTranslatedValue<T>(value: TranslatedValueSchema<T>, language: I18nLocales): T {
    switch (language) {
        case 'de':
            return value.de ?? value.default;
        case 'en':
            return value.default;
        default:
            return unreachable(language);
    }
}
