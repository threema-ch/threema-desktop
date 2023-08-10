import * as v from '@badrap/valita';

import {d2d} from '~/common/network/protobuf/js';
import {validator} from '~/common/network/protobuf/utils';
import {NULL_OR_UNDEFINED_SCHEMA} from '~/common/network/protobuf/validate/helpers';
import {ensureD2mDeviceId} from '~/common/network/types';
import {instanceOf, unsignedLongAsU64} from '~/common/utils/valita-helpers';

/** Base schema for an {@link d2d.Envelope} oneof instance */
const BASE_SCHEMA = {
    padding: instanceOf(Uint8Array),
    deviceId: unsignedLongAsU64().map(ensureD2mDeviceId),
    outgoingMessage: NULL_OR_UNDEFINED_SCHEMA,
    outgoingMessageUpdate: NULL_OR_UNDEFINED_SCHEMA,
    incomingMessage: NULL_OR_UNDEFINED_SCHEMA,
    incomingMessageUpdate: NULL_OR_UNDEFINED_SCHEMA,
    userProfileSync: NULL_OR_UNDEFINED_SCHEMA,
    contactSync: NULL_OR_UNDEFINED_SCHEMA,
    groupSync: NULL_OR_UNDEFINED_SCHEMA,
    distributionListSync: NULL_OR_UNDEFINED_SCHEMA,
    settingsSync: NULL_OR_UNDEFINED_SCHEMA,
    mdmParameterSync: NULL_OR_UNDEFINED_SCHEMA,
};

/**
 * {@link d2d.Envelope} oneof schema instance with content = outgoingMessage
 */
const OUTGOING_MESSAGE_SCHEMA = validator(
    d2d.Envelope,
    v
        .object({
            ...BASE_SCHEMA,
            content: v.literal('outgoingMessage'),
            outgoingMessage: instanceOf(d2d.OutgoingMessage),
        })
        .rest(v.unknown()),
);

/**
 * {@link d2d.Envelope} oneof schema instance with content = outgoingMessageUpdate
 */
const OUTGOING_MESSAGE_UPDATE_SCHEMA = validator(
    d2d.Envelope,
    v
        .object({
            ...BASE_SCHEMA,
            content: v.literal('outgoingMessageUpdate'),
            outgoingMessageUpdate: instanceOf(d2d.OutgoingMessageUpdate),
        })
        .rest(v.unknown()),
);

/**
 * {@link d2d.Envelope} oneof schema instance with content = incomingMessage
 */
const INCOMING_MESSAGE_SCHEMA = validator(
    d2d.Envelope,
    v
        .object({
            ...BASE_SCHEMA,
            content: v.literal('incomingMessage'),
            incomingMessage: instanceOf(d2d.IncomingMessage),
        })
        .rest(v.unknown()),
);

// Envelope with content = incomingMessageUpdate
const INCOMING_MESSAGE_UPDATE_SCHEMA = validator(
    d2d.Envelope,
    v
        .object({
            ...BASE_SCHEMA,
            content: v.literal('incomingMessageUpdate'),
            incomingMessageUpdate: instanceOf(d2d.IncomingMessageUpdate),
        })
        .rest(v.unknown()),
);

/**
 * {@link d2d.Envelope} oneof schema instance with content = contactSync
 */
const CONTACT_SYNC_SCHEMA = validator(
    d2d.Envelope,
    v
        .object({
            ...BASE_SCHEMA,
            content: v.literal('contactSync'),
            contactSync: instanceOf(d2d.ContactSync),
        })
        .rest(v.unknown()),
);

/**
 * {@link d2d.Envelope} oneof schema instance with content = groupSync
 */
const GROUP_SYNC_SCHEMA = validator(
    d2d.Envelope,
    v
        .object({
            ...BASE_SCHEMA,
            content: v.literal('groupSync'),
            groupSync: instanceOf(d2d.GroupSync),
        })
        .rest(v.unknown()),
);

/**
 * {@link d2d.Envelope} oneof schema instance with content = distributionListSync
 */
const DISTRIBUTION_LIST_SYNC_SCHEMA = validator(
    d2d.Envelope,
    v
        .object({
            ...BASE_SCHEMA,
            content: v.literal('distributionListSync'),
            distributionListSync: instanceOf(d2d.DistributionListSync),
        })
        .rest(v.unknown()),
);

/**
 * {@link d2d.Envelope} oneof schema instance with content = settingsSync
 */
const SETTINGS_SYNC_SCHEMA = validator(
    d2d.Envelope,
    v
        .object({
            ...BASE_SCHEMA,
            content: v.literal('settingsSync'),
            settingsSync: instanceOf(d2d.SettingsSync),
        })
        .rest(v.unknown()),
);

/**
 * {@link d2d.Envelope} oneof schema instance with content = mdmParameterSync
 */
const MDM_PARAMETER_SYNC_SCHEMA = validator(
    d2d.Envelope,
    v
        .object({
            ...BASE_SCHEMA,
            content: v.literal('mdmParameterSync'),
            mdmParameterSync: instanceOf(d2d.MdmParameterSync),
        })
        .rest(v.unknown()),
);

/**
 * {@link d2d.Envelope} oneof schema instance with content = userProfileSync
 */
const USER_PROFILE_SYNC_SCHEMA = validator(
    d2d.Envelope,
    v
        .object({
            ...BASE_SCHEMA,
            content: v.literal('userProfileSync'),
            userProfileSync: instanceOf(d2d.UserProfileSync),
        })
        .rest(v.unknown()),
);

/** Validates properties of {@link d2d.Envelope} */
export const SCHEMA = validator(
    d2d.Envelope,
    v.union(
        OUTGOING_MESSAGE_SCHEMA,
        OUTGOING_MESSAGE_UPDATE_SCHEMA,
        INCOMING_MESSAGE_SCHEMA,
        INCOMING_MESSAGE_UPDATE_SCHEMA,
        USER_PROFILE_SYNC_SCHEMA,
        CONTACT_SYNC_SCHEMA,
        GROUP_SYNC_SCHEMA,
        DISTRIBUTION_LIST_SYNC_SCHEMA,
        SETTINGS_SYNC_SCHEMA,
        MDM_PARAMETER_SYNC_SCHEMA,
    ),
);

export type Type = v.Infer<typeof SCHEMA>;
