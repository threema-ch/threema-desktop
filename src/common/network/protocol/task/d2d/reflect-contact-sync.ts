import {type TransactionScope, TriggerSource} from '~/common/enum';
import type {Logger} from '~/common/logging';
import type {ContactInit, ContactUpdate} from '~/common/model';
import type {ConversationUpdateFromToSync} from '~/common/model/types/conversation';
import * as protobuf from '~/common/network/protobuf';
import {type BlobId, encryptAndUploadBlob} from '~/common/network/protocol/blob';
import {BLOB_FILE_NONCE} from '~/common/network/protocol/constants';
import {D2mMessageFlags} from '~/common/network/protocol/flags';
import type {
    ActiveTaskCodecHandle,
    ComposableTask,
    ServicesForTasks,
    TransactionRunning,
} from '~/common/network/protocol/task';
import type {IdentityString} from '~/common/network/types';
import type {RawBlobKey} from '~/common/network/types/keys';
import type {ReadonlyUint8Array} from '~/common/types';
import {unreachable} from '~/common/utils/assert';
import {dateToUnixTimestampMs, intoUnsignedLong} from '~/common/utils/number';
import {hasPropertyStrict} from '~/common/utils/object';

const DEFAULT_POLICY_OVERRIDE = {
    default: protobuf.UNIT_MESSAGE,
    policy: undefined,
} as const;

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const DEFAULT_READ_RECEIPT_POLICY_OVERRIDE = protobuf.utils.creator(
    protobuf.sync.Contact.ReadReceiptPolicyOverride,
    DEFAULT_POLICY_OVERRIDE,
);

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const DEFAULT_TYPING_INDICATOR_POLICY_OVERRIDE = protobuf.utils.creator(
    protobuf.sync.Contact.TypingIndicatorPolicyOverride,
    DEFAULT_POLICY_OVERRIDE,
);

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const DEFAULT_NOTIFICATION_TRIGGER_POLICY_OVERRIDE = protobuf.utils.creator(
    protobuf.sync.Contact.NotificationTriggerPolicyOverride,
    DEFAULT_POLICY_OVERRIDE,
);

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const DEFAULT_NOTIFICATION_SOUND_POLICY_OVERRIDE = protobuf.utils.creator(
    protobuf.sync.Contact.NotificationSoundPolicyOverride,
    DEFAULT_POLICY_OVERRIDE,
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
                featureMask: intoUnsignedLong(init.featureMask),
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
    update: ContactUpdate,
): protobuf.d2d.ContactSync {
    // Prepare read receipt policy override
    let readReceiptPolicyOverride;
    if (hasPropertyStrict(update, 'readReceiptPolicyOverride')) {
        if (update.readReceiptPolicyOverride === undefined) {
            // Reset to undefined -> Default
            readReceiptPolicyOverride = DEFAULT_READ_RECEIPT_POLICY_OVERRIDE;
        } else {
            readReceiptPolicyOverride = protobuf.utils.creator(
                protobuf.sync.Contact.ReadReceiptPolicyOverride,
                {
                    default: undefined,
                    policy: update.readReceiptPolicyOverride,
                },
            );
        }
    }

    // Prepare typing indicator policy override
    let typingIndicatorPolicyOverride;
    if (hasPropertyStrict(update, 'typingIndicatorPolicyOverride')) {
        if (update.typingIndicatorPolicyOverride === undefined) {
            // Reset to undefined -> Default
            typingIndicatorPolicyOverride = DEFAULT_TYPING_INDICATOR_POLICY_OVERRIDE;
        } else {
            typingIndicatorPolicyOverride = protobuf.utils.creator(
                protobuf.sync.Contact.TypingIndicatorPolicyOverride,
                {
                    default: undefined,
                    policy: update.typingIndicatorPolicyOverride,
                },
            );
        }
    }

    // Prepare notification trigger policy override
    let notificationTriggerPolicyOverride;
    if (hasPropertyStrict(update, 'notificationTriggerPolicyOverride')) {
        if (update.notificationTriggerPolicyOverride === undefined) {
            // Reset to undefined -> Default
            notificationTriggerPolicyOverride = DEFAULT_NOTIFICATION_TRIGGER_POLICY_OVERRIDE;
        } else {
            // Specific policy
            let expiresAt;
            if (update.notificationTriggerPolicyOverride.expiresAt !== undefined) {
                expiresAt = intoUnsignedLong(
                    dateToUnixTimestampMs(update.notificationTriggerPolicyOverride.expiresAt),
                );
            }
            notificationTriggerPolicyOverride = protobuf.utils.creator(
                protobuf.sync.Contact.NotificationTriggerPolicyOverride,
                {
                    default: undefined,
                    policy: protobuf.utils.creator(
                        protobuf.sync.Contact.NotificationTriggerPolicyOverride.Policy,
                        {
                            policy: update.notificationTriggerPolicyOverride.policy,
                            expiresAt,
                        },
                    ),
                },
            );
        }
    }

    // Prepare notification sound policy override
    let notificationSoundPolicyOverride;
    if (hasPropertyStrict(update, 'notificationSoundPolicyOverride')) {
        if (update.notificationSoundPolicyOverride === undefined) {
            // Reset to undefined -> Default
            notificationSoundPolicyOverride = DEFAULT_NOTIFICATION_SOUND_POLICY_OVERRIDE;
        } else {
            notificationSoundPolicyOverride = protobuf.utils.creator(
                protobuf.sync.Contact.NotificationSoundPolicyOverride,
                {
                    default: undefined,
                    policy: update.notificationSoundPolicyOverride,
                },
            );
        }
    }

    // Prepare nickname
    let nickname: string | undefined = undefined;
    if (hasPropertyStrict(update, 'nickname')) {
        if (update.nickname === undefined) {
            // To unset the nickname, an empty string must be sent
            nickname = '';
        } else {
            nickname = update.nickname;
        }
    }

    return protobuf.utils.creator(protobuf.d2d.ContactSync, {
        create: undefined,
        update: protobuf.utils.creator(protobuf.d2d.ContactSync.Update, {
            contact: protobuf.utils.creator(protobuf.sync.Contact, {
                identity,
                publicKey: undefined,
                createdAt:
                    update.createdAt !== undefined
                        ? intoUnsignedLong(dateToUnixTimestampMs(update.createdAt))
                        : undefined,
                firstName: update.firstName,
                lastName: update.lastName,
                nickname,
                verificationLevel: update.verificationLevel,
                workVerificationLevel: update.workVerificationLevel,
                identityType: update.identityType,
                acquaintanceLevel: update.acquaintanceLevel,
                activityState: update.activityState,
                featureMask:
                    update.featureMask !== undefined
                        ? intoUnsignedLong(update.featureMask)
                        : undefined,
                syncState: update.syncState,
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

function getD2dContactConversationSyncUpdateData(
    identity: IdentityString,
    conversation: ConversationUpdateFromToSync,
): protobuf.d2d.ContactSync {
    return protobuf.utils.creator(protobuf.d2d.ContactSync, {
        create: undefined,
        update: protobuf.utils.creator(protobuf.d2d.ContactSync.Update, {
            contact: protobuf.utils.creator(protobuf.sync.Contact, {
                identity,
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
                conversationCategory: conversation.category,
                conversationVisibility: conversation.visibility,
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
                            key: blobInfo.key.unwrap() as ReadonlyUint8Array as Uint8Array,
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
                            key: profilePicture.profilePictureContactDefined.blobKey.unwrap() as ReadonlyUint8Array as Uint8Array,
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

export interface ContactSyncCreate {
    readonly type: 'create';
    readonly contact: ContactInit;
}
export interface ContactSyncUpdateData {
    readonly type: 'update-contact-data';
    readonly identity: IdentityString;
    readonly contact: ContactUpdate;
}
export interface ContactConversationSyncUpdateData {
    readonly type: 'update-conversation-data';
    readonly identity: IdentityString;
    readonly conversation: ConversationUpdateFromToSync;
}
export interface ContactSyncUpdateProfilePicture {
    readonly type: 'update-profile-picture';
    readonly identity: IdentityString;
    readonly profilePicture: ProfilePictureUpdate;
}

export type ContactSyncVariant =
    | ContactSyncCreate
    | ContactSyncUpdateData
    | ContactConversationSyncUpdateData
    | ContactSyncUpdateProfilePicture;

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
            case 'update-conversation-data':
                contactSync = getD2dContactConversationSyncUpdateData(
                    variant.identity,
                    variant.conversation,
                );
                break;
            case 'update-profile-picture':
                contactSync = await getD2dContactSyncUpdateProfilePicture(
                    variant.identity,
                    variant.profilePicture,
                    this._services,
                );
                break;
            default:
                unreachable(variant);
        }
        this._log.info(`Syncing '${variant.type}' to other devices`);
        await handle.reflect([{envelope: {contactSync}, flags: D2mMessageFlags.none()}]);
    }
}
