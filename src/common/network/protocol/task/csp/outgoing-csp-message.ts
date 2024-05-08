/**
 * Outgoing message task.
 */
import type {Nonce} from '~/common/crypto';
import {CREATE_BUFFER_TOKEN} from '~/common/crypto/box';
import {deriveMessageMetadataKey} from '~/common/crypto/csp-keys';
import {
    type CspE2eContactControlType,
    type CspE2eConversationType,
    type CspE2eForwardSecurityType,
    type CspE2eGroupControlType,
    type CspE2eGroupConversationType,
    type CspE2eStatusUpdateType,
    MessageFilterInstruction,
    NonceScope,
    ReceiverType,
    ReceiverTypeUtils,
    type CspE2eGroupStatusUpdateType,
    type CspE2eGroupMessageUpdateType,
    type CspE2eMessageUpdateType,
} from '~/common/enum';
import type {Logger} from '~/common/logging';
import type {AnyReceiver, Contact} from '~/common/model';
import * as protobuf from '~/common/network/protobuf';
import type {ProtobufInstanceOf} from '~/common/network/protobuf/utils';
import {
    type CspE2eType,
    cspE2eTypeNameOf,
    CspPayloadType,
    D2mPayloadType,
    type LayerEncoder,
    MESSAGE_TYPE_PROPERTIES,
} from '~/common/network/protocol';
import {MESSAGE_DATA_PADDING_LENGTH_MIN} from '~/common/network/protocol/constants';
import type {CspMessageFlags} from '~/common/network/protocol/flags';
import {
    type ActiveTaskCodecHandle,
    type ComposableTask,
    type InternalActiveTaskCodecHandle,
    type ServicesForTasks,
    shouldSendGroupMessageToCreator,
} from '~/common/network/protocol/task';
import {ReflectOutgoingMessageUpdateTask} from '~/common/network/protocol/task/d2d/reflect-message-update';
import * as structbuf from '~/common/network/structbuf';
import {
    conversationIdForReceiver,
    type GroupMessageReflectSetting,
    type MessageId,
} from '~/common/network/types';
import type {u53} from '~/common/types';
import {assert, assertUnreachable, debugAssert, unreachable} from '~/common/utils/assert';
import {byteEquals} from '~/common/utils/byte';
import {UTF8} from '~/common/utils/codec';
import {
    dateToUnixTimestampMs,
    dateToUnixTimestampS,
    intoUnsignedLong,
    u64ToHexLe,
} from '~/common/utils/number';

/**
 * Message properties required to send a legacy CSP Message.
 */
export interface MessageProperties<TMessageEncoder, MessageType extends CspE2eType> {
    readonly type: MessageType;
    readonly encoder: LayerEncoder<TMessageEncoder>;
    readonly cspMessageFlags: CspMessageFlags;
    readonly messageId: MessageId;
    readonly createdAt: Date;
    /**
     * Whether the profile (nickname and profile picture) may be shared with the recipient of this
     * outgoing message.
     *
     * Note(DESK-234): There are additional things to take into account when implementing profile
     * picture distribution, e.g. whether the recipient is a gateway ID.
     */
    readonly allowUserProfileDistribution: boolean;
}

/**
 * Messages that are sent to all group members.
 */
type ValidGroupMessages =
    | CspE2eGroupConversationType
    | CspE2eGroupStatusUpdateType
    | CspE2eGroupMessageUpdateType
    // Note: GROUP_SYNC_REQUEST is excluded, because it is only sent to the creator, not to all members
    | Exclude<CspE2eGroupControlType, CspE2eGroupControlType.GROUP_SYNC_REQUEST>;

/**
 * Messages that are sent to single contacts.
 */
type ValidContactMessages =
    | CspE2eConversationType
    | CspE2eStatusUpdateType
    | CspE2eContactControlType
    | CspE2eMessageUpdateType
    // Note: GROUP_CALL_START is always sent to the whole group, not to a single contact
    | Exclude<CspE2eGroupControlType, CspE2eGroupControlType.GROUP_CALL_START>
    | CspE2eForwardSecurityType;

