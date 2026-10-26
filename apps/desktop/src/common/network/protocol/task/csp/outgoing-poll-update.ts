import {UTF8} from '@threema/ts-utils/codec/utf8';
import {dateToUnixTimestampMs} from '@threema/ts-utils/number/date-to-unix-timestamp-ms';
import {u64ToUnsignedLong} from '@threema/ts-utils/number/into-unsigned-long';
import {u64ToHexLe} from '@threema/ts-utils/number/u64-to-hex-le';

import type {DbPollVoteFragment} from '~/common/db';
import {
    CspE2eConversationType,
    CspE2eGroupConversationType,
    MessageType,
    PollAnnounceType,
    ReceiverType,
} from '~/common/enum';
import type {Logger} from '~/common/logging';
import type {AnyReceiver, Contact, Conversation} from '~/common/model';
import {getIdentityString} from '~/common/model/contact';
import type {ModelStore} from '~/common/model/utils/model-store';
import * as protobuf from '~/common/network/protobuf';
import type {ProtobufInstanceOf} from '~/common/network/protobuf/utils';
import type {LayerEncoder, MessageTypeEncoders} from '~/common/network/protocol';
import {CspMessageFlags, D2mMessageFlags} from '~/common/network/protocol/flags';
import {
    type ActiveTask,
    type ActiveTaskSymbol,
    ACTIVE_TASK,
    type ServicesForTasks,
    type ActiveTaskCodecHandle,
} from '~/common/network/protocol/task';
import {
    OutgoingCspMessagesTask,
    type DynamicMessage,
    type IndividualMessageProperties,
} from '~/common/network/protocol/task/csp/outgoing-csp-messages';
import {randomMessageId} from '~/common/network/protocol/utils';
import * as structbuf from '~/common/network/structbuf';
import type {IdentityString, MessageId} from '~/common/network/types';
import {unreachable} from '~/common/utils/assert';

/**
 * Create a dynamic message that only sends the data to the receiver in `ON_POLL_CLOSE` polls and
 * to everybody else otherwise.
 */
function onCloseAnnounceTypeSpecifics(
    creatorIdentity: IdentityString,
    encoder: LayerEncoder<MessageTypeEncoders[CspE2eGroupConversationType.GROUP_POLL_VOTE]>,
    announceType: PollAnnounceType,
    messageProperties: IndividualMessageProperties<
        ReceiverType.GROUP,
        CspE2eGroupConversationType.GROUP_POLL_VOTE
    >,
): DynamicMessage<ReceiverType.GROUP> {
    return (contact: Contact) => {
        if (
            contact.view.identity === creatorIdentity ||
            announceType === PollAnnounceType.ON_EVERY_VOTE
        ) {
            return {encoder, messageProperties};
        }
        return 'omit';
    };
}

