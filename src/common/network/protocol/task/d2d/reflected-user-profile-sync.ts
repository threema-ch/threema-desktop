import {ensureNonce} from '~/common/crypto';
import {extractErrorMessage} from '~/common/error';
import type {Logger} from '~/common/logging';
import type {ProfileSettingsView} from '~/common/model/types/settings';
import * as protobuf from '~/common/network/protobuf';
import {downloadAndDecryptBlob} from '~/common/network/protocol/blob';
import {BLOB_FILE_NONCE} from '~/common/network/protocol/constants';
import {
    PASSIVE_TASK,
    type PassiveTask,
    type PassiveTaskCodecHandle,
    type PassiveTaskSymbol,
    type ServicesForTasks,
} from '~/common/network/protocol/task/';
import type {D2mDeviceId} from '~/common/network/types';
import type {Mutable} from '~/common/types';
import {ensureError, unreachable} from '~/common/utils/assert';
import {u64ToHexLe} from '~/common/utils/number';
import {VALITA_EMPTY_STRING, VALITA_NULL, VALITA_UNDEFINED} from '~/common/utils/valita-helpers';

/**
 * Process reflected UserProfileSync messages with an updated user profile.
 */
export class ReflectedUserProfileSyncTask implements PassiveTask<void> {
    public readonly type: PassiveTaskSymbol = PASSIVE_TASK;
    public readonly persist = false;
    private readonly _log: Logger;
    private readonly _senderDeviceIdString: string;

    public constructor(
        private readonly _services: ServicesForTasks,
        private readonly _unvalidatedMessage: protobuf.d2d.UserProfileSync,
        senderDeviceId: D2mDeviceId,
    ) {
        this._log = _services.logging.logger(
            `network.protocol.task.reflected-user-profile-sync-task`,
        );
        this._senderDeviceIdString = u64ToHexLe(senderDeviceId);
    }

    public async run(handle: PassiveTaskCodecHandle): Promise<void> {
        const {model} = this._services;

        this._log.info(
            `Received reflected UserProfileSync message from ${this._senderDeviceIdString}`,
        );

        // Validate the Protobuf message
        let validatedMessage;
        try {
            validatedMessage = protobuf.validate.d2d.UserProfileSync.SCHEMA.parse(
                this._unvalidatedMessage,
            );
        } catch (error) {
            this._log.error(
                `Discarding reflected UserProfileSync message due to validation error: ${error}`,
            );
            return;
        }

        const profileUpdate: Mutable<Partial<ProfileSettingsView>> = {};

        this._processUpdateForNickname(validatedMessage, profileUpdate);
        this._processUpdateForProfilePictureShareWith(validatedMessage, profileUpdate);
        await this._processUpdateForProfilePicture(validatedMessage, profileUpdate);

        model.user.profileSettings.get().controller.update(profileUpdate);
    }

    private _processUpdateForNickname(
        validatedMessage: protobuf.validate.d2d.UserProfileSync.Type,
        profileUpdate: Mutable<Partial<ProfileSettingsView>>,
    ): void {
        switch (validatedMessage.update.userProfile.nickname) {
            case VALITA_NULL:
            case VALITA_UNDEFINED:
                // Do not update the nickname
                break;
            case VALITA_EMPTY_STRING:
                // Delete the nickname by setting it to undefined
                profileUpdate.nickname = undefined;
                break;

            default:
                profileUpdate.nickname = validatedMessage.update.userProfile.nickname;
                break;
        }
    }

    private _processUpdateForProfilePictureShareWith(
        validatedMessage: protobuf.validate.d2d.UserProfileSync.Type,
        profileUpdate: Mutable<Partial<ProfileSettingsView>>,
    ): void {
        if (validatedMessage.update.userProfile.profilePictureShareWith === undefined) {
            return;
        }
        const {policy, allowList} = validatedMessage.update.userProfile.profilePictureShareWith;
        switch (policy) {
            case 'nobody':
            case 'everyone':
                profileUpdate.profilePictureShareWith = {group: policy};
                break;

            case 'allowList':
                profileUpdate.profilePictureShareWith = {
                    group: policy,
                    allowList: allowList.identities,
                };
                break;

            default:
                unreachable(policy);
        }
    }

    private async _processUpdateForProfilePicture(
        validatedMessage: protobuf.validate.d2d.UserProfileSync.Type,
        profileUpdate: Mutable<Partial<ProfileSettingsView>>,
    ): Promise<void> {
        if (validatedMessage.update.userProfile.profilePicture === undefined) {
            return;
        }
        switch (validatedMessage.update.userProfile.profilePicture.image) {
            case 'removed':
                profileUpdate.profilePicture = undefined;
                break;
            case 'updated': {
                const {blob} = validatedMessage.update.userProfile.profilePicture.updated;
                // Download and decrypt public blob
                try {
                    profileUpdate.profilePicture = {
                        blob: await downloadAndDecryptBlob(
                            this._services,
                            this._log,
                            blob.id,
                            blob.key,
                            // TODO(SE-286): Should we use blob.nonce or not?
                            ensureNonce(blob.nonce ?? BLOB_FILE_NONCE),
                            'local',
                            'local',
                        ),
                        blobId: blob.id,
                        lastUploadedAt:
                            validatedMessage.update.userProfile.profilePicture.updated.blob
                                .uploadedAt,
                        key: blob.key,
                    };
                } catch (error) {
                    this._log.warn(
                        `Could not download and decrypt user profile picture: ${extractErrorMessage(
                            ensureError(error),
                            'short',
                        )}`,
                    );
                }
                break;
            }

            default:
                unreachable(validatedMessage.update.userProfile.profilePicture);
        }
    }
}
