import {type DbContactUid} from '~/common/db';
import {ActivityState} from '~/common/enum';
import {ProtocolError} from '~/common/error';
import {type Group, type GroupInit} from '~/common/model';
import {type PassiveTaskCodecHandle, type ServicesForTasks} from '~/common/network/protocol/task';
import {GroupSetupTaskBase} from '~/common/network/protocol/task/common/group-setup';
import {
    type GroupCreatorContainer,
    type GroupSetup,
} from '~/common/network/structbuf/validate/csp/e2e';
import {type IdentityString, type MessageId} from '~/common/network/types';
import {assert} from '~/common/utils/assert';

/**
 * Receive and process reflected incoming group setup messages.
 *
 * Processing will not trigger side effects (e.g. reflection).
 */
export class ReflectedIncomingGroupSetupTask extends GroupSetupTaskBase<PassiveTaskCodecHandle> {
    public constructor(
        services: ServicesForTasks,
        messageId: MessageId,
        senderIdentity: IdentityString,
        private readonly _reflectedAt: Date,
        container: GroupCreatorContainer.Type,
        groupSetup: GroupSetup.Type,
    ) {
        super(
            services,
            messageId,
            senderIdentity,
            container,
            groupSetup,
            'reflected-in-group-setup',
        );
    }

    /** @inheritdoc */
    // eslint-disable-next-line @typescript-eslint/require-await
    protected async _reflectIncomingGroupSetup(handle: PassiveTaskCodecHandle): Promise<undefined> {
        // Nothing to reflect
    }

    /** @inheritdoc */
    // eslint-disable-next-line @typescript-eslint/require-await
    protected async _kick(handle: PassiveTaskCodecHandle, group: Group): Promise<void> {
        group.controller.kick.fromSync();
    }

    /** @inheritdoc */
    // eslint-disable-next-line @typescript-eslint/require-await
    protected async _join(handle: PassiveTaskCodecHandle, group: Group): Promise<void> {
        group.controller.join.fromSync();
    }

    /** @inheritdoc */
    // eslint-disable-next-line @typescript-eslint/require-await
    protected async _setMembers(
        handle: PassiveTaskCodecHandle,
        group: Group,
        memberUids: DbContactUid[],
    ): Promise<void> {
        group.controller.members.set.fromSync(memberUids);
    }

    /** @inheritdoc */
    // eslint-disable-next-line @typescript-eslint/require-await
    protected async _addGroup(
        handle: PassiveTaskCodecHandle,
        init: Omit<GroupInit, 'createdAt'>,
        memberUids: DbContactUid[],
    ): Promise<void> {
        this._services.model.groups.add.fromSync(
            {...init, createdAt: this._reflectedAt},
            memberUids,
        );
    }

    /** @inheritdoc */
    protected async _handleMissingGroupMembers(
        handle: PassiveTaskCodecHandle,
        identitiesToAdd: IdentityString[],
    ): Promise<DbContactUid[]> {
        // If a contact is not known, the only possible reason is that the contact is revoked/invalid.
        const identityData = await this._services.directory.identities(identitiesToAdd);
        for (const identity of identitiesToAdd) {
            const fetched = identityData[identity];
            assert(
                fetched !== undefined,
                `Directory lookup did not return information for all identities`,
            );
            if (fetched.state === ActivityState.INVALID) {
                this._log.warn(
                    `Group member ${identity} is invalid or revoked, not adding it to the database`,
                );
                continue;
            }

            // TODO(DESK-859): Better handling of group state errors
            const errorMessage =
                'Received reflected incoming group setup for a group where not all contacts are known';
            this._log.error(errorMessage);
            this._log.debug(
                `Group member ${identity} should have been available before the reflected incoming group ${this._groupDebugString} setup message`,
            );

            // Throw unrecoverable state error.
            throw new ProtocolError(
                'd2d',
                `Application state is inconsistent: ${errorMessage}`,
                'unrecoverable',
            );
        }
        return [];
    }
}
