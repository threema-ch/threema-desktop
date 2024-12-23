import type {Logger} from '~/common/logging';
import type {Group} from '~/common/model';
import type {ModelStore} from '~/common/model/utils/model-store';
import * as protobuf from '~/common/network/protobuf';
import {
    PASSIVE_TASK,
    type PassiveTask,
    type PassiveTaskCodecHandle,
    type PassiveTaskSymbol,
    type ServicesForTasks,
} from '~/common/network/protocol/task';
import {unreachable} from '~/common/utils/assert';
import {filterUndefinedProperties} from '~/common/utils/object';
import {mapValitaDefaultsToUndefined} from '~/common/utils/valita-helpers';

export class ReflectedGroupSyncTask implements PassiveTask<void> {
    public readonly type: PassiveTaskSymbol = PASSIVE_TASK;
    public readonly persist = false;
    private readonly _log: Logger;

    public constructor(
        private readonly _services: ServicesForTasks,
        private readonly _message: protobuf.d2d.GroupSync,
    ) {
        this._log = _services.logging.logger(`network.protocol.task.in-group-sync`);
    }

    // eslint-disable-next-line @typescript-eslint/require-await
    public async run(handle: PassiveTaskCodecHandle): Promise<void> {
        const {model} = this._services;

        // Validate the Protobuf message
        let validatedMessage;
        try {
            validatedMessage = protobuf.validate.d2d.GroupSync.SCHEMA.parse(this._message);
        } catch (error) {
            this._log.error(
                `Discarding reflected GroupSync message due to validation error: ${error}`,
            );
            return;
        }
        this._log.info(`Received reflected group sync message (${validatedMessage.action})`);

        // Get existing group (if available)
        let groupIdentity;
        switch (validatedMessage.action) {
            case 'create':
            case 'delete':
                this._log.warn(`Ignoring D2D group sync ${validatedMessage.action} message`);
                return;
            case 'update':
                groupIdentity = validatedMessage.update.group.groupIdentity;
                break;
            default:
                unreachable(validatedMessage);
        }

        const group = model.groups.getByGroupIdAndCreator(
            groupIdentity.groupId,
            groupIdentity.creatorIdentity,
        );

        // Execute group message action
        switch (validatedMessage.action) {
            case 'update': {
                if (group === undefined) {
                    this._log.error("Discarding 'update' message for unknown group");
                    return;
                }
                try {
                    this._updateGroupFromD2dSync(handle, group, validatedMessage.update.group);
                } catch (error) {
                    this._log.error(`Update to update group: ${error}`);
                    return;
                }
                return;
            }
            default:
                unreachable(validatedMessage.action);
        }
    }

    /**
     * Update a group from D2D sync.
     *
     * Most aspects of a group are not synchronized between devices via group sync, but through
     * reflected group control messages. The only fields that need to be taken into account are all
     * fields that are not part of the CSP group protocol:
     *
     * - notificationTriggerPolicyOverride
     * - notificationSoundPolicyOverride
     * - conversationCategory
     * - conversationVisibility
     */
    private _updateGroupFromD2dSync(
        handle: PassiveTaskCodecHandle,
        group: ModelStore<Group>,
        update: protobuf.validate.sync.Group.TypeUpdate,
    ): void {
        const controller = group.get().controller;

        const propertiesToUpdate = mapValitaDefaultsToUndefined(
            filterUndefinedProperties({
                notificationTriggerPolicyOverride: update.notificationTriggerPolicyOverride,
                notificationSoundPolicyOverride: update.notificationSoundPolicyOverride,
            }),
        );

        controller.update.fromSync(handle, propertiesToUpdate);

        if (update.conversationCategory !== undefined) {
            controller.conversation().get().controller.update.fromSync(handle, {
                category: update.conversationCategory,
            });
        }
        if (update.conversationVisibility !== undefined) {
            controller.conversation().get().controller.update.fromSync(handle, {
                visibility: update.conversationVisibility,
            });
        }
    }
}
