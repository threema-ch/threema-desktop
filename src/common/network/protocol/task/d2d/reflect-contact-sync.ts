import {type TransactionScope, TriggerSource} from '~/common/enum';
import {type Logger} from '~/common/logging';
import {type ContactInit, type ContactUpdate} from '~/common/model';
import * as protobuf from '~/common/network/protobuf';
import {type BlobId, encryptAndUploadBlob} from '~/common/network/protocol/blob';
import {BLOB_FILE_NONCE} from '~/common/network/protocol/constants';
import {
    type ActiveTaskCodecHandle,
    type ComposableTask,
    type ServicesForTasks,
    type TransactionRunning,
} from '~/common/network/protocol/task';
import {type IdentityString} from '~/common/network/types';
import {type RawBlobKey} from '~/common/network/types/keys';
import {type ReadonlyUint8Array} from '~/common/types';
import {unreachable} from '~/common/utils/assert';
import {dateToUnixTimestampMs, intoUnsignedLong} from '~/common/utils/number';
import {hasProperty} from '~/common/utils/object';

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const DEFAULT_READ_RECEIPT_POLICY_OVERRIDE = protobuf.utils.creator(
    protobuf.sync.Contact.ReadReceiptPolicyOverride,
    {
        default: protobuf.UNIT_MESSAGE,
        policy: undefined,
    },
);

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const DEFAULT_TYPING_INDICATOR_POLICY_OVERRIDE = protobuf.utils.creator(
    protobuf.sync.Contact.TypingIndicatorPolicyOverride,
    {
        default: protobuf.UNIT_MESSAGE,
        policy: undefined,
    },
);

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const DEFAULT_NOTIFICATION_TRIGGER_POLICY_OVERRIDE = protobuf.utils.creator(
    protobuf.sync.Contact.NotificationTriggerPolicyOverride,
    {
        default: protobuf.UNIT_MESSAGE,
        policy: undefined,
    },
);

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const DEFAULT_NOTIFICATION_SOUND_POLICY_OVERRIDE = protobuf.utils.creator(
    protobuf.sync.Contact.NotificationSoundPolicyOverride,
    {
        default: protobuf.UNIT_MESSAGE,
        policy: undefined,
    },
);

export type ProfilePictureUpdate =
    | {
          readonly source: TriggerSource.LOCAL;
          readonly profilePictureUserDefined: ReadonlyUint8Array | undefined;
      }
    | {
          readonly source: TriggerSource.REMOTE;
          readonly profilePictureContactDefined:
              | {
                    readonly bytes: ReadonlyUint8Array;
                    readonly blobId: BlobId;
                    readonly blobKey: RawBlobKey;
                }
              | undefined;
      };

function getD2dContactSyncCreate(init: ContactInit): protobuf.d2d.ContactSync {
    return protobuf.utils.creator(protobuf.d2d.ContactSync, {
        create: protobuf.utils.creator(protobuf.d2d.ContactSync.Create, {
            contact: protobuf.utils.creator(protobuf.sync.Contact, {
                identity: init.identity,
                publicKey: init.publicKey as ReadonlyUint8Array as Uint8Array,
                createdAt: intoUnsignedLong(dateToUnixTimestampMs(init.createdAt)),
                firstName: init.firstName,
                lastName: init.lastName,
                nickname: init.nickname,
                verificationLevel: init.verificationLevel,
                workVerificationLevel: init.workVerificationLevel,
                identityType: init.identityType,
                acquaintanceLevel: init.acquaintanceLevel,
                activityState: init.activityState,
                featureMask: init.featureMask,
                syncState: init.syncState,
                readReceiptPolicyOverride: DEFAULT_READ_RECEIPT_POLICY_OVERRIDE,
                typingIndicatorPolicyOverride: DEFAULT_TYPING_INDICATOR_POLICY_OVERRIDE,
                notificationTriggerPolicyOverride: DEFAULT_NOTIFICATION_TRIGGER_POLICY_OVERRIDE,
                notificationSoundPolicyOverride: DEFAULT_NOTIFICATION_SOUND_POLICY_OVERRIDE,
                conversationCategory: init.category,
                conversationVisibility: init.visibility,

                // Note: Profile pictures are currently synced through a separate update, since
                // they're not part of the {@link ContactInit}.
                contactDefinedProfilePicture: undefined,
                userDefinedProfilePicture: undefined,
            }),
        }),
        update: undefined,
        delete: undefined,
    });
}