/**
 * All valid {@link CspE2eType} types that may be sent for a specific receiver.
 *
 * {@link DistributionList}s are treated the same as {@link Contact}s.
 */
export type ValidCspMessageTypeForReceiver<TReceiver extends AnyReceiver> = {
    [ReceiverType.CONTACT]: ValidContactMessages;
    [ReceiverType.GROUP]: ValidGroupMessages;
    [ReceiverType.DISTRIBUTION_LIST]: never; // TODO(DESK-237)
}[TReceiver['type']];

/**
 * Interface for the {@link OutgoingCspMessageTask}.
 */
export type IOutgoingCspMessageTask = ComposableTask<
    ActiveTaskCodecHandle<'volatile'>,
    Date | undefined
>;

/**
 * Constructor function for a {@link IOutgoingCspMessageTask}
 */
export type IOutgoingCspMessageTaskConstructor = new <
    TMessageEncoder,
    TReceiver extends AnyReceiver,
    TMessageType extends ValidCspMessageTypeForReceiver<TReceiver>,
>(
    services: ServicesForTasks,
    receiver: TReceiver,
    properties: MessageProperties<TMessageEncoder, TMessageType>,
) => IOutgoingCspMessageTask;

/**
 * Array with Nonces that may only be accessed with {@link Array.pop} or {@link Array.map} for
 * processing.
 */
type NonceList = Pick<Nonce[], 'pop' | 'length' | 'map'>;

/**
 * The outgoing message task has the following responsibilities:
 *
 * - Potentially reflect message via D2D
 * - Send message via CSP
 * - Potentially reflect OutgoingMessageUpdate.Sent via D2D
 *
 * Whether or not a message is reflected is defined in {@link MESSAGE_TYPE_PROPERTIES}. If a message
 * is not reflected, then the return value is `undefined`, otherwise it's the reflection date.
 */
export class OutgoingCspMessageTask<
    TMessageEncoder,
    TReceiver extends AnyReceiver,
    TMessageType extends ValidCspMessageTypeForReceiver<TReceiver>,
