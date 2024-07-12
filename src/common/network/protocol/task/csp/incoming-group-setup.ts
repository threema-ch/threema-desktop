import type {GroupUserState} from '~/common/enum';
import type {Contact, Group, GroupInit} from '~/common/model';
import type {LocalModelStore} from '~/common/model/utils/model-store';
import * as protobuf from '~/common/network/protobuf';
import type {ActiveTaskCodecHandle, ServicesForTasks} from '~/common/network/protocol/task';
import {addGroupContacts} from '~/common/network/protocol/task/common/group-helpers';
import {GroupSetupTaskBase} from '~/common/network/protocol/task/common/group-setup';
import type {GroupCreatorContainer, GroupSetup} from '~/common/network/structbuf/validate/csp/e2e';
import type {IdentityString, MessageId} from '~/common/network/types';

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
        private readonly _createdAt: Date,
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
    protected async _kicked(
        handle: ActiveTaskCodecHandle<'volatile'>,
        group: Group,
    ): Promise<void> {
        await group.controller.kicked.fromRemote(handle, this._createdAt);
    }

    /** @inheritdoc */
    protected async _setMembers(
        handle: ActiveTaskCodecHandle<'volatile'>,
        group: Group,
        members: LocalModelStore<Contact>[],
        newUserState?: GroupUserState.MEMBER,
    ): Promise<void> {
        await group.controller.setMembers.fromRemote(
            handle,
            members,
            this._createdAt,
            newUserState,
        );
    }

    /** @inheritdoc */
    protected async _addGroup(
        handle: ActiveTaskCodecHandle<'volatile'>,
        init: Omit<GroupInit, 'createdAt'>,
        members: LocalModelStore<Contact>[],
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
            members,
        );
    }

    /** @inheritdoc */
    protected async _handleMissingGroupMembers(
        handle: ActiveTaskCodecHandle<'volatile'>,
        identitiesToAdd: IdentityString[],
    ): Promise<LocalModelStore<Contact>[]> {
        return await addGroupContacts(identitiesToAdd, handle, this._services, this._log);
    }
}
