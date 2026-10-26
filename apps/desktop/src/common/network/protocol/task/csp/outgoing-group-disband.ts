import {UTF8} from '@threema/ts-utils/codec/utf8';
import {dateToUnixTimestampMs} from '@threema/ts-utils/conversion/date-to-unix-timestamp-ms';
import {u64ToUnsignedLong} from '@threema/ts-utils/conversion/u64-to-unsigned-long';

import {CspE2eGroupControlType, GroupUserState, TransactionScope} from '~/common/enum';
import type {Logger} from '~/common/logging';
import type {Group} from '~/common/model';
import {groupDebugString} from '~/common/model/group';
import * as protobuf from '~/common/network/protobuf';
import {CspMessageFlags, D2mMessageFlags} from '~/common/network/protocol/flags';
import {
    ACTIVE_TASK,
    type ActiveTask,
    type ActiveTaskCodecHandle,
    type ActiveTaskSymbol,
    type ServicesForTasks,
} from '~/common/network/protocol/task';
import {OutgoingCspMessagesTask} from '~/common/network/protocol/task/csp/outgoing-csp-messages';
import {transactionCompleted} from '~/common/network/protocol/task/manager';
import {randomMessageId} from '~/common/network/protocol/utils';
import * as structbuf from '~/common/network/structbuf';

export class OutgoingGroupDisbandTask implements ActiveTask<void, 'persistent'> {
    public readonly type: ActiveTaskSymbol = ACTIVE_TASK;
    public readonly persist = true;
    public readonly transaction = undefined;

    private readonly _log: Logger;

    public constructor(
        private readonly _services: ServicesForTasks,
        private readonly _group: Group,
    ) {
        const groupString = groupDebugString(
            this._services.device.identity.string,
            this._group.view.groupId,
        );
        this._log = this._services.logging.logger(
            `network.protocol.task.outgoing-group-disband-task.${groupString}`,
        );
    }

    public async run(handle: ActiveTaskCodecHandle<'persistent'>): Promise<void> {
        const messageId = randomMessageId(this._services.crypto);

        const transactionResult = await handle.transaction(
            TransactionScope.GROUP_SYNC,
            // Precondition: If the group exists and is not marked as left, log an error that a
            // major group state inconsistency has been detected and abort these steps.
            () => {
                const group = this._services.model.groups.getByGroupIdAndCreator(
                    this._group.view.groupId,
                    this._services.device.identity.string,
                );
                return group === undefined || group.get().view.userState !== GroupUserState.MEMBER;
            },
            async () => {
                await new OutgoingCspMessagesTask(this._services, [
                    {
                        receiver: {main: this._group},
                        sharedMessageProperties: {
                            allowUserProfileDistribution: true,
                            createdAt: new Date(),
                            messageId,
                            overrideReflectedProperty: false,
                        },
                        specifics: {
                            default: {
                                encoder: structbuf.bridge.encoder(
                                    structbuf.csp.e2e.GroupCreatorContainer,
                                    {
                                        groupId: this._group.view.groupId,
                                        innerData: structbuf.bridge.encoder(
                                            structbuf.csp.e2e.GroupSetup,
                                            {members: []},
                                        ),
                                    },
                                ),
                                messageProperties: {
                                    type: CspE2eGroupControlType.GROUP_SETUP,

                                    cspMessageFlags: CspMessageFlags.none(),
                                },
                            },
                        },
                    },
                ]).run(handle);

                const encoder = structbuf.bridge.encoder(structbuf.csp.e2e.GroupMemberContainer, {
                    groupId: this._group.view.groupId,
                    creatorIdentity: UTF8.encode(this._services.device.identity.string),
                    innerData: structbuf.bridge.encoder(structbuf.csp.e2e.GroupLeave, {}),
                });

                // For iOS, we need to reflect a simple `group-leave` here for compatibility reasons
                // with D2D version V0.1.
                const reflectMessage = {
                    envelope: {
                        outgoingMessage: protobuf.utils.creator(protobuf.d2d.OutgoingMessage, {
                            conversation: protobuf.utils.creator(protobuf.d2d.ConversationId, {
                                contact: undefined,
                                group: protobuf.utils.creator(protobuf.common.GroupIdentity, {
                                    creatorIdentity: this._services.device.identity.string,
                                    groupId: u64ToUnsignedLong(this._group.view.groupId),
                                }),
                                distributionList: undefined,
                            }),
                            messageId: u64ToUnsignedLong(randomMessageId(this._services.crypto)),
                            threadMessageId: undefined, // TODO(DESK-296): Set thread message ID
                            createdAt: u64ToUnsignedLong(dateToUnixTimestampMs(new Date())),
                            type: CspE2eGroupControlType.GROUP_LEAVE,
                            body: encoder.encode(new Uint8Array(encoder.byteLength())),
                            nonces: [],
                        }),
                    },
                    flags: D2mMessageFlags.none(),
                };
                await handle.reflect([reflectMessage]);
            },
        );

        if (!transactionCompleted(transactionResult[0])) {
            this._log.error(
                'Could not finish transaction, a major group inconsistency has been detected.',
            );
        }
    }
}
