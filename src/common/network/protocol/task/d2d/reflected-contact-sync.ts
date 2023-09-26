import {ReceiverType} from '~/common/enum';
import type {Logger} from '~/common/logging';
import type {Contact, ProfilePicture, ProfilePictureSource} from '~/common/model';
import type {LocalModelStore} from '~/common/model/utils/model-store';
import * as protobuf from '~/common/network/protobuf';
import {common} from '~/common/network/protobuf/js';
import type {DeltaImage} from '~/common/network/protobuf/validate/common';
import {downloadAndDecryptBlob} from '~/common/network/protocol/blob';
import {BLOB_FILE_NONCE} from '~/common/network/protocol/constants';
import {
    PASSIVE_TASK,
    type PassiveTask,
    type PassiveTaskCodecHandle,
    type PassiveTaskSymbol,
    type ServicesForTasks,
} from '~/common/network/protocol/task';
import {type IdentityString, isIdentityString} from '~/common/network/types';
import {unreachable} from '~/common/utils/assert';
import {idColorIndex} from '~/common/utils/id-color';
import {filterUndefinedProperties} from '~/common/utils/object';
import {mapValitaDefaultsToUndefined} from '~/common/utils/valita-helpers';

type ProfilePictures = Pick<
    protobuf.validate.sync.Contact.TypeCreate,
    'contactDefinedProfilePicture' | 'userDefinedProfilePicture'
>;

export class ReflectedContactSyncTask implements PassiveTask<void> {
    public readonly type: PassiveTaskSymbol = PASSIVE_TASK;
    public readonly persist = false;
    private readonly _log: Logger;

    public constructor(
        private readonly _services: ServicesForTasks,
        private readonly _message: protobuf.d2d.ContactSync,
    ) {
        const identity =
            _message.create?.contact?.identity ??
            _message.update?.contact?.identity ??
            _message.delete?.deleteIdentity;
        this._log = _services.logging.logger(
            `network.protocol.task.in-contact-sync.${
                isIdentityString(identity) ? identity : 'unknown'
            }`,
        );
    }

    // eslint-disable-next-line @typescript-eslint/require-await
    public async run(handle: PassiveTaskCodecHandle): Promise<void> {
        const {model} = this._services;

        // Validate the Protobuf message
        let validatedMessage;
        try {
            validatedMessage = protobuf.validate.d2d.ContactSync.SCHEMA.parse(this._message);
        } catch (error) {
            this._log.error(
                `Discarding reflected ContactSync message due to validation error: ${error}`,
            );
            return;
        }
        this._log.info(`Processing contact sync message (${validatedMessage.action})`);

        // Get existing contact (if available)
        let identity;
        switch (validatedMessage.action) {
            case 'create':
                identity = validatedMessage.create.contact.identity;
                break;
            case 'update':
                identity = validatedMessage.update.contact.identity;
                break;
            case 'delete':
                identity = validatedMessage.delete.deleteIdentity;
                break;
            default:
                unreachable(validatedMessage);
        }
        const contact = model.contacts.getByIdentity(identity);

        // Execute contact message action
        switch (validatedMessage.action) {
            case 'create': {
                if (contact !== undefined) {
                    this._log.error("Discarding 'create' message, contact already exists");
                    return;
                }
                try {
                    await this._createContactFromD2dSync(validatedMessage.create.contact);
                } catch (error) {
                    this._log.error(`Update to create contact: ${error}`);
                    return;
                }
                return;
            }

            case 'update': {
                if (contact === undefined) {
                    this._log.error("Discarding 'update' message for unknown contact");
                    return;
                }
                try {
                    await this._updateContactFromD2dSync(contact, validatedMessage.update.contact);
                } catch (error) {
                    this._log.error(`Update to update contact: ${error}`);
                    return;
                }
                return;
            }

            case 'delete': {
                if (contact === undefined) {
                    this._log.error("Discarding 'delete' message for unknown contact");
                    return;
                }
                try {
                    contact.get().controller.remove.fromSync();
                } catch (error) {
                    this._log.error(
                        `Discarding 'delete' message, failed to remove contact: ${error}`,
                    );
                }
                return;
            }
            default:
                unreachable(validatedMessage);
        }
    }