> implements IOutgoingCspMessageTask
{
    private readonly _log: Logger;
    private readonly _reflect: boolean;

    /**
     * Create a new instance of this task.
     *
     * @param _services Task services.
     * @param _receiver Model of message receiver
     * @param _messageProperties Properties of the CSP message
     * @returns the message sent reflection date.
     */
    public constructor(
        private readonly _services: ServicesForTasks,
        private readonly _receiver: TReceiver,
        private readonly _messageProperties: MessageProperties<TMessageEncoder, TMessageType>,
        reflect: GroupMessageReflectSetting = 'default',
    ) {
        // Instantiate logger
        const messageIdHex = u64ToHexLe(_messageProperties.messageId);
        this._log = _services.logging.logger(
            `network.protocol.task.out-csp-message.${messageIdHex}`,
        );
        this._reflect =
            reflect !== 'never' &&
            MESSAGE_TYPE_PROPERTIES[_messageProperties.type].reflect.outgoing;
        this._log.debug('Created');
    }

    public async run(handle: ActiveTaskCodecHandle<'volatile'>): Promise<Date | undefined> {
        const {nonces} = this._services;
        this._log.debug('Run task');

        // Unpack message properties
        const {encoder, messageId, type} = this._messageProperties;

        // Ensure that receiver is a contact or a group.
        // TODO(DESK-237): Support distribution lists.
        if (this._receiver.type === ReceiverType.DISTRIBUTION_LIST) {
            throw new Error(
                `TODO(DESK-237): Support for ${ReceiverTypeUtils.nameOf(
                    this._receiver.type,
                )} receivers not yet implemented.`,
            );
        }

        // Debug info
        const messageTypeDebug = cspE2eTypeNameOf(type) ?? `<unknown> (0x${type.toString(16)})`;

        // Mitigate payload confusion by ensuring that the type is not `0xff`.
        //
        // Note 1: The other necessity to avoid payload confusion is to ensure that the receiver
        //         does not use the server's public key. However, we do already ensure that in the
        //         contact model.
        //
        // Note 2: This is a legacy check which is no longer required with the new authentication
        //         variants, avoiding payload confusion. But it does not hurt to keep it.
        assert(
            (type as u53) !== 0xff,
            'Expected CSP E2E type to not be 0xff to prevent payload confusion',
        );

        // Construct encrypted message box
        const messageBytes = encoder.encode(new Uint8Array(encoder.byteLength()));

        // Get message receiver contacts
        const allReceivers = this._getReceiverContacts();

        // If the message is a group message and it should not be sent to the creator, remove the
        // creator from the receivers list.
        let receivers: Set<Contact>;
        if (
            this._receiver.type === ReceiverType.GROUP &&
            !shouldSendGroupMessageToCreator(
                this._services,
                this._receiver.view.name,
                this._receiver.controller.getCreatorIdentity(),
                type,
            )
        ) {
            const creatorIdentity = this._receiver.controller.getCreatorIdentity();
            receivers = new Set(
                [...allReceivers].filter((receiver) => receiver.view.identity !== creatorIdentity),
            );

            debugAssert(
                receivers.size === allReceivers.size - 1,
                'Expected creator to be removed from receivers',
            );
        } else {
            receivers = allReceivers;
        }

        /**
         * List of unique nonce per receiver from {@link receivers}.
         * Commits the prepared nonces directly when generated.
         */
        const preparedNonces: NonceList = [...receivers].map(() => {
            const nonceGuard = nonces.getRandomNonce(
                NonceScope.CSP,
                `OutgoingCspMessageTask#run(prepared-csp-nonce)`,
            );
            const nonce = nonceGuard.nonce;
            nonceGuard.commit();
            return nonce;
        });

        // Reflect message to other devices
        if (this._reflect) {
            this._log.info(`Reflecting outgoing ${messageTypeDebug} message`);
            await this._reflectMessage(handle, messageBytes, preparedNonces);
        } else {
            this._log.debug(`Skip reflecting outgoing ${messageTypeDebug} message`);
        }

        // Send message to receivers
        let sentMessagesCount = 0;
        if (receivers.size !== 0) {
            this._log.info(`Sending ${messageTypeDebug} message`);
            sentMessagesCount = await this._encryptAndSendMessages(
                handle,
                receivers,
                preparedNonces,
                messageBytes,
            );
            assert(preparedNonces.length === 0, 'All prepared nonces must have been consumed');
            this._log.info(`Sent ${sentMessagesCount} outgoing CSP messages`);
        } else {
            this._log.info(`Skip sending ${messageTypeDebug} message as it has no receivers`);
        }

        // Reflect the sent state of the message
        let reflectDate;
        if (
            this._reflect &&
            MESSAGE_TYPE_PROPERTIES[this._messageProperties.type].reflect.outgoingSentUpdate &&
            sentMessagesCount > 0
        ) {
            // TODO(DESK-323): Do this asynchronously?
            const conversationId = conversationIdForReceiver(this._receiver);
            const task = new ReflectOutgoingMessageUpdateTask(this._services, {
                messageId,
                conversation: conversationId,
            });
            reflectDate = await task.run(handle);
        } else {
            this._log.debug(`Skip reflecting sent state of ${messageTypeDebug} message.`);
        }

        // Done
        return reflectDate;
    }

    /**
     * Reflect message to other devices in the device group.
     *
     * @returns Promise that resolves when the message has been reflected on the mediator
     */
    private async _reflectMessage(
        handle: InternalActiveTaskCodecHandle,
        messageBytes: Uint8Array,
        preparedNonces: NonceList,
    ): Promise<void> {
        const {createdAt, messageId, type} = this._messageProperties;
        await handle.reflect([
            {
                outgoingMessage: protobuf.utils.creator(protobuf.d2d.OutgoingMessage, {
                    conversation: this._getD2dConversationId(),
                    messageId: intoUnsignedLong(messageId),
                    threadMessageId: undefined, // TODO(DESK-296): Set thread message ID
                    createdAt: intoUnsignedLong(dateToUnixTimestampMs(createdAt)),
                    type,
                    body: messageBytes,
                    nonces: preparedNonces as Nonce[] as Uint8Array[],
                }),
            },
        ]);
    }

    /**
     * Encrypt, serialize and send message to CSP for all recipients.
     *
     * @returns Promise that resolves whether all messages have been queued on the chat server with
     *   a count of how many messages were sent.
     */
    private async _encryptAndSendMessages(
        handle: InternalActiveTaskCodecHandle,
        receivers: Set<Contact>,
        preparedNonces: NonceList,
        messageBytes: Uint8Array,
    ): Promise<u53> {
        const {device, crypto, model} = this._services;
        const {createdAt, messageId, type} = this._messageProperties;

        const flags = this._messageProperties.cspMessageFlags.toBitmask();

        // Encode nickname if the message makes it eligible to contain the nickname.
        //
        // Note: The legacy nickname is encoded directly into a zero-padded buffer because it has a
        //       fixed length.
        let nickname;
        let encodedLegacyNickname;
        if (this._messageProperties.allowUserProfileDistribution) {
            nickname = model.user.profileSettings.get().view.nickname ?? '';
            encodedLegacyNickname = UTF8.encodeFullyInto(nickname, new Uint8Array(32));
        }

        let sentMessagesCount: u53 = 0;

        // TODO(DESK-573): Bundle sending of group messages
        for (const receiver of receivers) {
            // Handle blocked receivers
            const privacySettings = model.user.privacySettings.get();
            if (privacySettings.controller.isContactBlocked(receiver.view.identity)) {
                if (MESSAGE_TYPE_PROPERTIES[type].exemptFromBlocking) {
                    this._log.debug(
                        `Sending message to blocked contact ${receiver.view.identity}, because the type ${type} is exempt from blocking`,
                    );
                } else {
                    preparedNonces.pop(); // Discard the nonce for this receiver
                    this._log.info(
                        `Not sending message to blocked contact ${receiver.view.identity}`,
                    );
                    continue;
                }
            }

            const receiverIdentity = UTF8.encode(receiver.view.identity);

            // Encrypt metadata
            //
            // TODO(SE-234): Add post-encode padding rather than always needing to encode the legacy
            //               nickname first.
            const metadataPadding = new Uint8Array(
                Math.max(0, 16 - (encodedLegacyNickname?.encoded.byteLength ?? 0)),
            );

            // Get a nonce for the metadataContainer and messageBox. The use of the nonce for two
            // encryption operations is safe here (as designed in the protocol), since the metadata
            // container is encrypted with a derived key, so the nonce is only used once for every
            // key.
            const messageAndMetadataNonce =
                preparedNonces.pop() ?? assertUnreachable('Missing prepared nonce');

            const metadataContainer = deriveMessageMetadataKey(
                this._services,
                device.csp.ck,
                receiver.view.publicKey,
            )
                .encryptor(
                    CREATE_BUFFER_TOKEN,
                    protobuf.utils.encoder(protobuf.csp_e2e.MessageMetadata, {
                        padding: metadataPadding,
                        nickname,
                        messageId: intoUnsignedLong(messageId),
                        createdAt: intoUnsignedLong(dateToUnixTimestampMs(createdAt)),
                    }),
                )
                // See {@link messageAndMetadataNonce} on how the unguarded nonce is used here.
                .encryptWithDangerousUnguardedNonce(messageAndMetadataNonce);

            // Encrypt message and use the same nonce as used for the metadata
            const messageBox = device.csp.ck
                .getSharedBox(receiver.view.publicKey)
                .encryptor(
                    CREATE_BUFFER_TOKEN,
                    structbuf.bridge.encoder(structbuf.csp.e2e.Container, {
                        type,
                        paddedData: structbuf.bridge.pkcs7PaddedEncoder(
                            crypto,
                            MESSAGE_DATA_PADDING_LENGTH_MIN,
                            messageBytes,
                        ),
                    }),
                )
                // See {@link messageAndMetadataNonce} on how the unguarded nonce is used here.
                .encryptWithDangerousUnguardedNonce(messageAndMetadataNonce);

            // Send message
            await handle.write({
                type: D2mPayloadType.PROXY,
                payload: {
                    type: CspPayloadType.OUTGOING_MESSAGE,
                    payload: structbuf.bridge.encoder(
                        structbuf.csp.payload.MessageWithMetadataBox,
                        {
                            senderIdentity: device.identity.bytes,
                            receiverIdentity,
                            messageId,
                            createdAt: dateToUnixTimestampS(createdAt),
                            flags,
                            reserved: 0x00,
                            // Only send the legacy nickname to Threema Gateway IDs
                            legacySenderNickname:
                                nickname !== undefined && receiver.view.identity.startsWith('*')
                                    ? UTF8.encodeFullyInto(nickname, new Uint8Array(32)).array
                                    : new Uint8Array(32),
                            metadataContainer,
                            messageAndMetadataNonce,
                            messageBox,
                        },
                    ),
                },
            });

            // Wait for message ack
            await handle.read((message) => {
                // Check if the message type matches
                if (message.type !== D2mPayloadType.PROXY) {
                    return MessageFilterInstruction.BYPASS_OR_BACKLOG;
                }
                if (message.payload.type !== CspPayloadType.OUTGOING_MESSAGE_ACK) {
                    return MessageFilterInstruction.BYPASS_OR_BACKLOG;
                }
                // Check if the message ID matches
                if (message.payload.payload.messageId !== messageId) {
                    return MessageFilterInstruction.BYPASS_OR_BACKLOG;
                }

                // Check if the receiver equals our current message
                if (!byteEquals(message.payload.payload.identity, receiverIdentity)) {
                    return MessageFilterInstruction.BYPASS_OR_BACKLOG;
                }

                return MessageFilterInstruction.ACCEPT;
            });
            sentMessagesCount++;
        }

        return sentMessagesCount;
    }

    /**
     * Get unique receiver(s) for this message.
     *
     * If the receivers is an empty set, it means we are sending a message to a group we are the
     * creator of and has no members - a notes group.
     *
     * @returns Contact Models of receiver.
     */
    private _getReceiverContacts(): Set<Contact> {
        switch (this._receiver.type) {
            case ReceiverType.CONTACT:
                return new Set<Contact>([this._receiver]);

            case ReceiverType.GROUP: {
                const receivers: Contact[] = [];

                // Get group creator if it is not us
                const creator = this._receiver.view.creator;
                if (creator !== 'me') {
                    receivers.push(creator.get());
                }

                for (const member of this._receiver.view.members) {
                    receivers.push(member.get());
                }

                // Sort contacts to have a deterministic message sending order
                receivers.sort((a, b) => a.view.identity.localeCompare(b.view.identity));

                return new Set(receivers);
            }

            case ReceiverType.DISTRIBUTION_LIST:
                // TODO(DESK-237): Support distribution lists.
                throw new Error('TODO(DESK-237): Support distribution lists');

            default:
                return unreachable(this._receiver);
        }
    }

    /**
     * Return an instance of a protobuf d2d {@link ConversationId} for the current receiver.
     */
    private _getD2dConversationId(): ProtobufInstanceOf<typeof protobuf.d2d.ConversationId> {
        switch (this._receiver.type) {
            case ReceiverType.CONTACT:
                return protobuf.utils.creator(protobuf.d2d.ConversationId, {
                    contact: this._receiver.view.identity,
                    group: undefined,
                    distributionList: undefined,
                });
            case ReceiverType.GROUP: {
                const creatorIdentity = this._receiver.controller.getCreatorIdentity();
                return protobuf.utils.creator(protobuf.d2d.ConversationId, {
                    contact: undefined,
                    group: protobuf.utils.creator(protobuf.common.GroupIdentity, {
                        creatorIdentity,
                        groupId: intoUnsignedLong(this._receiver.view.groupId),
                    }),
                    distributionList: undefined,
                });
            }
            case ReceiverType.DISTRIBUTION_LIST:
                throw new Error(
                    `TODO(DESK-237): Support for distribution list receivers not yet implemented.`,
                );
            default:
                return unreachable(this._receiver);
        }
    }
}
