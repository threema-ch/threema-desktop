import {type DbContactUid} from '~/common/db';
import {type Group, type GroupInit} from '~/common/model';
import * as protobuf from '~/common/network/protobuf';
import {type ActiveTaskCodecHandle, type ServicesForTasks} from '~/common/network/protocol/task';
import {addGroupContacts} from '~/common/network/protocol/task/common/group-helpers';
import {GroupSetupTaskBase} from '~/common/network/protocol/task/common/group-setup';
import {
    type GroupCreatorContainer,
    type GroupSetup,
} from '~/common/network/structbuf/validate/csp/e2e';
import {type IdentityString, type MessageId} from '~/common/network/types';

/**
 * Receive and process incoming group setup messages.
 *
 * Note: This task is responsible for reflecting the incoming group setup message, it will not be
 * handled by the incoming message task!
 */
export class IncomingGroupSetupTask extends GroupSetupTaskBase<ActiveTaskCodecHandle<'volatile'>> {
    public constructor(
        services: ServicesForTasks,
        messageId: MessageId,
        senderIdentity: IdentityString,
        container: GroupCreatorContainer.Type,
        groupSetup: GroupSetup.Type,
        private readonly _reflectGroupSetup: protobuf.d2d.IncomingMessage,
    ) {
        super(services, messageId, senderIdentity, container, groupSetup, 'in-group-setup');
    }

    /** @inheritdoc */
    protected async _reflectIncomingGroupSetup(
        handle: ActiveTaskCodecHandle<'volatile'>,
    ): Promise<Date> {
        const [reflectedAt] = await handle.reflect([
            new protobuf.d2d.Envelope({
                incomingMessage: this._reflectGroupSetup,
            }),
        ]);
        return reflectedAt;
    }

    /** @inheritdoc */
    protected async _kick(handle: ActiveTaskCodecHandle<'volatile'>, group: Group): Promise<void> {
        await group.controller.kick.fromRemote(handle);
    }

    /** @inheritdoc */
    protected async _join(handle: ActiveTaskCodecHandle<'volatile'>, group: Group): Promise<void> {
        await group.controller.join.fromRemote(handle);
    }

    /** @inheritdoc */
    protected async _setMembers(
        handle: ActiveTaskCodecHandle<'volatile'>,
        group: Group,
        memberUids: DbContactUid[],
    ): Promise<void> {
        await group.controller.members.set.fromRemote(handle, memberUids);
    }

    /** @inheritdoc */
    protected async _addGroup(
        handle: ActiveTaskCodecHandle<'volatile'>,
        init: Omit<GroupInit, 'createdAt'>,
        memberUids: DbContactUid[],
        reflectedAt: Date | undefined,
    ): Promise<void> {
        if (reflectedAt === undefined) {
            // This situation should never happen. If it does, log an error and fall back to "now"
            // which should be within milliseconds of the reflection timestamp.
            this._log.error('The reflectedAt timestamp is not defined, but should be');
            reflectedAt = new Date();
        }
        await this._services.model.groups.add.fromRemote(
            handle,
            {...init, createdAt: reflectedAt},
            memberUids,
        );
    }

    /** @inheritdoc */
    protected async _handleMissingGroupMembers(
        handle: ActiveTaskCodecHandle<'volatile'>,
        identitiesToAdd: IdentityString[],
    ): Promise<DbContactUid[]> {
        const createdContactStores = await addGroupContacts(
            identitiesToAdd,
            handle,
            this._services,
            this._log,
        );
        return createdContactStores.map((store) => store.get().ctx);
    }
}
