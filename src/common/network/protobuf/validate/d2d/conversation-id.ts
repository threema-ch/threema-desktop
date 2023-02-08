import * as v from '@badrap/valita';
import Long from 'long';

import {ReceiverType} from '~/common/enum';
import {d2d} from '~/common/network/protobuf/js';
import {creator, type ProtobufInstanceOf, validator} from '~/common/network/protobuf/utils';
import {GroupIdentity} from '~/common/network/protobuf/validate/common';
import {NULL_OR_UNDEFINED_SCHEMA} from '~/common/network/protobuf/validate/helpers';
import {
    type ConversationId,
    ensureDistributionListId,
    ensureIdentityString,
} from '~/common/network/types';
import {unreachable} from '~/common/utils/assert';
import {intoU64, intoUnsignedLong} from '~/common/utils/number';

/** Base schema for an {@link d2d.ConversationId} oneof instance */
const BASE_SCHEMA = {
    contact: NULL_OR_UNDEFINED_SCHEMA,
    distributionList: NULL_OR_UNDEFINED_SCHEMA,
    group: NULL_OR_UNDEFINED_SCHEMA,
};

/**
 * Validates {@link d2d.ConversationId} to {@link Type}
 */
export const SCHEMA = validator(
    d2d.ConversationId,
    v.union(
        v
            .object({
                ...BASE_SCHEMA,
                id: v.literal('contact'),
                contact: v.string().map(ensureIdentityString),
            })
            .rest(v.unknown()),
        v
            .object({
                ...BASE_SCHEMA,
                id: v.literal('distributionList'),
                distributionList: v
                    .unknown()
                    .assert(Long.isLong)
                    .map(intoU64)
                    .map(ensureDistributionListId),
            })
            .rest(v.unknown()),
        v
            .object({
                ...BASE_SCHEMA,
                id: v.literal('group'),
                group: GroupIdentity.SCHEMA,
            })
            .rest(v.unknown()),
    ),
);

export type Type = v.Infer<typeof SCHEMA>;

/**
 * Serializes {@link Type} to {@link d2d.ConversationId}
 */
export function serialize(validatedMessage: Type): ProtobufInstanceOf<typeof d2d.ConversationId> {
    const baseProps = {
        contact: undefined,
        distributionList: undefined,
        group: undefined,
    };
    let props;
    switch (validatedMessage.id) {
        case 'contact':
            props = {
                ...baseProps,
                contact: validatedMessage.contact as string,
            };
            break;
        case 'distributionList':
            props = {
                ...baseProps,
                distributionList: intoUnsignedLong(validatedMessage.distributionList),
            };
            break;
        case 'group':
            props = {
                ...baseProps,
                group: GroupIdentity.serialize(validatedMessage.group),
            };
            break;
        default:
            return unreachable(validatedMessage);
    }

    return creator(d2d.ConversationId, props);
}

/**
 * Convert a {@link ConversationId} to a {@link Type}.
 */
export function fromCommonConversationId(conversationId: ConversationId): Type {
    switch (conversationId.type) {
        case ReceiverType.CONTACT:
            return {
                id: 'contact',
                contact: conversationId.identity,
                group: undefined,
                distributionList: undefined,
            };
        case ReceiverType.GROUP:
            return {
                id: 'group',
                contact: undefined,
                group: {
                    creatorIdentity: conversationId.creatorIdentity,
                    groupId: conversationId.groupId,
                },
                distributionList: undefined,
            };
        case ReceiverType.DISTRIBUTION_LIST:
            return {
                id: 'distributionList',
                contact: undefined,
                group: undefined,
                distributionList: conversationId.distributionListId,
            };
        default:
            return unreachable(conversationId);
    }
}

/**
 * Convert a {@link Type} to a {@link ConversationId}.
 */
export function toCommonConversationId(conversationId: Type): ConversationId {
    switch (conversationId.id) {
        case 'contact':
            return {
                type: ReceiverType.CONTACT,
                identity: conversationId.contact,
            };
        case 'group':
            return {
                type: ReceiverType.GROUP,
                creatorIdentity: conversationId.group.creatorIdentity,
                groupId: conversationId.group.groupId,
            };
        case 'distributionList':
            return {
                type: ReceiverType.DISTRIBUTION_LIST,
                distributionListId: conversationId.distributionList,
            };
        default:
            return unreachable(conversationId);
    }
}
