/* eslint-disable no-unreachable-loop */
import type {Nonce} from '~/common/crypto';
import {CREATE_BUFFER_TOKEN} from '~/common/crypto/box';
import {deriveMessageMetadataKey} from '~/common/crypto/csp-keys';
import {
    ActivityState,
    CspE2eContactControlType,
    MessageDirection,
    MessageFilterInstruction,
    MessageType,
    NonceScope,
    ReceiverType,
} from '~/common/enum';
import type {Logger} from '~/common/logging';
import type {AnyReceiver, Contact, Group} from '~/common/model';
import {getIdentityString} from '~/common/model/contact';
import * as protobuf from '~/common/network/protobuf';
import type {ProtobufInstanceOf} from '~/common/network/protobuf/utils';
import {
    cspE2eTypeNameOf,
    CspPayloadType,
    D2mPayloadType,
    MESSAGE_TYPE_PROPERTIES,
    type CspE2eType,
} from '~/common/network/protocol';
import {MESSAGE_DATA_PADDING_LENGTH_MIN} from '~/common/network/protocol/constants';
import {CspMessageFlags, D2mMessageFlags} from '~/common/network/protocol/flags';
import {
    shouldSendGroupMessageToCreator,
    type ActiveTaskCodecHandle,
    type ComposableTask,
    type InternalActiveTaskCodecHandle,
    type ServicesForTasks,
} from '~/common/network/protocol/task';
import {profilePictureDistributionSteps} from '~/common/network/protocol/task/common/user-profile-distribution';
import type {
    MessageProperties,
    ValidCspMessageTypeForReceiver,
} from '~/common/network/protocol/task/csp/outgoing-csp-message';
import {ReflectOutgoingMessageUpdateTask} from '~/common/network/protocol/task/d2d/reflect-message-update';
import {randomMessageId} from '~/common/network/protocol/utils';
import * as structbuf from '~/common/network/structbuf';
import {conversationIdForReceiver} from '~/common/network/types';
import type {ReadonlyUint8Array, u53} from '~/common/types';
import {assert, assertUnreachable, unreachable} from '~/common/utils/assert';
import {byteEquals} from '~/common/utils/byte';
import {UTF8} from '~/common/utils/codec';
import {dateToUnixTimestampMs, dateToUnixTimestampS, intoUnsignedLong} from '~/common/utils/number';

/**
 * Array with Nonces that may only be accessed with {@link Array.pop} or {@link Array.map} for
 * processing.
 */
type NonceList = Pick<Nonce[], 'pop' | 'length' | 'map'>;

interface CSPMessage<TReceiver extends AnyReceiver = AnyReceiver> {
    readonly receiver: TReceiver;
    readonly messageProperties: MessageProperties<
        unknown,
        ValidCspMessageTypeForReceiver<TReceiver>
    >;
}

type CSPMessages<T extends CSPMessage[] = CSPMessage[]> = T extends [infer First, ...infer Rest]
    ? First extends CSPMessage
        ? [CSPMessage<First['receiver']>, ...CSPMessages<Rest extends CSPMessage[] ? Rest : []>]
        : never
    : T;

type AnyMessageProperty = MessageProperties<unknown, CspE2eType>;

/**
 * The outgoing messages task has the following responsibilities (for each message):
 *
 * - Potentially reflect messages via D2D
 * - Potentially distribute (or delete) the profile picture
 * - Send messages via CSP
 * - Potentially reflect OutgoingMessageUpdate.Sent via D2D
 * - Persist potential side effects to the database
 *
 * Whether or not a message is reflected is defined in {@link MESSAGE_TYPE_PROPERTIES}.
 */
