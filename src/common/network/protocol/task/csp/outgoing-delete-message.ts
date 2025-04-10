import {CspE2eGroupMessageUpdateType, CspE2eMessageUpdateType, ReceiverType} from '~/common/enum';
import type {Logger} from '~/common/logging';
import type {AnyReceiver, AnyOutboundNonDeletedMessageModelStore} from '~/common/model';
import {getIdentityString} from '~/common/model/contact';
import * as protobuf from '~/common/network/protobuf';
import {CspMessageFlags} from '~/common/network/protocol/flags';
import {
    ACTIVE_TASK,
    type ActiveTask,
    type ActiveTaskCodecHandle,
    type ActiveTaskSymbol,
    type ServicesForTasks,
} from '~/common/network/protocol/task';
import {OutgoingCspMessagesTask} from '~/common/network/protocol/task/csp/outgoing-csp-messages';
import {randomMessageId} from '~/common/network/protocol/utils';
import * as structbuf from '~/common/network/structbuf';
import {assert, unreachable} from '~/common/utils/assert';
import {UTF8} from '~/common/utils/codec';
import {intoUnsignedLong, u64ToHexLe} from '~/common/utils/number';

export class OutgoingDeleteMessageTask<TReceiver extends AnyReceiver>
    implements ActiveTask<void, 'persistent'>
{
    public readonly type: ActiveTaskSymbol = ACTIVE_TASK;
    public readonly persist = true;
    public readonly transaction = undefined;

    private readonly _log: Logger;

    public constructor(
        private readonly _services: ServicesForTasks,
        private readonly _receiverModel: TReceiver,
        private readonly _messageModelStore: AnyOutboundNonDeletedMessageModelStore,
        private readonly _deletedAt: Date,
    ) {
        // Instantiate logger
        const messageIdHex = u64ToHexLe(this._messageModelStore.get().view.id);
        this._log = _services.logging.logger(`network.protocol.task.out-message.${messageIdHex}`);
    }

    public async run(handle: ActiveTaskCodecHandle<'persistent'>): Promise<void> {
        // Ensure that message was already sent, otherwise it cannot be remote-deleted
        const messageModel = this._messageModelStore.get();
        assert(
            messageModel.view.sentAt !== undefined,
            'Cannot delete a message that has not been sent yet',
        );

        const encoder = protobuf.utils.encoder(protobuf.csp_e2e.DeleteMessage, {
            messageId: intoUnsignedLong(messageModel.view.id),
        });

        const sharedMessageProperties = {
            messageId: randomMessageId(this._services.crypto),
            createdAt: this._deletedAt,
            allowUserProfileDistribution: false,
        };

        const cspMessageFlags = CspMessageFlags.fromPartial({
            sendPushNotification: true,
        });

        // Note: Here, we assume that a feature mask check has actually changed anything have
        // already happened.
        let task;
        switch (this._receiverModel.type) {
            case ReceiverType.CONTACT: {
                task = new OutgoingCspMessagesTask(this._services, [
                    {
                        receiver: this._receiverModel,
                        sharedMessageProperties,
                        specifics: {
                            default: {
                                encoder,
                                messageProperties: {
                                    cspMessageFlags,
                                    type: CspE2eMessageUpdateType.DELETE_MESSAGE,
                                },
                            },
                        },
                    },
                ]);

                break;
            }
            case ReceiverType.GROUP: {
                const groupEncoder = structbuf.bridge.encoder(
                    structbuf.csp.e2e.GroupMemberContainer,
                    {
                        groupId: this._receiverModel.view.groupId,
                        creatorIdentity: UTF8.encode(
                            getIdentityString(
                                this._services.device,
                                this._receiverModel.view.creator,
                            ),
                        ),
                        innerData: encoder,
                    },
                );

                task = new OutgoingCspMessagesTask(this._services, [
                    {
                        receiver: this._receiverModel,
                        sharedMessageProperties,
                        specifics: {
                            default: {
                                encoder: groupEncoder,
                                messageProperties: {
                                    cspMessageFlags,
                                    type: CspE2eGroupMessageUpdateType.GROUP_DELETE_MESSAGE,
                                },
                            },
                        },
                    },
                ]);

                break;
            }
            case ReceiverType.DISTRIBUTION_LIST:
                // TODO(DESK-597): Distribution lists
                this._log.warn('Distribution lists not implemented yet');
                return;
            default:
                unreachable(this._receiverModel);
        }

        await task.run(handle);
    }
}
