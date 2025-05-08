import {ReceiverType} from '~/common/enum';
import type {Logger} from '~/common/logging';
import type {Contact, Group, GroupInit, ProfilePicture} from '~/common/model';
import {deactivateAndPurgeCacheCascade} from '~/common/model/conversation';
import type {ModelStore} from '~/common/model/utils/model-store';
import * as protobuf from '~/common/network/protobuf';
import type {DeltaImage} from '~/common/network/protobuf/validate/common';
import type {TypeCreate} from '~/common/network/protobuf/validate/sync/group';
import {downloadAndDecryptBlob} from '~/common/network/protocol/blob';
import {BLOB_FILE_NONCE} from '~/common/network/protocol/constants';
import {
    PASSIVE_TASK,
    type PassiveTask,
    type PassiveTaskCodecHandle,
    type PassiveTaskSymbol,
    type ServicesForTasks,
} from '~/common/network/protocol/task';
import {assert, unreachable} from '~/common/utils/assert';
import {idColorIndex} from '~/common/utils/id-color';
import {filterUndefinedProperties} from '~/common/utils/object';
import {mapValitaDefaultsToUndefined} from '~/common/utils/valita-helpers';

export class ReflectedGroupSyncTask implements PassiveTask<void> {
    public readonly type: PassiveTaskSymbol = PASSIVE_TASK;
    public readonly persist = false;
    private readonly _log: Logger;