    private async _processProfilePicture(
        profilePicture: LocalModelStore<ProfilePicture>,
        deltaImage: DeltaImage.Type,
        source: ProfilePictureSource,
    ): Promise<void> {
        // Handle updates
        if (deltaImage.updated !== undefined) {
            const image = deltaImage.updated;
            switch (image.type) {
                case common.Image.Type.JPEG:
                    break;
                default:
                    this._log.error(`Received unknown profile picture type: ${image.type}`);
                    return;
            }
            const decryptedBlobBytes = await downloadAndDecryptBlob(
                this._services,
                this._log,
                image.blob.id,
                image.blob.key,
                BLOB_FILE_NONCE,
                'local',
                'local',
            );
            profilePicture.get().controller.setPicture.fromSync(decryptedBlobBytes, source);
        }

        // Handle removal
        if (deltaImage.removed !== undefined) {
            profilePicture.get().controller.removePicture.fromSync(source);
        }
    }

    private async _processProfilePictures(
        identity: IdentityString,
        createOrUpdate: ProfilePictures,
        profilePicture: LocalModelStore<ProfilePicture>,
    ): Promise<void> {
        // Handle profile picture(s)
        const promises = [];
        if (createOrUpdate.contactDefinedProfilePicture !== undefined) {
            promises.push(
                this._processProfilePicture(
                    profilePicture,
                    createOrUpdate.contactDefinedProfilePicture,
                    'contact-defined',
                ),
            );
        }
        if (createOrUpdate.userDefinedProfilePicture !== undefined) {
            promises.push(
                this._processProfilePicture(
                    profilePicture,
                    createOrUpdate.userDefinedProfilePicture,
                    // TODO(DESK-1074): Remove logic below. Instead, ignore user-defined profile
                    //                  pictures for Gateway IDs.
                    identity.startsWith('*') ? 'gateway-defined' : 'user-defined',
                ),
            );
        }
        await Promise.all(promises);
    }

    private async _createContactFromD2dSync(
        create: protobuf.validate.sync.Contact.TypeCreate,
    ): Promise<void> {
        // Create contact
        const contact = this._services.model.contacts.add.fromSync(
            mapValitaDefaultsToUndefined({
                identity: create.identity,
                publicKey: create.publicKey,
                createdAt: create.createdAt,
                firstName: create.firstName ?? '',
                lastName: create.lastName ?? '',
                nickname: create.nickname,
                colorIndex: idColorIndex({type: ReceiverType.CONTACT, identity: create.identity}),
                verificationLevel: create.verificationLevel,
                workVerificationLevel: create.workVerificationLevel,
                identityType: create.identityType,
                acquaintanceLevel: create.acquaintanceLevel,
                activityState: create.activityState,
                featureMask: create.featureMask,
                syncState: create.syncState,
                notificationTriggerPolicyOverride: create.notificationTriggerPolicyOverride,
                notificationSoundPolicyOverride: create.notificationSoundPolicyOverride,
                typingIndicatorPolicyOverride: create.typingIndicatorPolicyOverride,
                readReceiptPolicyOverride: create.readReceiptPolicyOverride,
                category: create.conversationCategory,
                visibility: create.conversationVisibility,
            }),
        );

        await this._processProfilePictures(
            create.identity,
            create,
            contact.get().controller.profilePicture,
        );
    }

    private async _updateContactFromD2dSync(
        contact: LocalModelStore<Contact>,
        update: protobuf.validate.sync.Contact.TypeUpdate,
    ): Promise<void> {
        const controller = contact.get().controller;

        const propertiesToUpdate = mapValitaDefaultsToUndefined(
            filterUndefinedProperties({
                createdAt: update.createdAt,
                firstName: update.firstName,
                lastName: update.lastName,
                verificationLevel: update.verificationLevel,
                workVerificationLevel: update.workVerificationLevel,
                identityType: update.identityType,
                acquaintanceLevel: update.acquaintanceLevel,
                activityState: update.activityState,
                featureMask: update.featureMask,
                syncState: update.syncState,
                typingIndicatorPolicyOverride: update.typingIndicatorPolicyOverride,
                readReceiptPolicyOverride: update.readReceiptPolicyOverride,
                notificationTriggerPolicyOverride: update.notificationTriggerPolicyOverride,
                notificationSoundPolicyOverride: update.notificationSoundPolicyOverride,
                nickname: update.nickname,
            }),
        );

        controller.update.fromSync(propertiesToUpdate);

        if (update.conversationCategory !== undefined) {
            controller.conversation().get().controller.update({
                category: update.conversationCategory,
            });
        }
        if (update.conversationVisibility !== undefined) {
            controller.conversation().get().controller.update({
                visibility: update.conversationVisibility,
            });
        }

        await this._processProfilePictures(
            contact.get().view.identity,
            update,
            controller.profilePicture,
        );
    }
}
