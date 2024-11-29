import type {Contact} from '~/common/model';
import {encryptAndUploadBlob, type BlobId} from '~/common/network/protocol/blob';
import {BLOB_FILE_NONCE} from '~/common/network/protocol/constants';
import type {ServicesForTasks} from '~/common/network/protocol/task';
import type {RawBlobKey} from '~/common/network/types/keys';
import {LAST_USER_PROFILE_ENTRY_EXPIRATION_SECONDS} from '~/common/network/types/persistent-protocol-state';
import type {u53} from '~/common/types';
import {byteEquals} from '~/common/utils/byte';

interface ProfileDistributionResult {
    readonly remove?: Set<Contact>;
    readonly set?: {
        readonly contacts: Set<Contact>;
        readonly blobId: BlobId;
        readonly key: RawBlobKey;
        readonly size: u53;
    };
}

/**
 * Run the user profile picture distribution steps.
 *
 * Returns the contacts to which to send a `set_profile_picture` message and the contacts to which
 * to send a `delete_profile_picture` message.
 */
export async function profilePictureDistributionSteps(
    services: ServicesForTasks,
    userProfileDistribution: boolean,
    receiverContacts: Set<Contact>,
): Promise<ProfileDistributionResult> {
    const {persistentProtocolState} = services;

    let remove: ProfileDistributionResult['remove'] = undefined;
    let set: ProfileDistributionResult['set'] = undefined;

    // 3. If the message does not allow user profile distribution abort these steps.
    if (!userProfileDistribution) {
        return {remove, set};
    }

    const profilePictureShareWith =
        services.model.user.profileSettings.get().view.profilePictureShareWith;
    const currentProfilePicture = services.model.user.profileSettings.get().view.profilePicture;

    for (const receiver of receiverContacts.values()) {
        // 4. If the contact's Threema ID is `ECHOECHO` or a Threema Gateway ID abort these steps.
        if (receiver.view.identity.startsWith('*') || receiver.view.identity === 'ECHOECHO') {
            continue;
        }

        // Is defined if there is a cache entry towards the receiver that is not expired (i.e from
        // within the last 7 days).
        const cache = persistentProtocolState.getLastUserProfileDistributionState(
            receiver.view.identity,
        );

        // 6.  If the settings indicate that the user's profile picture should be shared with nobody
        //     or the settings associated to `receiver` indicate that the profile picture should not
        //     be distributed to it:
        if (
            currentProfilePicture === undefined ||
            profilePictureShareWith.group === 'nobody' ||
            (profilePictureShareWith.group === 'allowList' &&
                profilePictureShareWith.allowList.find(
                    (identity) => identity === receiver.view.identity,
                ) === undefined)
        ) {
            // 6.1. If `cache` is a _remove_ mark and indicates that the most recent
            // delete-profile-picture message towards `receiver` was sent less than seven days ago,
            // abort these steps without a message.
            if (cache?.type === 'removed') {
                continue;
            }

            // 6.2. Update the `cache` for `receiver` to a _remove_ mark with the current timestamp.
            persistentProtocolState.setLastUserProfileDistributionState(
                receiver.view.identity,
                {type: 'removed'},
                new Date(),
            );

            // Add the receiver to the list of contacts that should receive a delete-profile-picture
            // message.
            if (remove === undefined) {
                remove = new Set<Contact>();
            }
            remove.add(receiver);
            continue;
        }

        let blobId, key;
        // Contrarily to the protocol, we do not explicitly remove the actual profile picture if it
        // was expired. However, we translate this into a condition.
        //
        // Note: If once of the profile picture properties is undefined, we upload it once in any
        // case since this is a relict from older versions. If the current profile picture is too
        // old, we upload it to the server in any case.
        if (
            currentProfilePicture.lastUploadedAt === undefined ||
            currentProfilePicture.key === undefined ||
            currentProfilePicture.blobId === undefined ||
            Date.now() - currentProfilePicture.lastUploadedAt.getTime() >
                LAST_USER_PROFILE_ENTRY_EXPIRATION_SECONDS * 1000
        ) {
            // Upload the blob.

            // Note: This can only happen once per function call because the
            // cache is updated. In subsequent rounds of the loop, there will be a cache hit,
            // and therefore, no update is conducted.
            const blobInfo = await encryptAndUploadBlob(
                services,
                currentProfilePicture.blob,
                BLOB_FILE_NONCE,
                'public',
            );

            blobId = blobInfo.id;
            key = blobInfo.key;
            const lastUploaded = new Date();
            // Update the cache model view
            services.model.user.profileSettings.get().controller.update({
                profilePicture: {
                    blob: currentProfilePicture.blob,
                    blobId,
                    key,
                    lastUploadedAt: lastUploaded,
                },
            });
        } else {
            // 8. If `cache` contains a blob ID of the most recent set-profile-picture message
            //    sent towards `receiver` that equals the blob ID of the cached profile picture,
            //    abort these steps without a message.
            if (
                cache?.type === 'profile-picture' &&
                byteEquals(cache.blobId, currentProfilePicture.blobId)
            ) {
                continue;
            }

            blobId = currentProfilePicture.blobId;
            key = currentProfilePicture.key;
        }

        // 10. Update the `cache` for `receiver` to the blob ID of the cached profile picture.
        services.persistentProtocolState.setLastUserProfileDistributionState(
            receiver.view.identity,
            {blobId, type: 'profile-picture'},
            new Date(),
        );

        if (set === undefined) {
            set = {
                contacts: new Set(),
                blobId,
                key,
                size: currentProfilePicture.blob.byteLength,
            };
        }
        set.contacts.add(receiver);
    }
    return {set, remove};
}