    public constructor(
        private readonly _services: ServicesForTasks,
        private readonly _message: protobuf.d2d.GroupSync,
        private readonly _reflectedAt: Date,
    ) {
        this._log = _services.logging.logger(`network.protocol.task.in-group-sync`);
    }

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
            case 'create': {
                await this._createGroupFromGroupSyncCreate(handle, validatedMessage.create.group);
                return;
            }
            case 'delete':
                {
                    groupIdentity = validatedMessage.delete.groupIdentity;
                    const group = model.groups.getByGroupIdAndCreator(
                        groupIdentity.groupId,
                        groupIdentity.creatorIdentity,
                    );
                    if (group === undefined) {
                        this._log.error(
                            'Trying to delete a group that does not exist, discarding the message',
                        );
                        return;
                    }

                    const conversation = group.get().controller.conversation();
                    // If we get a group delete, the group is deleted from the database in any case
                    // so the user state does not matter.
                    this._services.model.groups.remove.fromSync(handle, group.ctx);
                    deactivateAndPurgeCacheCascade(
                        {type: ReceiverType.GROUP, uid: group.ctx},
                        conversation,
                    );
                }
                return;
            case 'update':
                {
                    groupIdentity = validatedMessage.update.group.groupIdentity;
                    const group = model.groups.getByGroupIdAndCreator(
                        groupIdentity.groupId,
                        groupIdentity.creatorIdentity,
                    );
                    if (group === undefined) {
                        this._log.error("Discarding 'update' message for unknown group");
                        return;
                    }
                    // TODO(DESK-1657): Make use of groupSync.update.memberStateChanges
                    await this._updateGroupFromD2dSync(
                        handle,
                        group,
                        validatedMessage.update.group,
                    );
                }
                break;
            default:
                unreachable(validatedMessage);
        }
    }

    private async _createGroupFromGroupSyncCreate(
        handle: PassiveTaskCodecHandle,
        groupCreate: TypeCreate,
    ): Promise<void> {
        const creator =
            groupCreate.groupIdentity.creatorIdentity === this._services.device.identity.string
                ? 'me'
                : this._services.model.contacts.getByIdentity(
                      groupCreate.groupIdentity.creatorIdentity,
                  );

        assert(
            creator !== undefined,
            'The creator of a group reflected by GroupSync.Create must exist in the database',
        );

        const memberSet = new Set<ModelStore<Contact>>();
        const members = groupCreate.memberIdentities.identities;

        for (const member of members) {
            const memberModelStore = this._services.model.contacts.getByIdentity(member);
            assert(
                memberModelStore !== undefined,
                'Member specified in reflected groupSync.create must exist locally.',
            );
            memberSet.add(memberModelStore);
        }

        const overrideProperties = mapValitaDefaultsToUndefined(
            filterUndefinedProperties({
                notificationTriggerPolicyOverride: groupCreate.notificationTriggerPolicyOverride,
                notificationSoundPolicyOverride: groupCreate.notificationSoundPolicyOverride,
            }),
        );

        const init: GroupInit = {
            category: groupCreate.conversationCategory,
            createdAt: groupCreate.createdAt,
            colorIndex: idColorIndex({type: ReceiverType.GROUP, ...groupCreate.groupIdentity}),
            creator,
            groupId: groupCreate.groupIdentity.groupId,
            name: groupCreate.name,
            userState: groupCreate.userState,
            visibility: groupCreate.conversationVisibility,
            lastUpdate: this._reflectedAt,
            notificationSoundPolicyOverride: overrideProperties.notificationSoundPolicyOverride,
            notificationTriggerPolicyOverride: overrideProperties.notificationTriggerPolicyOverride,
        };

        const group = this._services.model.groups.add.fromSync(handle, init, [...memberSet]);

        if (groupCreate.profilePicture === undefined) {
            return;
        }

        await this._persistProfilePictureChanges(
            handle,
            groupCreate.profilePicture,
            group.get().controller.profilePicture,
        );
    }

    /**
     * Update a group from D2D sync.
     */
    private async _updateGroupFromD2dSync(
        handle: PassiveTaskCodecHandle,
        group: ModelStore<Group>,
        update: protobuf.validate.sync.Group.TypeUpdate,
    ): Promise<void> {
        const controller = group.get().controller;

        const propertiesToUpdate = mapValitaDefaultsToUndefined(
            filterUndefinedProperties({
                notificationTriggerPolicyOverride: update.notificationTriggerPolicyOverride,
                notificationSoundPolicyOverride: update.notificationSoundPolicyOverride,
                name: update.name,
                userState: update.userState,
            }),
        );

        // TODO(DESK-1657): Make use of groupSync.update.memberStateChanges
        const members = update.memberIdentities?.identities;

        // Only update members if specified by the update message
        if (members !== undefined) {
            const memberUpdates: ModelStore<Contact>[] = [];
            for (const member of members) {
                const memberModelStore = this._services.model.contacts.getByIdentity(member);
                assert(
                    memberModelStore !== undefined,
                    'Member specified in reflected groupSync.update must exist locally.',
                );
                memberUpdates.push(memberModelStore);
            }

            controller.setMembers.fromSync(handle, memberUpdates, this._reflectedAt);
        }

        controller.update.fromSync(handle, propertiesToUpdate, this._reflectedAt);

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

        // No profile picture to update
        if (update.profilePicture === undefined) {
            return;
        }

        // Finally update the profile picture
        await this._persistProfilePictureChanges(
            handle,
            update.profilePicture,
            controller.profilePicture,
        );
    }

    private async _persistProfilePictureChanges(
        handle: PassiveTaskCodecHandle,
        profilePicture: DeltaImage.Type,
        profilePictureModelStore: ModelStore<ProfilePicture>,
    ): Promise<void> {
        // Group profile picture updates are always `admin-defined`.
        switch (profilePicture.image) {
            case 'removed':
                profilePictureModelStore
                    .get()
                    .controller.removePicture.fromSync(handle, 'admin-defined');
                return;
            case 'updated': {
                const {id: blobId, key} = profilePicture.updated.blob;
                const blob = await downloadAndDecryptBlob(
                    this._services,
                    this._log,
                    blobId,
                    key,
                    BLOB_FILE_NONCE,
                    'public',
                    'local',
                );

                profilePictureModelStore
                    .get()
                    .controller.setPicture.fromSync(handle, blob, 'admin-defined');
                return;
            }
            default:
                unreachable(profilePicture);
        }
    }
}