function getD2dContactSyncUpdateData(
    identity: IdentityString,
    contact: ContactUpdate,
): protobuf.d2d.ContactSync {
    // TODO(DESK-612): Prepare read receipt policy override
    const readReceiptPolicyOverride = DEFAULT_READ_RECEIPT_POLICY_OVERRIDE;
    // TODO(DESK-780): Prepare typing indicator policy override
    const typingIndicatorPolicyOverride = DEFAULT_TYPING_INDICATOR_POLICY_OVERRIDE;

    // Prepare notification trigger policy override
    let notificationTriggerPolicyOverride;
    if (hasProperty(contact, 'notificationTriggerPolicyOverride')) {
        if (contact.notificationTriggerPolicyOverride === undefined) {
            // Reset to undefined -> Default
            notificationTriggerPolicyOverride = DEFAULT_NOTIFICATION_TRIGGER_POLICY_OVERRIDE;
        } else {
            // Specific policy
            let expiresAt;
            if (contact.notificationTriggerPolicyOverride.expiresAt !== undefined) {
                expiresAt = intoUnsignedLong(
                    dateToUnixTimestampMs(contact.notificationTriggerPolicyOverride.expiresAt),
                );
            }
            notificationTriggerPolicyOverride = protobuf.utils.creator(
                protobuf.sync.Contact.NotificationTriggerPolicyOverride,
                {
                    default: undefined,
                    policy: protobuf.utils.creator(
                        protobuf.sync.Contact.NotificationTriggerPolicyOverride.Policy,
                        {
                            policy: contact.notificationTriggerPolicyOverride.policy,
                            expiresAt,
                        },
                    ),
                },
            );
        }
    }

    // Prepare notification sound policy override
    let notificationSoundPolicyOverride;
    if (hasProperty(contact, 'notificationSoundPolicyOverride')) {
        if (contact.notificationSoundPolicyOverride === undefined) {
            // Reset to undefined -> Default
            notificationSoundPolicyOverride = DEFAULT_NOTIFICATION_SOUND_POLICY_OVERRIDE;
        } else {
            notificationSoundPolicyOverride = protobuf.utils.creator(
                protobuf.sync.Contact.NotificationSoundPolicyOverride,
                {
                    default: undefined,
                    policy: contact.notificationSoundPolicyOverride,
                },
            );
        }
    }

    return protobuf.utils.creator(protobuf.d2d.ContactSync, {
        create: undefined,
        update: protobuf.utils.creator(protobuf.d2d.ContactSync.Update, {
            contact: protobuf.utils.creator(protobuf.sync.Contact, {
                identity,
                publicKey: undefined,
                createdAt: contact.createdAt
                    ? intoUnsignedLong(dateToUnixTimestampMs(contact.createdAt))
                    : undefined,
                firstName: contact.firstName,
                lastName: contact.lastName,
                nickname: contact.nickname,
                verificationLevel: contact.verificationLevel,
                workVerificationLevel: contact.workVerificationLevel,
                identityType: contact.identityType,
                acquaintanceLevel: contact.acquaintanceLevel,
                activityState: contact.activityState,
                featureMask: contact.featureMask,
                syncState: contact.syncState,
                readReceiptPolicyOverride,
                typingIndicatorPolicyOverride,
                notificationTriggerPolicyOverride,
                notificationSoundPolicyOverride,
                conversationCategory: undefined,
                conversationVisibility: undefined,

                // Note: Profile pictures are currently synced through a separate update, since
                // they're not part of the {@link ContactUpdate}.
                contactDefinedProfilePicture: undefined,
                userDefinedProfilePicture: undefined,
            }),
        }),
        delete: undefined,
    });
}

