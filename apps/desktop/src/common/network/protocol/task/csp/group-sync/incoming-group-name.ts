/**
 * Incoming group name task.
 */
import {u64ToHexLe} from '@threema/ts-utils/conversion/u64-to-hex-le';

import {GroupUserState, TransactionScope} from '~/common/enum';
import type {Logger} from '~/common/logging';
import type {Contact, ContactInit} from '~/common/model';
import {groupDebugString} from '~/common/model/group';
import {ModelStore} from '~/common/model/utils/model-store';
import * as protobuf from '~/common/network/protobuf';
import {D2mMessageFlags} from '~/common/network/protocol/flags';
import type {
    ActiveTaskCodecHandle,
    ComposableTask,
    ServicesForTasks,
} from '~/common/network/protocol/task';
import {commonGroupReceiveSteps} from '~/common/network/protocol/task/common/group-helpers';
import {getD2dGroupSyncUpdate} from '~/common/network/protocol/task/d2d/group-sync-helper';
import {transactionCompleted} from '~/common/network/protocol/task/manager';
import type {GroupCreatorContainer, GroupName} from '~/common/network/structbuf/validate/csp/e2e';
import type {IdentityString, MessageId} from '~/common/network/types';
/**
 * Receive and process incoming group name messages.
 */
export class IncomingGroupNameTask
    implements ComposableTask<ActiveTaskCodecHandle<'volatile'>, void>
{
    private readonly _log: Logger;
    private readonly _senderIdentity: IdentityString;
    private readonly _groupDebugString: string;

    public constructor(
        private readonly _services: ServicesForTasks,
        messageId: MessageId,
        private readonly _senderContactOrInit: ModelStore<Contact> | ContactInit,
        private readonly _container: GroupCreatorContainer.Type,
        private readonly _groupName: GroupName.Type,
        private readonly _createdAt: Date,
    ) {
        const messageIdHex = u64ToHexLe(messageId);
        this._log = _services.logging.logger(`network.protocol.task.in-group-name.${messageIdHex}`);
        if (_senderContactOrInit instanceof ModelStore) {
            this._senderIdentity = _senderContactOrInit.get().view.identity;
        } else {
            this._senderIdentity = _senderContactOrInit.identity;
        }
        this._groupDebugString = groupDebugString(this._senderIdentity, _container.groupId);
    }

    public async run(handle: ActiveTaskCodecHandle<'volatile'>): Promise<void> {
        this._log.info(
            `Processing group name from ${this._senderIdentity} for group ${this._groupDebugString}`,
        );

        // Extract relevant fields
        const creatorIdentity = this._senderIdentity;
        const groupId = this._container.groupId;
        const groupName = this._groupName.name;

        // 1. Run the Common Group Receive Steps. If the message has been discarded, abort these
        //   steps.
        const receiveStepsResult = await commonGroupReceiveSteps(
            groupId,
            creatorIdentity,
            this._senderContactOrInit,
            handle,
            this._services,
            this._log,
        );
        if (receiveStepsResult === undefined) {
            this._log.debug(
                'Aborting processing of group message after common group receive steps.',
            );
            return;
        }

        // 2. Let group be a snapshot of the current group state.
        const group = receiveStepsResult.group.get();
        const currentGroupName = group.view.name;

        // 3. If group.name equals name (i.e. no change), discard the message and abort these steps.
        if (groupName === currentGroupName) {
            return;
        }

        // 4.1 Begin a transaction with scope GROUP_SYNC
        const [transactionResult] = await handle.transaction(
            TransactionScope.GROUP_SYNC,
            // 4.1.1 (Precondition) If the group does not exist or the group is marked as left.
            () => {
                const group_ = this._services.model.groups.getByGroupIdAndCreator(
                    groupId,
                    creatorIdentity,
                );
                return (
                    group_ !== undefined && group_.get().view.userState === GroupUserState.MEMBER
                );
            },
            async () => {
                // 4.2 Let group be a snapshot of the current group state.
                const currentGroupName_ = group.view.name;
                // 4.3 If group.name equals name, log a warning that a group sync race occurred.
                if (currentGroupName_ === groupName) {
                    this._log.warn('A group sync race ocurred, the name was already set.');
                }

                // 4.4 Reflect a `GroupSync.Update` with `group` set to contain `name` set to `name`.
                await handle.reflect([
                    {
                        envelope: {
                            groupSync: getD2dGroupSyncUpdate(
                                {creatorIdentity, groupId},
                                {view: group.view, update: {name: groupName}},
                            ),
                            protocolVersion: protobuf.d2d.ProtocolVersion.V0_2,
                        },
                        flags: D2mMessageFlags.none(),
                    },
                ]);
            },
        );

        // 4.1.1 (Precondition failed) If the group does not exist or the group is marked as left,
        // log a warning that a group sync race occurred, discard the message and abort these steps.
        if (!transactionCompleted(transactionResult)) {
            this._log.warn(
                'Transaction was aborted by precondition because a group sync race occurred. Not persisting name change to the database',
            );
            return;
        }

        // 5. Update the group's name with `name`.
        await group.controller.name.fromRemote(handle, groupName, this._createdAt);
        this._log.info(`Group ${this._groupDebugString} name updated to "${groupName}"`);
    }
}