export class OutgoingPollUpdateTask<TReceiver extends AnyReceiver>
    implements ActiveTask<void, 'persistent'>
{
    public readonly type: ActiveTaskSymbol = ACTIVE_TASK;
    public readonly persist = true;
    public readonly transaction = undefined;

    private readonly _log: Logger;

    public constructor(
        private readonly _services: ServicesForTasks,
        private readonly _receiverModel: TReceiver,
        private readonly _conversation: ModelStore<Conversation>,
        private readonly _messageId: MessageId,
        private readonly _pollVoteFragments: DbPollVoteFragment,
        private readonly _announceType: PollAnnounceType,
    ) {
        // Instantiate logger
        const messageIdHex = u64ToHexLe(this._messageId);
        this._log = _services.logging.logger(
            `network.protocol.task.outgoing-poll-update.${messageIdHex}`,
        );
    }

    public async run(handle: ActiveTaskCodecHandle<'persistent'>): Promise<void> {
        const {pollId, creatorIdentity: pollCreatorIdentity, choices} = this._pollVoteFragments;

        const messageModelStore = this._conversation.get().controller.getMessage(this._messageId);
        if (messageModelStore === undefined) {
            this._log.error('Message does not exist anymore, aborting edit');
            return;
        }
        if (messageModelStore.type !== MessageType.POLL) {
            this._log.error('Message is not of type poll and cannot be updated');
            return;
        }

        // Encode message
        const encoder = structbuf.bridge.encoder(structbuf.csp.e2e.PollVote, {
            pollId,
            creatorIdentity: UTF8.encode(pollCreatorIdentity),
            choices: UTF8.encode(
                JSON.stringify(choices.map((c) => [c.choiceId, c.selected ? 1 : 0])),
            ),
        });

        // In case the poll is without intermediate results and the user is the creator, we only
        // reflect the vote without csp message.
        if (
            this._services.device.identity.string === pollCreatorIdentity &&
            this._announceType === PollAnnounceType.ON_CLOSE
        ) {
            const commonReflectProperties = {
                conversation: this._getD2dConversationId(this._receiverModel),
                messageId: u64ToUnsignedLong(this._messageId),
                threadMessageId: undefined, // TODO(DESK-296): Set thread message ID
                createdAt: u64ToUnsignedLong(dateToUnixTimestampMs(new Date())),
                nonces: [],
            };

            let envelope;
            switch (this._receiverModel.type) {
                case ReceiverType.CONTACT:
                    envelope = {
                        outgoingMessage: protobuf.utils.creator(protobuf.d2d.OutgoingMessage, {
                            ...commonReflectProperties,
                            type: CspE2eConversationType.POLL_VOTE,
                            body: encoder.encode(new Uint8Array(encoder.byteLength())),
                        }),
                    };
                    break;
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
                    envelope = {
                        outgoingMessage: protobuf.utils.creator(protobuf.d2d.OutgoingMessage, {
                            ...commonReflectProperties,
                            type: CspE2eGroupConversationType.GROUP_POLL_VOTE,
                            body: groupEncoder.encode(new Uint8Array(groupEncoder.byteLength())),
                        }),
                    };
                    break;
                }
                case ReceiverType.DISTRIBUTION_LIST:
                    throw new Error('TODO(DESK-236): Implement distribution lists');
                default:
                    unreachable(this._receiverModel);
            }

            await handle.reflect([{envelope, flags: D2mMessageFlags.none()}]);
            return;
        }

        // CSP message properties that apply both to 1:1 and group poll update messages
        const sharedMessageProperties = {
            messageId: randomMessageId(this._services.crypto),
            allowUserProfileDistribution: true,
            createdAt: new Date(),
        };

        const cspMessageFlags = CspMessageFlags.fromPartial({
            sendPushNotification: false,
        });

        let task;
        switch (this._receiverModel.type) {
            case ReceiverType.CONTACT:
                task = new OutgoingCspMessagesTask(this._services, [
                    {
                        receiver: {main: this._receiverModel},
                        sharedMessageProperties,
                        specifics: {
                            default: {
                                encoder,
                                messageProperties: {
                                    cspMessageFlags,
                                    type: CspE2eConversationType.POLL_VOTE,
                                },
                            },
                        },
                    },
                ]);
                break;
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
                        receiver: {main: this._receiverModel},
                        sharedMessageProperties,
                        specifics: {
                            default: {
                                encoder: groupEncoder,
                                messageProperties: {
                                    cspMessageFlags,
                                    type: CspE2eGroupConversationType.GROUP_POLL_VOTE,
                                },
                            },
                            dynamic: onCloseAnnounceTypeSpecifics(
                                pollCreatorIdentity,
                                groupEncoder,
                                this._announceType,
                                {
                                    cspMessageFlags,
                                    type: CspE2eGroupConversationType.GROUP_POLL_VOTE,
                                },
                            ),
                        },
                    },
                ]);
                break;
            }
            case ReceiverType.DISTRIBUTION_LIST:
                throw new Error('TODO(DESK-236): Implement distribution lists');
            default:
                unreachable(this._receiverModel);
        }

        await task.run(handle);
    }

    private _getD2dConversationId(
        receiver: AnyReceiver,
    ): ProtobufInstanceOf<typeof protobuf.d2d.ConversationId> {
        switch (receiver.type) {
            case ReceiverType.CONTACT:
                return protobuf.utils.creator(protobuf.d2d.ConversationId, {
                    contact: receiver.view.identity,
                    group: undefined,
                    distributionList: undefined,
                });
            case ReceiverType.GROUP:
                return protobuf.utils.creator(protobuf.d2d.ConversationId, {
                    contact: undefined,
                    group: protobuf.utils.creator(protobuf.common.GroupIdentity, {
                        creatorIdentity: getIdentityString(
                            this._services.device,
                            receiver.view.creator,
                        ),
                        groupId: u64ToUnsignedLong(receiver.view.groupId),
                    }),
                    distributionList: undefined,
                });
            case ReceiverType.DISTRIBUTION_LIST:
                throw new Error('TODO(DESK-237): Support distribution lists');
            default:
                return unreachable(receiver);
        }
    }
}
