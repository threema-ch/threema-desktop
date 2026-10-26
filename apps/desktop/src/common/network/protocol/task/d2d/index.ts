import type {ReadonlyUint8Array} from '@threema/ts-utils/array/readonly-uint8-array';
import {dateToUnixTimestampMs} from '@threema/ts-utils/conversion/date-to-unix-timestamp-ms';
import {u64ToUnsignedLong} from '@threema/ts-utils/conversion/u64-to-unsigned-long';

import type {Nonce} from '~/common/crypto';
import * as protobuf from '~/common/network/protobuf';
import type {BlobId} from '~/common/network/protocol/blob';
import type {PassiveTask, ServicesForTasks} from '~/common/network/protocol/task';
import type {DeltaImage} from '~/common/network/protocol/task/d2d/group-sync-helper';
import {TechDebtTask} from '~/common/network/protocol/task/tech-debt';
import type * as structbuf from '~/common/network/structbuf/';
import type {RawBlobKey} from '~/common/network/types/keys';
import {unreachable} from '~/common/utils/assert';

import {ReflectedContactSyncTask} from './reflected-contact-sync';
import {ReflectedGroupSyncTask} from './reflected-group-sync';
import {ReflectedIncomingMessageTask} from './reflected-incoming-message';
import {ReflectedIncomingMessageUpdateTask} from './reflected-incoming-message-update';
import {ReflectedOutgoingMessageTask} from './reflected-outgoing-message';
import {ReflectedOutgoingMessageUpdateTask} from './reflected-outgoing-message-update';
import {ReflectedSettingsSyncTask} from './reflected-settings-sync';
import {ReflectedUserProfileSyncTask} from './reflected-user-profile-sync';

export interface D2dRemoveProfilePicture {
    readonly type: 'removed';
}
export interface D2dSetProfilePicture {
    readonly type: 'set';
    readonly blob: {
        readonly blobId: BlobId;
        readonly key: RawBlobKey;
        readonly nonce: Nonce;
        readonly uploadedAt: Date;
    };
}

// Necessary information to create a `DeltaImage` message.
export type D2dProfilePictureUpdate = D2dRemoveProfilePicture | D2dSetProfilePicture;

export function getTaskForIncomingD2dMessage(
    services: ServicesForTasks,
    envelope: protobuf.validate.d2d.Envelope.Type,
    reflected: structbuf.validate.d2m.payload.Reflected.Type,
): PassiveTask<void> {
    switch (envelope.content) {
        case 'contactSync':
            return new ReflectedContactSyncTask(services, envelope.contactSync);
        case 'groupSync':
            return new ReflectedGroupSyncTask(services, envelope.groupSync, reflected.timestamp);
        case 'outgoingMessage':
            return new ReflectedOutgoingMessageTask(
                services,
                envelope.outgoingMessage,
                envelope.deviceId,
                reflected.timestamp,
                envelope.protocolVersion,
            );
        case 'incomingMessage':
            return new ReflectedIncomingMessageTask(
                services,
                envelope.incomingMessage,
                envelope.deviceId,
                reflected.timestamp,
                envelope.protocolVersion,
            );
        case 'incomingMessageUpdate':
            return new ReflectedIncomingMessageUpdateTask(
                services,
                envelope.incomingMessageUpdate,
                envelope.deviceId,
                reflected.timestamp,
            );
        case 'outgoingMessageUpdate':
            return new ReflectedOutgoingMessageUpdateTask(
                services,
                envelope.outgoingMessageUpdate,
                envelope.deviceId,
                reflected.timestamp,
            );
        case 'userProfileSync':
            return new ReflectedUserProfileSyncTask(
                services,
                envelope.userProfileSync,
                envelope.deviceId,
            );
        case 'settingsSync':
            return new ReflectedSettingsSyncTask(
                services,
                envelope.settingsSync,
                envelope.deviceId,
            );
        case 'mdmParameterSync':
        case 'distributionListSync':
            return new TechDebtTask(services, `Handle inbound D2D ${envelope.content}`);
        default:
            return unreachable(envelope);
    }
}

export function getDeltaImageMessage(
    profilePicture?: D2dProfilePictureUpdate,
): DeltaImage | undefined {
    if (profilePicture === undefined) {
        return undefined;
    }
    if (profilePicture.type === 'removed') {
        return protobuf.utils.creator(protobuf.common.DeltaImage, {
            updated: undefined,
            removed: protobuf.UNIT_MESSAGE,
        });
    }
    return protobuf.utils.creator(protobuf.common.DeltaImage, {
        removed: undefined,
        updated: protobuf.utils.creator(protobuf.common.Image, {
            blob: protobuf.utils.creator(protobuf.common.Blob, {
                id: profilePicture.blob.blobId as ReadonlyUint8Array as Uint8Array,
                key: profilePicture.blob.key.unwrap(),
                uploadedAt: u64ToUnsignedLong(
                    dateToUnixTimestampMs(profilePicture.blob.uploadedAt),
                ),
                nonce: profilePicture.blob.nonce,
            }),
            type: protobuf.common.Image.Type.JPEG,
        }),
    });
}
