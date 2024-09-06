import * as v from '@badrap/valita';

import type {DbPersistentProtocolStateUid} from '~/common/db';
import {PersistentProtocolStateType} from '~/common/enum';
import * as proto from '~/common/internal-protobuf/persistent-protocol-state';
import type {BlobId} from '~/common/network/protocol/blob';
import {ensureIdentityString, type IdentityString} from '~/common/network/types';
import {tag, type ReadonlyUint8Array, type WeakOpaque} from '~/common/types';
import {instanceOf} from '~/common/utils/valita-helpers';

// As defined in the Profile Piccture Distribution Steps in the protocol.
export const LAST_USER_PROFILE_ENTRY_EXPIRATION_SECONDS = 604800;

export interface PersistentProtocolStateValues {
    [PersistentProtocolStateType.LAST_USER_PROFILE_DISTRIBUTION_STATE]: {
        readonly receiverIdentity: IdentityString;
        readonly profilePicture: UserProfileDistributionProtocolValue;
    };
}

export interface PersistentProtocolStateCodec<TType extends PersistentProtocolStateType> {
    readonly encode: (value: PersistentProtocolStateValues[TType]) => Uint8Array;
    readonly decode: (encoded: ReadonlyUint8Array) => PersistentProtocolStateValues[TType];
}

/**
 * Validation schema for the Last user profile distribution protocol state.
 *
 */
const LAST_USER_PROFILE_DISTRIBUTION_STATE = v
    .object({
        receiverIdentity: v.string().map(ensureIdentityString),
        blobId: instanceOf<Uint8Array>(Uint8Array)
            .map(tag<BlobId>)
            .optional(),
    })
    .rest(v.unknown());

export const LAST_USER_PROFILE_DISTRIBUTION_STATE_CODEC: PersistentProtocolStateCodec<PersistentProtocolStateType.LAST_USER_PROFILE_DISTRIBUTION_STATE> =
    {
        encode: (value) =>
            proto.UserProfileState.encode(
                value.profilePicture.type === 'removed'
                    ? {
                          receiverIdentity: value.receiverIdentity,
                          blobId: undefined,
                      }
                    : {
                          receiverIdentity: value.receiverIdentity,
                          blobId: value.profilePicture.blobId as ReadonlyUint8Array as Uint8Array,
                      },
            ).finish(),

        decode: (encoded) => {
            const parsed = LAST_USER_PROFILE_DISTRIBUTION_STATE.parse(
                proto.UserProfileState.decode(encoded as Uint8Array),
            );
            if (parsed.blobId === undefined) {
                return {
                    receiverIdentity: parsed.receiverIdentity,
                    profilePicture: {type: 'removed'},
                };
            }
            return {
                receiverIdentity: parsed.receiverIdentity,
                profilePicture: {type: 'profile-picture', blobId: parsed.blobId},
            };
        },
    };

/** Map of the persistent protocol types to their corresponding codec. */
export const PERSISTENT_PROTOCOL_STATE_CODEC: {
    readonly [TType in PersistentProtocolStateType]: PersistentProtocolStateCodec<TType>;
} = {
    [PersistentProtocolStateType.LAST_USER_PROFILE_DISTRIBUTION_STATE]:
        LAST_USER_PROFILE_DISTRIBUTION_STATE_CODEC,
};

export type UserProfileDistributionCacheKey = WeakOpaque<
    string,
    {readonly UserProfileDistribution: unique symbol}
>;

export type UserProfileDistributionProtocolValue =
    | {type: 'profile-picture'; blobId: BlobId}
    | {type: 'removed'};

export type UserProfileDistributionCacheValue = UserProfileDistributionProtocolValue & {
    createdAt: Date;
    uid: DbPersistentProtocolStateUid;
};