export class OutgoingCspMessagesTask
    implements ComposableTask<ActiveTaskCodecHandle<'volatile'>, void>
{
    private readonly _log: Logger;
    private readonly _messages: {
        readonly receiverContacts: Set<Contact>;
        readonly nonces: NonceList;
        readonly properties: AnyMessageProperty;
        readonly receiver: Group | Contact;
    }[] = [];

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
        messages: CSPMessages,
    ) {
        this._log = _services.logging.logger(
            `network.protocol.task.out-csp-messages.[${messages.map((message) => message.messageProperties.messageId).join(', ')}]`,
        );

        // Transform the messages into a suitable format
        for (const message of messages) {
            let messageInformation;
            switch (message.receiver.type) {
                case ReceiverType.CONTACT:
                    messageInformation = {
                        receiverContacts: new Set<Contact>([message.receiver]),
                        nonces: this._generateNonces(1),
                        receiver: message.receiver,
                    } as const;
                    break;

                case ReceiverType.GROUP: {
                    const creatorIdentity = getIdentityString(
                        this._services.device,
                        message.receiver.view.creator,
                    );
                    const receiverContacts = new Set<Contact>(
                        [...message.receiver.view.members.values()].map((m) => m.get()),
                    );

                    // Decide whether or not the message should be sent to the creator.
                    if (
                        message.receiver.view.creator !== 'me' &&
                        shouldSendGroupMessageToCreator(
                            message.receiver.view.name,
                            creatorIdentity,
                            message.messageProperties.type,
                        )
                    ) {
                        receiverContacts.add(message.receiver.view.creator.get());
                    }

                    messageInformation = {
                        receiverContacts,
                        nonces: this._generateNonces(receiverContacts.size),
                        receiver: message.receiver,
                    } as const;
                    break;
                }
                case ReceiverType.DISTRIBUTION_LIST:
                    throw new Error('TODO(DESK-237): Support distribution lists');

                default:
                    unreachable(message.receiver);
            }

            this._messages.push({properties: message.messageProperties, ...messageInformation});
        }
    }

    public async run(handle: ActiveTaskCodecHandle<'volatile'>): Promise<void> {
        for (const {nonces, properties, receiverContacts: receivers} of this._messages) {
            for (const receiver of receivers) {
                // If this happens, we have a bug somewhere else.
                assert(
                    receiver.view.identity !== this._services.device.identity.string,
                    'A contact cannot have the identity of the user',
                );

                // 2.1.2 If `receiver` is marked as _invalid_, remove `receiver` from
                // `receivers and abort these sub-steps.
                if (receiver.view.activityState === ActivityState.INVALID) {
                    receivers.delete(receiver);
                    nonces.pop();
                    continue;
                }

                // 2.1.3. If `message` is not exempted from blocking, run the _Identity Blocked Steps_
                //    for `receiver`'s identity. If the result indicates that `receiver` is blocked,
                //    remove `receiver` from `receivers` and abort these sub-steps.
                if (!MESSAGE_TYPE_PROPERTIES[properties.type].exemptFromBlocking) {
                    if (
                        this._services.model.user.privacySettings
                            .get()
                            .controller.isContactBlocked(receiver.view.identity)
                    ) {
                        receivers.delete(receiver);
                        nonces.pop();
                        continue;
                    }
                }
            }

            // 2.1.4. Run the _Profile Picture Distribution Steps_ and extend
            //  `messages` with the result for `receiver`.
            const profilePictureMessages = await profilePictureDistributionSteps(
                this._services,
                properties.allowUserProfileDistribution,
                receivers,
            );

            if (profilePictureMessages.remove !== undefined) {
                for (const removeProfilePictureReceiver of profilePictureMessages.remove) {
                    this._messages.push({
                        properties: {
                            type: CspE2eContactControlType.CONTACT_DELETE_PROFILE_PICTURE,
                            encoder: structbuf.bridge.encoder(
                                structbuf.csp.e2e.DeleteProfilePicture,
                                {},
                            ),
                            cspMessageFlags: CspMessageFlags.none(),
                            allowUserProfileDistribution: false,
                            createdAt: new Date(),
                            messageId: randomMessageId(this._services.crypto),
                            overrideReflectedProperty: false,
                        } as const,

                        receiverContacts: new Set([removeProfilePictureReceiver]),
                        nonces: this._generateNonces(1),
                        receiver: removeProfilePictureReceiver,
                    });
                }
            }

            if (profilePictureMessages.set !== undefined) {
                for (const setProfilePictureReceiver of profilePictureMessages.set.contacts) {
                    this._messages.push({
                        properties: {
                            type: CspE2eContactControlType.CONTACT_SET_PROFILE_PICTURE,
                            encoder: structbuf.bridge.encoder(structbuf.csp.e2e.SetProfilePicture, {
                                key: profilePictureMessages.set.key.unwrap() as Uint8Array,
                                pictureBlobId: profilePictureMessages.set
                                    .blobId as ReadonlyUint8Array as Uint8Array,
                                pictureSize: profilePictureMessages.set.size,
                            }),
                            cspMessageFlags: CspMessageFlags.none(),
                            allowUserProfileDistribution: false,
                            createdAt: new Date(),
                            messageId: randomMessageId(this._services.crypto),
                            overrideReflectedProperty: false,
                        } as const,
                        receiverContacts: new Set([setProfilePictureReceiver]),
                        nonces: this._generateNonces(1),
                        receiver: setProfilePictureReceiver,
                    });
                }
            }
        }

        // Reflect all messages that require reflection and await their acks.
        const reflectedAt = await this._reflectMessages(handle);
        if (reflectedAt !== undefined) {
            this._log.info(`Reflected ${reflectedAt.length} messages`);
        }

        // Send all messages and await their acks if necessary.
        const sentMessagesCount = await this._encryptAndSendMessages(handle);
        this._log.info(`Sent ${sentMessagesCount} outgoing CSP messages`);

        // Reflect side effects
        const reflectPromises: Promise<unknown>[] = [];

        for (const message of this._messages) {
            // 12.1. If `message` is eligible for reflecting `OutgoingMessageUpdate.Sent`:
            if (MESSAGE_TYPE_PROPERTIES[message.properties.type].reflect.outgoingSentUpdate) {
                // TODO(DESK-323): Do this asynchronously?
                const conversationId = conversationIdForReceiver(
                    this._services.device,
                    message.receiver,
                );

                const task = new ReflectOutgoingMessageUpdateTask(this._services, {
                    messageId: message.properties.messageId,
                    conversation: conversationId,
                });
                const taskPromise = task.run(handle);

                // When the side effect reflect promise fulfills, we persist the side effect to our local database
                taskPromise
                    .then((date) => {
                        const conversation =
                            message.receiver.type === ReceiverType.CONTACT
                                ? this._services.model.conversations.getForReceiver({
                                      type: ReceiverType.CONTACT,
                                      uid: message.receiver.ctx,
                                  })
                                : this._services.model.conversations.getForReceiver({
                                      type: ReceiverType.GROUP,
                                      uid: message.receiver.ctx,
                                  });
                        const messageModel = conversation
                            ?.get()
                            .controller.getMessage(message.properties.messageId);

                        if (
                            messageModel !== undefined &&
                            messageModel.type !== MessageType.DELETED
                        ) {
                            assert(messageModel.ctx === MessageDirection.OUTBOUND);
                            messageModel.get().controller.sent(date);
                        }
                    })
                    .catch(assertUnreachable);

                reflectPromises.push(taskPromise);
            } else {
                this._log.debug(
                    `Skip reflecting sent state of ${message.properties.type} message.`,
                );
            }
        }

        await Promise.all(reflectPromises);
    }

    /**
     * Encrypt, serialize and send message to CSP for all recipients.
     *
     * @returns Promise that resolves whether all messages have been queued on the chat server with
     *   a count of how many messages were sent.
     */
    private async _encryptAndSendMessages(handle: InternalActiveTaskCodecHandle): Promise<u53> {
        const {device, crypto, model} = this._services;

        let sentMessagesCount: u53 = 0;

        // TODO(DESK-1611) Don't wait for the promises to resolve in the loop, but store them and
        // await all of them afterwards.
        for (const {properties, receiverContacts: receivers, nonces} of this._messages) {
            const flags = properties.cspMessageFlags.toBitmask();

            // Encode nickname if the message makes it eligible to contain the nickname.
            //
            // Note: The legacy nickname is encoded directly into a zero-padded buffer because it has a
            //       fixed length.
            let nickname;
            let encodedLegacyNickname;
            if (properties.allowUserProfileDistribution) {
                nickname = model.user.profileSettings.get().view.nickname ?? '';
                encodedLegacyNickname = UTF8.encodeFullyInto(nickname, new Uint8Array(32));
            }

            for (const receiver of receivers) {
                this._log.info(
                    `Sending message of type ${cspE2eTypeNameOf(properties.type)} to receiver ${receiver.view.identity}`,
                );

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
                    nonces.pop() ?? assertUnreachable('Missing prepared nonce');

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
                            messageId: intoUnsignedLong(properties.messageId),
                            createdAt: intoUnsignedLong(
                                dateToUnixTimestampMs(properties.createdAt),
                            ),
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
                            type: properties.type,
                            paddedData: structbuf.bridge.pkcs7PaddedEncoder(
                                crypto,
                                MESSAGE_DATA_PADDING_LENGTH_MIN,
                                properties.encoder.encode(
                                    new Uint8Array(properties.encoder.byteLength()),
                                ),
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
                                messageId: properties.messageId,
                                createdAt: dateToUnixTimestampS(properties.createdAt),
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
                if (!properties.cspMessageFlags.dontAck) {
                    await handle.read((message) => {
                        // Check if the message type matches
                        if (message.type !== D2mPayloadType.PROXY) {
                            return MessageFilterInstruction.BYPASS_OR_BACKLOG;
                        }
                        if (message.payload.type !== CspPayloadType.OUTGOING_MESSAGE_ACK) {
                            return MessageFilterInstruction.BYPASS_OR_BACKLOG;
                        }
                        // Check if the message ID matches
                        if (message.payload.payload.messageId !== properties.messageId) {
                            return MessageFilterInstruction.BYPASS_OR_BACKLOG;
                        }

                        // Check if the receiver equals our current message
                        if (!byteEquals(message.payload.payload.identity, receiverIdentity)) {
                            return MessageFilterInstruction.BYPASS_OR_BACKLOG;
                        }

                        return MessageFilterInstruction.ACCEPT;
                    });
                }
                sentMessagesCount++;
            }
            assert(nonces.length === 0, 'All prepared nonces must have been consumed');
        }

        return sentMessagesCount;
    }

    private _generateNonces(length: u53): NonceList {
        return Array.from({length}).map(() => {
            const nonceGuard = this._services.nonces.getRandomNonce(
                NonceScope.CSP,
                `OutgoingCspMessageTask#run(prepared-csp-nonce)`,
            );
            const nonce = nonceGuard.nonce;
            nonceGuard.commit();
            return nonce;
        });
    }

    /**
     * Reflect all internally stored messages that require reflection to other devices in the device
     * group.
     *
     * @returns Promise that resolves when the message has been reflected on the mediator, or `undefined if nothing was reflected.
     */
    private async _reflectMessages(
        handle: InternalActiveTaskCodecHandle,
    ): Promise<readonly Date[] | undefined> {
        const reflectMessages = this._messages
            .filter(
                ({properties}) =>
                    MESSAGE_TYPE_PROPERTIES[properties.type].reflect.outgoing &&
                    properties.overrideReflectedProperty !== true,
            )
            .map((message) => {
                this._log.info(
                    `Reflecting message of type ${cspE2eTypeNameOf(message.properties.type)}`,
                );
                return {
                    envelope: {
                        outgoingMessage: protobuf.utils.creator(protobuf.d2d.OutgoingMessage, {
                            conversation: this._getD2dConversationId(message.receiver),
                            messageId: intoUnsignedLong(message.properties.messageId),
                            threadMessageId: undefined, // TODO(DESK-296): Set thread message ID
                            createdAt: intoUnsignedLong(
                                dateToUnixTimestampMs(message.properties.createdAt),
                            ),
                            type: message.properties.type,
                            body: message.properties.encoder.encode(
                                new Uint8Array(message.properties.encoder.byteLength()),
                            ),
                            nonces: message.nonces as Nonce[] as Uint8Array[],
                        }),
                    },
                    flags: D2mMessageFlags.none(),
                };
            });
        if (reflectMessages.length > 0) {
            return await handle.reflect(reflectMessages);
        }
        return undefined;
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
                        groupId: intoUnsignedLong(receiver.view.groupId),
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
