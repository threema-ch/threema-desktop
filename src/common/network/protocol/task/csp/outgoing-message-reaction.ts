import {
    CspE2eDeliveryReceiptStatus,
    CspE2eGroupMessageReactionType,
    CspE2eGroupStatusUpdateType,
    CspE2eMessageReactionType,
    CspE2eStatusUpdateType,
    GroupUserState,
    MessageReaction,
    ReceiverType,
} from '~/common/enum';
import type {Logger} from '~/common/logging';
import type {Contact, Conversation} from '~/common/model';
import {getIdentityString} from '~/common/model/contact';
import type {AnyReceiver, ReceiverFor} from '~/common/model/types/receiver';
import type {ModelStore} from '~/common/model/utils/model-store';
import * as protobuf from '~/common/network/protobuf';
import type {CspE2eType, LayerEncoder, MessageTypeEncoders} from '~/common/network/protocol';
import {CspMessageFlags} from '~/common/network/protocol/flags';
import {
    ACTIVE_TASK,
    type ActiveTaskCodecHandle,
    type ActiveTask,
    type ActiveTaskSymbol,
    type ServicesForTasks,
} from '~/common/network/protocol/task';
import {legacyReactionMappingSteps} from '~/common/network/protocol/task/common/message-reaction';
import {
    OutgoingCspMessagesTask,
    type DynamicMessage,
    type IndividualMessageProperties,
} from '~/common/network/protocol/task/csp/outgoing-csp-messages';
import type {
    CommonMessageProperties,
    ValidCspMessageTypeForReceiver,
} from '~/common/network/protocol/task/csp/types';
import {randomMessageId} from '~/common/network/protocol/utils';
import * as structbuf from '~/common/network/structbuf';
import type {EmojiReaction, MessageId} from '~/common/network/types';
import {unreachable} from '~/common/utils/assert';
import {UTF8} from '~/common/utils/codec';
import {checkFeatureMaskSupportsFeature, supportsFeature} from '~/common/utils/feature-mask';
import {intoUnsignedLong, u64ToHexLe} from '~/common/utils/number';

interface TypedEncoder<TType extends CspE2eType> {
    readonly encoder: LayerEncoder<MessageTypeEncoders[TType]>;
    readonly messageProperties: CommonMessageProperties<TType>;
}

// Create an encoder with the required fallback mechanism
function reactionSpecifics<
    TReceiverType extends ReceiverType,
    TDefaultType extends ValidCspMessageTypeForReceiver<ReceiverFor<TReceiverType>>,
    TDynamicType extends ValidCspMessageTypeForReceiver<ReceiverFor<TReceiverType>>,
>(specifics: {
    readonly default: TypedEncoder<TDefaultType>;
    readonly legacy: TypedEncoder<TDynamicType> | 'omit';
}): DynamicMessage<TReceiverType> {
    return (contact: Contact) => {
        if (!checkFeatureMaskSupportsFeature(contact.view.featureMask, 'EMOJI_REACTION_SUPPORT')) {
            return specifics.legacy;
        }
        return specifics.default;
    };
}

