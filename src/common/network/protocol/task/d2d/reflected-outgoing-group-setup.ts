import {
    ActivityState,
    ConversationCategory,
    ConversationVisibility,
    GroupUserState,
    ReceiverType,
} from '~/common/enum';
import {ProtocolError} from '~/common/error';
import type {Logger} from '~/common/logging';
import type {Contact} from '~/common/model';
import {groupDebugString} from '~/common/model/group';
import type {ModelStore} from '~/common/model/utils/model-store';
import type {
    ComposableTask,
    PassiveTaskCodecHandle,
    ServicesForTasks,
} from '~/common/network/protocol/task';
import type {GroupCreatorContainer, GroupSetup} from '~/common/network/structbuf/validate/csp/e2e';
import type {MessageId} from '~/common/network/types';
import {idColorIndex} from '~/common/utils/id-color';
import {u64ToHexLe} from '~/common/utils/number';

/**
 * Receive and process reflected outgoing group setup messages.
 *
 * Processing will not trigger side effects (e.g. reflection).
 */
export class ReflectedOutgoingGroupSetupTask
    implements ComposableTask<PassiveTaskCodecHandle, void>
{
    private readonly _log: Logger;
    private readonly _groupDebugString: string;

    public constructor(
        private readonly _services: ServicesForTasks,
        messageId: MessageId,
        private readonly _reflectedAt: Date,
        private readonly _container: GroupCreatorContainer.Type,
        private readonly _groupSetup: GroupSetup.Type,
    ) {
        const messageIdHex = u64ToHexLe(messageId);
        this._log = _services.logging.logger(
            `network.protocol.task.reflected-out-group-setup.${messageIdHex}`,
        );
        this._groupDebugString = groupDebugString(
            _services.device.identity.string,
            _container.groupId,
        );
    }

    public async run(handle: PassiveTaskCodecHandle): Promise<void> {
        const {device, directory, model} = this._services;

        this._log.info(
            `Processing reflected outgoing group setup for group ${this._groupDebugString}`,
        );

        // Extract relevant fields
        const creatorIdentity = device.identity.string; // We're the group creator
        const groupId = this._container.groupId;

        // Ensure that the creator is not part of the group member list
        const memberIdentities = new Set(this._groupSetup.members);
        memberIdentities.delete(creatorIdentity);

        // Look up group
        const group = model.groups
            .getByGroupIdAndCreator(groupId, this._services.device.identity.string)
            ?.get();

        // Look up group member contacts
        const memberContacts: ModelStore<Contact>[] = [];
        for (const identity of memberIdentities) {
            const contact = model.contacts.getByIdentity(identity);
            if (contact === undefined) {
                // If a contact is not known, the only possible reason is that the contact is revoked/invalid.
                const identityData = await directory.identity(identity);
                if (identityData.state === ActivityState.INVALID) {
                    // Contact is indeed invalid, ignore it and carry on
                    continue;
                }

                // TODO(DESK-859): Better handling of group state errors
                const errorMessage =
                    'Received reflected outgoing group setup for a group where not all contacts are known';
                this._log.error(errorMessage);
                this._log.debug(
                    `Group member ${identity} should have been available before the reflected outgoing group ${this._groupDebugString} setup message`,
                );

                // Throw unrecoverable state error.
                throw new ProtocolError(
                    'd2d',
                    `Application state is inconsistent: ${errorMessage}`,
                    'unrecoverable',
                );
            }
            memberContacts.push(contact);
        }

        // Update group if the group exists already
        if (group !== undefined) {
            // Update member list
            const previousUserState = group.view.userState;
            // If group was previously marked as left, re-join it.
            //
            // Note: This is not expected to happen, because a disbanded group cannot be reactivated
            //       in the UI. However, apply the update just to be on the safe side.
            group.controller.setMembers.fromSync(
                handle,
                memberContacts,
                this._reflectedAt,
                previousUserState !== GroupUserState.MEMBER ? GroupUserState.MEMBER : undefined,
            );
            this._log.info(`Group ${this._groupDebugString} member list updated`);
            if (previousUserState !== GroupUserState.MEMBER) {
                this._log.info(`Group ${this._groupDebugString} re-joined`);
            }
        } else {
            // Create new group
            model.groups.add.fromSync(
                handle,
                {
                    groupId,
                    creator: 'me',
                    createdAt: this._reflectedAt,
                    name: '', // Will be updated by group name message
                    colorIndex: idColorIndex({type: ReceiverType.GROUP, creatorIdentity, groupId}),
                    userState: GroupUserState.MEMBER,
                    category: ConversationCategory.DEFAULT,
                    visibility: ConversationVisibility.SHOW,
                },
                memberContacts,
            );
            this._log.info(
                `Group ${this._groupDebugString} with ${memberContacts.length + 1} member(s) added`,
            );
        }
    }
}
