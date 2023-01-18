import {ReceiverType} from '~/common/enum';
import {type Logger} from '~/common/logging';
import {type Contact} from '~/common/model';
import {type LocalModelStore} from '~/common/model/utils/model-store';
import * as protobuf from '~/common/network/protobuf';
import {
    type PassiveTask,
    type PassiveTaskCodecHandle,
    type PassiveTaskSymbol,
    type ServicesForTasks,
    PASSIVE_TASK,
} from '~/common/network/protocol/task';
import {isIdentityString} from '~/common/network/types';
import {unreachable} from '~/common/utils/assert';
import {idColorIndex} from '~/common/utils/id-color';
import {purgeUndefinedProperties} from '~/common/utils/object';

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
        this._log.info(`Received reflected contact sync message (${validatedMessage.action})`);

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
                    this._createContactFromD2dSync(validatedMessage.create.contact);
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
                    this._updateContactFromD2dSync(contact, validatedMessage.update.contact);
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

    private _createContactFromD2dSync(create: protobuf.validate.sync.Contact.CreateType): void {
        this._services.model.contacts.add.fromSync({
            identity: create.identity,
            publicKey: create.publicKey,
            createdAt: create.createdAt,
            firstName: create.firstName ?? '',
            lastName: create.lastName ?? '',
            nickname: create.nickname ?? '',
            colorIndex: idColorIndex({type: ReceiverType.CONTACT, identity: create.identity}),
            verificationLevel: create.verificationLevel,
            workVerificationLevel: create.workVerificationLevel,
            identityType: create.identityType,
            acquaintanceLevel: create.acquaintanceLevel,
            activityState: create.activityState,
            featureMask: create.featureMask,
            syncState: create.syncState,
            notificationTriggerPolicyOverride:
                create.notificationTriggerPolicyOverride.default !== undefined
                    ? undefined
                    : create.notificationTriggerPolicyOverride.policy,
            notificationSoundPolicyOverride:
                create.notificationSoundPolicyOverride.default !== undefined
                    ? undefined
                    : create.notificationSoundPolicyOverride.policy,
            category: create.conversationCategory,
            visibility: create.conversationVisibility,
        });

        // TODO(WEBMD-231): Supply contact- and user-defined profile pictures
    }

    private _updateContactFromD2dSync(
        contact: LocalModelStore<Contact>,
        update: protobuf.validate.sync.Contact.UpdateType,
    ): void {
        const controller = contact.get().controller;
        controller.update.fromSync(
            purgeUndefinedProperties({
                createdAt: update.createdAt,
                firstName: update.firstName,
                lastName: update.lastName,
                nickname: update.nickname,
                verificationLevel: update.verificationLevel,
                workVerificationLevel: update.workVerificationLevel,
                identityType: update.identityType,
                acquaintanceLevel: update.acquaintanceLevel,
                activityState: update.activityState,
                featureMask: update.featureMask,
                syncState: update.syncState,
                notificationTriggerPolicyOverride: update.notificationTriggerPolicyOverride?.policy,
                notificationSoundPolicyOverride: update.notificationSoundPolicyOverride?.policy,
            }),
        );
        if (
            update.conversationCategory !== undefined ||
            update.conversationVisibility !== undefined
        ) {
            controller.conversation().get().controller.update({
                category: update.conversationCategory,
                visibility: update.conversationVisibility,
            });
        }

        // TODO(WEBMD-231): Update contact- and user-defined profile pictures
    }
}