export class OutgoingMessageReactionTask<TReceiver extends AnyReceiver>
    implements ActiveTask<void, 'volatile'>
{
    public readonly type: ActiveTaskSymbol = ACTIVE_TASK;
    public readonly persist = false;
    public readonly transaction = undefined;

    private readonly _log: Logger;

    public constructor(
        private readonly _services: ServicesForTasks,
        private readonly _receiverModel: TReceiver,
        private readonly _conversation: ModelStore<Conversation>,
        private readonly _reactedMessageId: MessageId,
        private readonly _reaction: EmojiReaction,
        private readonly _variant: 'apply' | 'withdraw',
    ) {
        // Instantiate logger
        const messageIdHex = u64ToHexLe(this._reactedMessageId);
        this._log = _services.logging.logger(
            `network.protocol.task.outgoing-message-reaction.${messageIdHex}`,
        );
    }

    public async run(handle: ActiveTaskCodecHandle<'volatile'>): Promise<void> {
        // 2. Run the Legacy Reaction Mapping Steps with reaction and let legacy-reaction be the result.
        const legacyReaction = legacyReactionMappingSteps(this._reaction, this._variant);

        const featureSupport = supportsFeature(
            this._conversation.get(),
            this._services,
            'EMOJI_REACTION_SUPPORT',
        );

        if (legacyReaction === undefined) {
            // We do not check the sender  here, since this is already done in the frontend.

            // 3. If legacy-reaction is not defined and the sender or the receiver does not have
            //    REACTION_SUPPORT, log a warning and abort these steps.

            // This case should be prevented by the frontend.
            if (featureSupport.supported === 'none') {
                this._log.warn(
                    `The receiver does not support the reaction ${this._reaction}, not sending the message`,
                );
                return;
            }
        }

        // TODO(DESK-1674): Run the (group) message submit steps. For now, we implement these steps
        // here and consider only the steps that are related to emoji reactions.
        if (
            this._receiverModel.type === ReceiverType.GROUP &&
            this._receiverModel.view.userState !== GroupUserState.MEMBER
        ) {
            this._log.warn(
                'Trying to apply a reaction in a group the user is not member of, aborting',
            );
            return;
        }

        if (
            this._receiverModel.type === ReceiverType.CONTACT &&
            this._services.model.user.privacySettings
                .get()
                .controller.isContactBlocked(this._receiverModel.view.identity)
        ) {
            this._log.warn(
                'Trying to apply a reaction in a direct conversation with a blocked contact, aborting',
            );
            return;
        }

        // Message properties that apply both to 1:1 and group reaction messages
        const sharedMessageProperties = {
            messageId: randomMessageId(this._services.crypto),
            createdAt: new Date(),
            allowUserProfileDistribution: true,
        };

        // Encode message
        const defaultEncoder = this._getDefaultEncoder();
        const legacyEncoder = this._getLegacyEncoder(legacyReaction);

        // Note: Here, we assume that a feature mask check has already happened.
        let task;
        switch (this._receiverModel.type) {
            case ReceiverType.CONTACT: {
                // If this is a one to one chat and the recipient does not support emoji reactions,
                // we send and reflect a legacy reaction if this is a thumbs up / down.
                if (featureSupport.supported === 'none' && legacyEncoder !== 'omit') {
                    const messageProperties: IndividualMessageProperties<
                        ReceiverType.CONTACT,
                        CspE2eStatusUpdateType.DELIVERY_RECEIPT
                    > = {
                        cspMessageFlags: CspMessageFlags.none(),
                        type: CspE2eStatusUpdateType.DELIVERY_RECEIPT,
                    };
                    task = new OutgoingCspMessagesTask(this._services, [
                        {
                            receiver: this._receiverModel,
                            sharedMessageProperties,
                            specifics: {default: {encoder: legacyEncoder, messageProperties}},
                        },
                    ]);
                } else {
                    // Otherwise, send and reflect a new reaction message.
                    const messageProperties = {
                        cspMessageFlags: CspMessageFlags.fromPartial({sendPushNotification: true}),
                        type: CspE2eMessageReactionType.REACTION,
                    } as const;

                    task = new OutgoingCspMessagesTask(this._services, [
                        {
                            receiver: this._receiverModel,
                            sharedMessageProperties,
                            specifics: {
                                default: {encoder: defaultEncoder, messageProperties},
                            },
                        },
                    ]);
                }
                break;
            }
            case ReceiverType.GROUP: {
                const groupDefaultEncoder = structbuf.bridge.encoder(
                    structbuf.csp.e2e.GroupMemberContainer,
                    {
                        groupId: this._receiverModel.view.groupId,
                        creatorIdentity: UTF8.encode(
                            getIdentityString(
                                this._services.device,
                                this._receiverModel.view.creator,
                            ),
                        ),
                        innerData: defaultEncoder,
                    },
                );

                const groupLegacyEncoder =
                    legacyEncoder === 'omit'
                        ? 'omit'
                        : structbuf.bridge.encoder(structbuf.csp.e2e.GroupMemberContainer, {
                              groupId: this._receiverModel.view.groupId,
                              creatorIdentity: UTF8.encode(
                                  getIdentityString(
                                      this._services.device,
                                      this._receiverModel.view.creator,
                                  ),
                              ),
                              innerData: legacyEncoder,
                          });
                const messageProperties: IndividualMessageProperties<
                    ReceiverType.GROUP,
                    CspE2eGroupMessageReactionType.GROUP_REACTION
                > = {
                    type: CspE2eGroupMessageReactionType.GROUP_REACTION,
                    cspMessageFlags: CspMessageFlags.fromPartial({
                        sendPushNotification: true,
                    }),
                };
                task = new OutgoingCspMessagesTask(this._services, [
                    {
                        receiver: this._receiverModel,
                        sharedMessageProperties,
                        specifics: {
                            default: {encoder: groupDefaultEncoder, messageProperties},
                            dynamic: reactionSpecifics<
                                ReceiverType.GROUP,
                                CspE2eGroupMessageReactionType.GROUP_REACTION,
                                CspE2eGroupStatusUpdateType.GROUP_DELIVERY_RECEIPT
                            >({
                                default: {
                                    encoder: groupDefaultEncoder,
                                    messageProperties: {
                                        ...sharedMessageProperties,
                                        cspMessageFlags: CspMessageFlags.fromPartial({
                                            sendPushNotification: true,
                                        }),
                                        type: CspE2eGroupMessageReactionType.GROUP_REACTION,
                                    },
                                },
                                legacy:
                                    groupLegacyEncoder === 'omit'
                                        ? 'omit'
                                        : {
                                              encoder: groupLegacyEncoder,
                                              messageProperties: {
                                                  ...sharedMessageProperties,
                                                  cspMessageFlags: CspMessageFlags.none(),
                                                  type: CspE2eGroupStatusUpdateType.GROUP_DELIVERY_RECEIPT,
                                              },
                                          },
                            }),
                        },
                    },
                ]);

                break;
            }
            case ReceiverType.DISTRIBUTION_LIST: {
                // TODO(DESK-597): Distribution lists
                this._log.warn('Distribution lists not implemented yet');
                return;
            }
            default:
                unreachable(this._receiverModel);
        }
        await task.run(handle);
    }

    private _getDefaultEncoder(): LayerEncoder<protobuf.csp_e2e.ReactionEncodable> {
        switch (this._variant) {
            case 'apply':
                return protobuf.utils.encoder(protobuf.csp_e2e.Reaction, {
                    withdraw: undefined,
                    apply: UTF8.encode(this._reaction),
                    messageId: intoUnsignedLong(this._reactedMessageId),
                });
            case 'withdraw':
                return protobuf.utils.encoder(protobuf.csp_e2e.Reaction, {
                    apply: undefined,
                    withdraw: UTF8.encode(this._reaction),
                    messageId: intoUnsignedLong(this._reactedMessageId),
                });
            default:
                return unreachable(this._variant);
        }
    }

    private _getLegacyEncoder(
        legacyReaction: MessageReaction | undefined,
    ): LayerEncoder<structbuf.csp.e2e.DeliveryReceiptEncodable> | 'omit' {
        switch (legacyReaction) {
            case undefined:
                // If this reaction cannot be mapped to a legacy reaction, we always omit if the receiver
                // does not support emoji reactions.
                return 'omit';
            case MessageReaction.ACKNOWLEDGE:
                return structbuf.bridge.encoder(structbuf.csp.e2e.DeliveryReceipt, {
                    messageIds: [this._reactedMessageId],
                    status: CspE2eDeliveryReceiptStatus.ACKNOWLEDGED,
                });
            case MessageReaction.DECLINE:
                return structbuf.bridge.encoder(structbuf.csp.e2e.DeliveryReceipt, {
                    messageIds: [this._reactedMessageId],
                    status: CspE2eDeliveryReceiptStatus.DECLINED,
                });
            default:
                return unreachable(legacyReaction);
        }
    }
}
