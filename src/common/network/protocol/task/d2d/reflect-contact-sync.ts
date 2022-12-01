import {type TransactionScope} from '~/common/enum';
import {type Logger} from '~/common/logging';
import {type ContactInit, type ContactUpdate} from '~/common/model';
import * as protobuf from '~/common/network/protobuf';
import {
    type ActiveTaskCodecHandle,
    type ComposableTask,
    type ServicesForTasks,
    type TransactionRunning,
} from '~/common/network/protocol/task';
import {type IdentityString} from '~/common/network/types';
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
                // TODO(WEBMD-193): Set contact- and user-defined profile pictures
                contactDefinedProfilePicture: undefined,
                userDefinedProfilePicture: undefined,
                conversationCategory: init.category,
                conversationVisibility: init.visibility,
            }),
        }),
        update: undefined,
        delete: undefined,
    });
}

function getD2dContactSyncUpdate(
    identity: IdentityString,
    contact: ContactUpdate,
): protobuf.d2d.ContactSync {
    // TODO(WEBMD-612): Prepare read receipt policy override
    const readReceiptPolicyOverride = DEFAULT_READ_RECEIPT_POLICY_OVERRIDE;
    // TODO(WEBMD-780): Prepare typing indicator policy override
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
                // TODO(WEBMD-193): Set contact- and user-defined profile pictures
                contactDefinedProfilePicture: undefined,
                userDefinedProfilePicture: undefined,
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

export type ContactSyncVariant =
    | {readonly type: 'create'; readonly contact: ContactInit}
    | {readonly type: 'update'; readonly identity: IdentityString; readonly contact: ContactUpdate}
    | {readonly type: 'delete'; readonly identity: IdentityString};

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
        services: ServicesForTasks,
        transaction: TransactionRunning<TransactionScope.CONTACT_SYNC>, // Ensures transaction is running
        private readonly _variant: ContactSyncVariant,
    ) {
        const identity = _variant.type === 'create' ? _variant.contact.identity : _variant.identity;
        this._log = services.logging.logger(
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
            case 'update':
                contactSync = getD2dContactSyncUpdate(variant.identity, variant.contact);
                break;
            case 'delete':
                contactSync = getD2dContactSyncDelete(variant.identity);
                break;
            default:
                unreachable(variant);
        }
        this._log.debug(`Syncing '${variant.type}' to other devices`);
        await handle.reflect([{contactSync}]);
    }
}