async function getD2dContactSyncUpdateProfilePicture(
    identity: IdentityString,
    profilePicture: ProfilePictureUpdate,
    services: Pick<ServicesForTasks, 'blob' | 'crypto'>,
): Promise<protobuf.d2d.ContactSync> {
    // Prepare profile pictures
    let userDefinedProfilePicture;
    let contactDefinedProfilePicture;
    switch (profilePicture.source) {
        case TriggerSource.LOCAL:
            if (profilePicture.profilePictureUserDefined === undefined) {
                // Sync user-defined profile picture removal
                userDefinedProfilePicture = protobuf.utils.creator(protobuf.common.DeltaImage, {
                    removed: protobuf.UNIT_MESSAGE,
                    updated: undefined,
                });
            } else {
                // Encrypt and upload blob
                const blobInfo = await encryptAndUploadBlob(
                    services,
                    profilePicture.profilePictureUserDefined,
                    BLOB_FILE_NONCE,
                    'local',
                );

                // Sync user-defined profile picture update
                userDefinedProfilePicture = protobuf.utils.creator(protobuf.common.DeltaImage, {
                    removed: undefined,
                    updated: protobuf.utils.creator(protobuf.common.Image, {
                        type: protobuf.common.Image.Type.JPEG,
                        blob: protobuf.utils.creator(protobuf.common.Blob, {
                            id: blobInfo.id as ReadonlyUint8Array as Uint8Array,
                            nonce: undefined, // Obvious from context, may be omitted
                            key: blobInfo.key.unwrap() as Uint8Array,
                            uploadedAt: undefined, // Only relevant for own profile picture
                        }),
                    }),
                });
            }
            break;
        case TriggerSource.REMOTE:
            if (profilePicture.profilePictureContactDefined === undefined) {
                // Sync contact-defined profile picture removal
                contactDefinedProfilePicture = protobuf.utils.creator(protobuf.common.DeltaImage, {
                    removed: protobuf.UNIT_MESSAGE,
                    updated: undefined,
                });
            } else {
                // Sync contact-defined profile picture update
                contactDefinedProfilePicture = protobuf.utils.creator(protobuf.common.DeltaImage, {
                    removed: undefined,
                    updated: protobuf.utils.creator(protobuf.common.Image, {
                        type: protobuf.common.Image.Type.JPEG,
                        blob: protobuf.utils.creator(protobuf.common.Blob, {
                            id: profilePicture.profilePictureContactDefined
                                .blobId as ReadonlyUint8Array as Uint8Array,
                            nonce: undefined, // Obvious from context, may be omitted
                            key: profilePicture.profilePictureContactDefined.blobKey.unwrap() as Uint8Array,
                            uploadedAt: undefined, // Unknown, only relevant for own profile picture
                        }),
                    }),
                });
            }
            break;
        default:
            unreachable(profilePicture);
    }

    return protobuf.utils.creator(protobuf.d2d.ContactSync, {
        create: undefined,
        update: protobuf.utils.creator(protobuf.d2d.ContactSync.Update, {
            contact: protobuf.utils.creator(protobuf.sync.Contact, {
                identity,
                contactDefinedProfilePicture,
                userDefinedProfilePicture,

                // Other properties remain unchanged
                publicKey: undefined,
                createdAt: undefined,
                firstName: undefined,
                lastName: undefined,
                nickname: undefined,
                verificationLevel: undefined,
                workVerificationLevel: undefined,
                identityType: undefined,
                acquaintanceLevel: undefined,
                activityState: undefined,
                featureMask: undefined,
                syncState: undefined,
                readReceiptPolicyOverride: undefined,
                typingIndicatorPolicyOverride: undefined,
                notificationTriggerPolicyOverride: undefined,
                notificationSoundPolicyOverride: undefined,
                conversationCategory: undefined,
                conversationVisibility: undefined,
            }),
        }),
        delete: undefined,
    });
}

function getD2dContactSyncDelete(identity: IdentityString): protobuf.d2d.ContactSync {
    return protobuf.utils.creator(protobuf.d2d.ContactSync, {
        create: undefined,
        update: undefined,
        delete: protobuf.utils.creator(protobuf.d2d.ContactSync.Delete, {
            deleteIdentity: identity,
        }),
    });
}

export interface ContactSyncCreate {
    readonly type: 'create';
    readonly contact: ContactInit;
}
export interface ContactSyncUpdateData {
    readonly type: 'update-contact-data';
    readonly identity: IdentityString;
    readonly contact: ContactUpdate;
}
export interface ContactSyncUpdateProfilePicture {
    readonly type: 'update-profile-picture';
    readonly identity: IdentityString;
    readonly profilePicture: ProfilePictureUpdate;
}
export interface ContactSyncDelete {
    readonly type: 'delete';
    readonly identity: IdentityString;
}
export type ContactSyncVariant =
    | ContactSyncCreate
    | ContactSyncUpdateData
    | ContactSyncUpdateProfilePicture
    | ContactSyncDelete;

/**
 * Reflect contact create/update/delete to other devices in the device group.
 *
 * This task can only be called when a transaction is already running.
 */
export class ReflectContactSyncTask
    implements ComposableTask<ActiveTaskCodecHandle<'volatile'>, void>
{
    private readonly _log: Logger;

    public constructor(
        private readonly _services: ServicesForTasks,
        transaction: TransactionRunning<TransactionScope.CONTACT_SYNC>, // Ensures transaction is running
        private readonly _variant: ContactSyncVariant,
    ) {
        const identity = _variant.type === 'create' ? _variant.contact.identity : _variant.identity;
        this._log = _services.logging.logger(
            `network.protocol.task.reflect-contact-sync.${identity}`,
        );
    }

    public async run(handle: ActiveTaskCodecHandle<'volatile'>): Promise<void> {
        const variant = this._variant;

        // Determine contact sync message and send it
        let contactSync;
        switch (variant.type) {
            case 'create':
                contactSync = getD2dContactSyncCreate(variant.contact);
                break;
            case 'update-contact-data':
                contactSync = getD2dContactSyncUpdateData(variant.identity, variant.contact);
                break;
            case 'update-profile-picture':
                contactSync = await getD2dContactSyncUpdateProfilePicture(
                    variant.identity,
                    variant.profilePicture,
                    this._services,
                );
                break;
            case 'delete':
                contactSync = getD2dContactSyncDelete(variant.identity);
                break;
            default:
                unreachable(variant);
        }
        this._log.info(`Syncing '${variant.type}' to other devices`);
        await handle.reflect([{contactSync}]);
    }
}
