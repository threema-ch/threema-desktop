/**
 * Incoming message task.
 */
import {type EncryptedData, type Nonce} from '~/common/crypto';
import {CREATE_BUFFER_TOKEN} from '~/common/crypto/box';
import {type DbContact} from '~/common/db';
import {
    type D2dCspMessageType,
    AcquaintanceLevel,
    ActivityState,
    ConversationCategory,
    ConversationVisibility,
    CspE2eContactControlType,
    CspE2eConversationType,
    CspE2eDeliveryReceiptStatus,
    CspE2eForwardSecurityType,
    CspE2eGroupControlType,
    CspE2eGroupControlTypeUtils,
    CspE2eGroupConversationType,
    CspE2eGroupStatusUpdateType,
    CspE2eStatusUpdateType,
    MessageDirection,
    MessageType,
    ReceiverType,
    SyncState,
    VerificationLevel,
    WorkVerificationLevel,
} from '~/common/enum';
import {type Logger} from '~/common/logging';
import {
    type Contact,
    type ContactInit,
    type Conversation,
    type DirectedMessageFor,
    type Group,
    type MessageFor,
    type UidOf,
} from '~/common/model';
import {LocalModelStore} from '~/common/model/utils/model-store';
import * as protobuf from '~/common/network/protobuf';
import {
    type CspE2eType,
    cspE2eTypeNameOf,
    CspMessageFlag,
    CspPayloadType,
    D2mPayloadType,
} from '~/common/network/protocol';
import {CspMessageFlags} from '~/common/network/protocol/flags';
import {
    type ActiveTask,
    type ActiveTaskCodecHandle,
    type ActiveTaskSymbol,
    type ComposableTask,
    type ServicesForTasks,
    ACTIVE_TASK,
    placeholderTextForUnhandledMessage,
} from '~/common/network/protocol/task';
import {commonGroupReceiveSteps} from '~/common/network/protocol/task/common/group-helpers';
import {parseLocation} from '~/common/network/protocol/task/common/location';
import {parsePossibleTextQuote} from '~/common/network/protocol/task/common/quotes';
import {
    type AnyInboundMessageInitFragment,
    type InboundTextMessageInitFragment,
} from '~/common/network/protocol/task/message-processing-helpers';
import {randomMessageId} from '~/common/network/protocol/utils';
import * as structbuf from '~/common/network/structbuf';
import * as validate from '~/common/network/structbuf/validate';
import {
    type ContactConversationId,
    type GroupConversationId,
    type IdentityString,
    type MessageId,
    ensureIdentityString,
    ensureMessageId,
} from '~/common/network/types';
import {type ReadonlyUint8Array, type u53} from '~/common/types';
import {assert, ensureError, exhausted, unreachable} from '~/common/utils/assert';
import {byteWithoutPkcs7, byteWithoutZeroPadding} from '~/common/utils/byte';
import {UTF8} from '~/common/utils/codec';
import {idColorIndex} from '~/common/utils/id-color';
import {Identity} from '~/common/utils/identity';
import {
    dateToUnixTimestampMs,
    intoUnsignedLong,
    u64ToHexLe,
    unixTimestamptoDateS,
} from '~/common/utils/number';

import {IncomingDeliveryReceiptTask} from './incoming-delivery-receipt';
import {IncomingForwardSecurityEnvelopeTask} from './incoming-fs-envelope';
import {IncomingGroupLeaveTask} from './incoming-group-leave';
import {IncomingGroupNameTask} from './incoming-group-name';
import {IncomingGroupSetupTask} from './incoming-group-setup';
import {IncomingGroupSyncRequestTask} from './incoming-group-sync-request';
import {OutgoingCspMessageTask} from './outgoing-csp-message';

/**
 * Ensure the provided timestamp on when a message has been created is not in
 * the future (clamp to _now_ if necessary).
 */
function getClampedCreatedAt(createdAtS: u53): Date {
    const createdAt = unixTimestamptoDateS(createdAtS);
    const now = new Date();
    return now < createdAt ? now : createdAt;
}

function getCommonMessageInitFragment(
    payload: structbuf.csp.payload.LegacyMessageLike,
    cspMessageBody: ReadonlyUint8Array,
): Omit<MessageFor<MessageDirection.INBOUND, MessageType, 'init'>, 'id' | 'sender' | 'type'> {
    return {
        createdAt: getClampedCreatedAt(payload.createdAt),
        receivedAt: new Date(), // Local date, to be replaced with reflection date later
        raw: cspMessageBody,
    };
}

function getTextMessageInitFragment(
    payload: structbuf.csp.payload.LegacyMessageLike,
    cspTextMessageBody: ReadonlyUint8Array,
    log: Logger,
    messageId: MessageId,
): InboundTextMessageInitFragment {
    const messageText = UTF8.decode(
        structbuf.csp.e2e.Text.decode(cspTextMessageBody as Uint8Array).text,
    );
    const possibleQuote = parsePossibleTextQuote(messageText, log, messageId);

    const text = possibleQuote?.comment ?? messageText;
    return {
        ...getCommonMessageInitFragment(payload, cspTextMessageBody),
        type: 'text',
        text,
        quotedMessageId: possibleQuote?.quotedMessageId,
    };
}

function getLocationMessageInitFragment(
    payload: structbuf.csp.payload.LegacyMessageLike,
    cspLocationMessageBody: ReadonlyUint8Array,
    log: Logger,
): InboundTextMessageInitFragment {
    // Decode location message as text message for now.
    // TODO(WEBMD-248): Full implementation
    const rawLocation = UTF8.decode(
        structbuf.csp.e2e.Location.decode(cspLocationMessageBody as Uint8Array).location,
    );
    const parsedLocation = parseLocation(rawLocation);
    if (parsedLocation === undefined) {
        log.warn(`Invalid location message: ${rawLocation}`);
        throw new Error('Invalid location message, could not parse');
    }
    return {
        ...getCommonMessageInitFragment(payload, cspLocationMessageBody),
        type: 'text',
        text: `📍 _Location:_ ${
            parsedLocation.name ?? parsedLocation.address
        }\nhttps://www.openstreetmap.org/?mlat=${parsedLocation.coordinates.lat}&mlon=${
            parsedLocation.coordinates.lon
        }&zoom=15`,
    };
}

function getDirectedTextMessageInit(
    id: MessageId,
    sender: UidOf<DbContact>,
    fragment: InboundTextMessageInitFragment,
): DirectedMessageFor<MessageDirection.INBOUND, MessageType.TEXT, 'init'> {
    return {
        ...fragment,
        direction: MessageDirection.INBOUND,
        sender,
        id,
    };
}

type D2dIncomingMessageFragment = Omit<
    protobuf.d2d.IncomingMessage,
    'messageId' | 'senderIdentity'
>;

function getD2dIncomingReflectFragment(
    d2dMessageType: D2dCspMessageType,
    cspMessageBody: ReadonlyUint8Array,
    createdAt: Date,
): D2dIncomingMessageFragment {
    return {
        createdAt: intoUnsignedLong(dateToUnixTimestampMs(createdAt)),
        type: d2dMessageType,
        body: cspMessageBody as Uint8Array,
    };
}

function getD2dIncomingMessage(
    id: MessageId,
    sender: IdentityString,
    fragment: D2dIncomingMessageFragment,
): protobuf.d2d.IncomingMessage {
    return protobuf.utils.creator(protobuf.d2d.IncomingMessage, {
        ...fragment,
        senderIdentity: sender,
        messageId: intoUnsignedLong(id),
    });
}

// Set of E2EE message types that may not be blocked under any circumstance
const BLOCK_EXEMPTION_TYPES: ReadonlySet<u53> = CspE2eGroupControlTypeUtils.ALL;

/**
 * The message processing instructions determine how an incoming message should be processed.
 */
type MessageProcessingInstructions =
    | ConversationMessageInstructions
    | GroupControlMessageInstructions
    | StatusUpdateInstructions
    | ForwardSecurityMessageInstructions
    | UnhandledMessageInstructions;

interface BaseProcessingInstructions {
    /**
     * A constant indicating the category (e.g. `conversation-message` or `status-update`).
     */
    readonly messageCategory: string;
    /**
     * Whether to send a delivery receipt of type RECEIVED for this message type. (May be overridden
     * by flags or by user settings.)
     */
    readonly deliveryReceipt: boolean;
    /**
     * Whether a new contact should be created for the sender, if the contact does not exist yet.
     *
     * - create: The contact will be created and processing continues.
     * - ignore: The contact won't be created, but the handling code (e.g. the task) may create it.
     * - discard: If the contact does not exist, then the contact will not be created and the
     *   message will be discarded.
     */
    readonly missingContactHandling: 'create' | 'ignore' | 'discard';
    /**
     * The {@link D2dIncomingMessageFragment} that should be reflected. Set to `undefined` if
     * nothing should be reflected.
     */
    readonly reflectFragment: D2dIncomingMessageFragment | undefined;
}

interface ConversationMessageInstructions extends BaseProcessingInstructions {
    readonly messageCategory: 'conversation-message';
    readonly conversationId: ContactConversationId | GroupConversationId;
    readonly missingContactHandling: 'create' | 'ignore';
    readonly initFragment: AnyInboundMessageInitFragment;
    readonly reflectFragment: D2dIncomingMessageFragment;
}

interface GroupControlMessageInstructions extends BaseProcessingInstructions {
    readonly messageCategory: 'group-control';
    readonly deliveryReceipt: false;
    readonly missingContactHandling: 'create' | 'ignore';
    readonly task: ComposableTask<ActiveTaskCodecHandle<'volatile'>, unknown>;
}

interface StatusUpdateInstructions extends BaseProcessingInstructions {
    readonly messageCategory: 'status-update';
    readonly deliveryReceipt: false;
    readonly missingContactHandling: 'discard';
    readonly reflectFragment: D2dIncomingMessageFragment;
    readonly task: ComposableTask<ActiveTaskCodecHandle<'volatile'>, unknown>;
}

interface ForwardSecurityMessageInstructions extends BaseProcessingInstructions {
    readonly messageCategory: 'forward-security';
    readonly deliveryReceipt: false;
    readonly missingContactHandling: 'create';
    readonly reflectFragment: undefined;
    readonly task: ComposableTask<ActiveTaskCodecHandle<'volatile'>, unknown>;
}

interface UnhandledMessageInstructions extends BaseProcessingInstructions {
    readonly messageCategory: 'unhandled';
    readonly conversationId: ContactConversationId | GroupConversationId;
    readonly runCommonGroupReceiveSteps: boolean;
    readonly missingContactHandling: 'create';
    readonly reflectFragment: D2dIncomingMessageFragment;
    readonly initFragment: AnyInboundMessageInitFragment | undefined;
}

type TaskResult = 'processed' | 'forwarded' | 'discarded';

/**
 * The incoming message task has the following responsibilities:
 *
 * - Download blobs (if any)
 * - Receive and decrypt message from CSP
 * - Potentially reflect message via D2D
 * - Ack Message Received to CSP
 * - Trigger Delivery Receipt
 */
export class IncomingMessageTask implements ActiveTask<void, 'volatile'> {
    public readonly type: ActiveTaskSymbol = ACTIVE_TASK;
    public readonly persist = false;
    public readonly transaction = undefined;
    private readonly _log: Logger;
    private readonly _message: structbuf.csp.payload.LegacyMessageLike;
    private readonly _id: MessageId;

    public constructor(
        private readonly _services: ServicesForTasks,
        message: structbuf.csp.payload.LegacyMessageLike,
    ) {
        const messageIdHex = message.messageId.toString(16);
        this._log = _services.logging.logger(`network.protocol.task.in-message.${messageIdHex}`);
        this._message = message;
        this._id = ensureMessageId(this._message.messageId);
    }

    public async run(handle: ActiveTaskCodecHandle<'volatile'>): Promise<void> {
        const result = await this._processIncomingCspMessage(handle);
        this._log.debug(`Task processing result: ${result}`);
        return undefined;
    }

    private async _processIncomingCspMessage(
        handle: ActiveTaskCodecHandle<'volatile'>,
    ): Promise<TaskResult> {
        const {device, model} = this._services;

        // Sanity check: Ensure that CSP messages are only received if we're the leader device
        assert(
            handle.controller.d2m.promotedToLeader.done,
            "Received incoming CSP message even though we weren't promoted to leader",
        );

        // Decode and validate provided identities
        let sender;
        {
            let receiver;
            try {
                [sender, receiver] = this._decodeIdentities();
            } catch (error) {
                this._log.warn(
                    `Discarding message with invalid sender or receiver identity: ${error}`,
                );
                return await this._discard(handle);
            }

            // Ensure the message is intended for us
            if (receiver !== device.identity.string) {
                this._log.warn(`Discarding message not intended for us, receiver: ${receiver}`);
                return await this._discard(handle);
            }

            // Ensure we're not holding a monologue...
            if (sender.string === device.identity.string) {
                this._log.warn('Discarding message that appears to be sent by ourselves');
                return await this._discard(handle);
            }
        }

        // Get the public key of the sender (and the contact model store, if
        // already existing).
        let senderContactOrInit: LocalModelStore<Contact> | ContactInit | undefined =
            model.contacts.getByIdentity(sender.string);
        if (senderContactOrInit === undefined) {
            // Get the nickname of the sender
            let nickname;
            try {
                nickname = this._decodeSenderNickname();
            } catch (error) {
                this._log.warn(`Discard message with invalid nickname: ${error}`);
                return await this._discard(handle);
            }

            // Fetch from contact directory
            try {
                senderContactOrInit = await this._getContactInit(sender.string, nickname);
            } catch (error) {
                // Note: We could handle this more generously (by ignoring the message and risk
                //       reordering) and/or try again a couple of times.
                this._log.warn(
                    'Unable to fetch from directory, will try again in the next connection',
                );
                throw ensureError(error);
            }
        }

        // Discard messages from revoked/invalid contacts
        if (
            senderContactOrInit === undefined ||
            (senderContactOrInit instanceof LocalModelStore &&
                senderContactOrInit.get().view.activityState === ActivityState.INVALID)
        ) {
            this._log.warn('Discarding message from a revoked or invalid sender');
            return await this._discard(handle);
        }

        // Decrypt and decode the message
        let container;
        try {
            container = this._decodeAndDecryptContainer(senderContactOrInit);
        } catch (error) {
            this._log.warn(`Discarding message that we could not decrypt or decode: ${error}`);
            return await this._discard(handle);
        }
        const type = container.type;

        // Debug info
        const messageTypeDebug = cspE2eTypeNameOf(type) ?? `<unknown> (0x${type.toString(16)})`;
        this._log.info(`Received incoming ${messageTypeDebug} message`);

        // Check if the message should be discarded due to the contact being
        // implicitly or explicitly blocked.
        //
        // TODO(WEBMD-560): Full-featured contact blocking logic
        if (
            this._isBlocked(sender.string, senderContactOrInit) &&
            !BLOCK_EXEMPTION_TYPES.has(type)
        ) {
            this._log.info(`Discarding message from blocked contact ${sender.string}`);
            return await this._discard(handle);
        }

        // Decode message and flags (default for the message) according to type
        this._log.debug(`Processing ${messageTypeDebug} message`);
        let cspMessageBody;
        try {
            cspMessageBody = byteWithoutPkcs7(container.paddedData);
        } catch (error) {
            this._log.info(`Discarding ${messageTypeDebug} message with invalid padding: ${error}`);
            return await this._discard(handle);
        }
        let instructions;
        try {
            instructions = this._getInstructionsForMessage(
                type,
                cspMessageBody,
                senderContactOrInit,
            );
        } catch (error) {
            this._log.info(`Discarding ${messageTypeDebug} message with invalid content: ${error}`);
            return await this._discard(handle);
        }
        if (instructions === 'discard') {
            this._log.info(`Discarding ${messageTypeDebug} message`);
            return await this._discard(handle);
        } else if (instructions === 'forward') {
            return await this._forward(handle, container);
        }

        // Note: At this point we are past the validation phase and further
        //       interactions are infallible (i.e. if they fail, then the
        //       whole connection gets teared down).

        // Determine flags
        const flags = CspMessageFlags.fromBitmask(this._message.flags);

        // Sync the contact within a transaction and store it permanently,
        // if necessary.
        if (!(senderContactOrInit instanceof LocalModelStore)) {
            // Note: Some message types (e.g. status messages) should not trigger implicit contact
            //       creation. In this case, the message should be discarded without reflection,
            //       because without the contact (and a conversation belonging to this contact), the
            //       message cannot be processed anyways.
            switch (instructions.missingContactHandling) {
                case 'create':
                    try {
                        senderContactOrInit = await model.contacts.add.fromRemote(
                            handle,
                            senderContactOrInit,
                        );
                    } catch (error) {
                        this._log.warn(`Unable to reflect and locally store contact: ${error}`);
                        throw ensureError(error);
                    }
                    break;
                case 'discard':
                    this._log.info(`Discarding ${messageTypeDebug} message from unknown contact`);
                    return await this._discard(handle);
                case 'ignore':
                    // Carry on!
                    break;
                default:
                    unreachable(instructions);
            }
        }

        // For group conversation messages, run the common group receive steps
        let group: LocalModelStore<Group> | undefined = undefined;
        if (
            (instructions.messageCategory === 'conversation-message' &&
                instructions.conversationId.type === ReceiverType.GROUP) ||
            (instructions.messageCategory === 'unhandled' &&
                instructions.conversationId.type === ReceiverType.GROUP &&
                instructions.runCommonGroupReceiveSteps)
        ) {
            const receiveStepsResult = await commonGroupReceiveSteps(
                instructions.conversationId.groupId,
                instructions.conversationId.creatorIdentity,
                senderContactOrInit,
                handle,
                this._services,
                this._log,
            );
            if (receiveStepsResult === undefined) {
                this._log.info(`Discarding ${messageTypeDebug} group message`);
                return await this._discard(handle);
            } else {
                group = receiveStepsResult.group;
                senderContactOrInit = receiveStepsResult.senderContact;
            }
        }

        // Reflect the message and wait for D2M acknowledgement
        // TODO(WEBMD-561): Remove the following lint suppression
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (instructions.reflectFragment !== undefined) {
            this._log.info(`Reflecting incoming ${messageTypeDebug} message`);
            let incomingMessageReflectedAt;
            try {
                incomingMessageReflectedAt = await this._reflectMessage(
                    handle,
                    instructions.reflectFragment,
                    sender.string,
                );
            } catch (error) {
                this._log.warn(`Failed to reflect ${messageTypeDebug} message: ${error}`);
                throw ensureError(error);
            }

            // Correct the `receivedAt` timestamp for certain message types
            switch (instructions.messageCategory) {
                case 'conversation-message':
                case 'unhandled':
                    if (instructions.initFragment !== undefined) {
                        instructions.initFragment.receivedAt = incomingMessageReflectedAt;
                    }
                    break;
                case 'status-update':
                case 'group-control':
                    break;
                default:
                    unreachable(instructions);
            }
        }

        // Process / save the message
        switch (instructions.messageCategory) {
            case 'conversation-message':
            case 'unhandled': {
                // Assert that sender contact exists:
                // - For contact conversation messages, it should have been created in the incoming
                //   message task above (missingContactHandling=create).
                // - For group conversation messages, it should have been created by the common
                //   group receive steps.
                assert(
                    senderContactOrInit instanceof LocalModelStore,
                    'Contact should have been created by IncomingMessageTask, but was not',
                );

                // Look up conversation
                let conversation: LocalModelStore<Conversation>;
                switch (instructions.conversationId.type) {
                    case ReceiverType.CONTACT:
                        conversation = senderContactOrInit.get().controller.conversation();
                        break;
                    case ReceiverType.GROUP:
                        assert(
                            group !== undefined,
                            'Group should have been defined by IncomingMessageTask, but was not',
                        );
                        conversation = group.get().controller.conversation();
                        break;
                    default:
                        unreachable(instructions.conversationId);
                }

                // Discard message if it has been already received
                if (conversation.get().controller.hasMessage(this._id)) {
                    this._log.warn(
                        `Discarding ${messageTypeDebug} message ${u64ToHexLe(
                            this._id,
                        )} as it was already received`,
                    );
                    return await this._discard(handle);
                }

                // Add message to conversation
                this._log.debug(`Saving ${messageTypeDebug} message`);
                if (instructions.initFragment !== undefined) {
                    await conversation
                        .get()
                        .controller.addMessage.fromRemote(
                            handle,
                            this._getDirectedMessageInit(
                                instructions.initFragment,
                                senderContactOrInit,
                            ),
                        );
                }
                break;
            }
            case 'group-control':
            case 'status-update':
            case 'forward-security':
                this._log.debug('Running the sub-task');
                await instructions.task.run(handle);
                break;
            default:
                unreachable(instructions);
        }

        // Send a CSP acknowledgement, if necessary
        if (!flags.dontAck) {
            this._log.debug(`Acknowledging ${messageTypeDebug} message`);
            try {
                await this._acknowledgeMessage(handle);
            } catch (error) {
                this._log.warn(`Failed to acknowledge ${messageTypeDebug} message: ${error}`);
                throw ensureError(error);
            }
        }

        // Send a delivery receipt to sender, if necessary
        if (
            instructions.deliveryReceipt &&
            !flags.dontSendDeliveryReceipts &&
            senderContactOrInit instanceof LocalModelStore
        ) {
            // Note: Not using the `OutgoingDeliveryReceiptTask` here because sending the "received"
            //       delivery receipt should not be persistent. If the processing of an incoming
            //       message does not complete successfully, the message will not be acked and will
            //       be re-processed later, that's why we don't need persistence for the delivery
            //       receipt.
            await new OutgoingCspMessageTask(this._services, senderContactOrInit.get(), {
                type: CspE2eStatusUpdateType.DELIVERY_RECEIPT,
                encoder: structbuf.bridge.encoder(structbuf.csp.e2e.DeliveryReceipt, {
                    messageIds: [this._id],
                    status: CspE2eDeliveryReceiptStatus.RECEIVED,
                }),
                cspMessageFlags: CspMessageFlags.none(),
                messageId: randomMessageId(this._services.crypto),
                createdAt: instructions.initFragment?.receivedAt ?? new Date(),
                allowUserProfileDistribution: false,
            }).run(handle);
        }

        // Done
        return 'processed';
    }

    /**
     * Acknowledge a message towards the chat server (if necessary) and discard it.
     */
    private async _discard(handle: ActiveTaskCodecHandle<'volatile'>): Promise<'discarded'> {
        // Send a CSP acknowledgement, if necessary
        // eslint-disable-next-line no-bitwise
        if ((this._message.flags & CspMessageFlag.DONT_ACK) === 0) {
            this._log.debug('Acknowledging discarded message');
            try {
                await this._acknowledgeMessage(handle);
            } catch (error) {
                this._log.warn(`Failed to acknowledge discarded message: ${error}`);
                throw ensureError(error);
            }
        }
        return 'discarded';
    }

    // eslint-disable-next-line @typescript-eslint/require-await
    private async _forward(
        handle: ActiveTaskCodecHandle<'volatile'>,
        container: structbuf.csp.e2e.Container,
    ): Promise<'forwarded'> {
        this._log.error(
            `TODO(WEBMD-194): Forwarding of message with unknown inbound CSP E2E type ${
                container.type
            } (${cspE2eTypeNameOf(container.type)})`,
        );
        // TODO(WEBMD-194): Implement forwarding of unknown message types, ignoring for now
        return 'forwarded';
    }

    private _decodeIdentities(): [sender: Identity, receiver: string] {
        // Decode and validate provided identities
        //
        // Note: We do not ensure that the receiver is an identity
        //       string because we compare it directly against our
        //       own identity string in a following step.
        const sender = new Identity(
            ensureIdentityString(UTF8.decode(this._message.senderIdentity)),
        );
        const receiver = UTF8.decode(this._message.receiverIdentity);
        return [sender, receiver];
    }

    private _decodeSenderNickname(): string {
        // Ignore the zero-padding, then decode as UTF-8
        return UTF8.decode(byteWithoutZeroPadding(this._message.senderNickname));
    }

    /**
     * Fetch identity data for the specified identity string and return a {@link ContactInit}.
     *
     * @returns the {@link ContactInit} object, or `undefined` if contact is invalid or has been
     *   revoked
     * @throws {DirectoryError} if directory fetch failed.
     */
    private async _getContactInit(
        sender: IdentityString,
        nickname: string,
    ): Promise<ContactInit | undefined> {
        const {directory} = this._services;
        const fetched = await directory.identity(sender);
        if (fetched.state === ActivityState.INVALID) {
            return undefined;
        }
        return {
            identity: sender,
            publicKey: fetched.publicKey,
            firstName: '',
            lastName: '',
            nickname,
            colorIndex: idColorIndex({type: ReceiverType.CONTACT, identity: sender}),
            createdAt: new Date(),
            verificationLevel: VerificationLevel.UNVERIFIED,
            workVerificationLevel: WorkVerificationLevel.NONE,
            identityType: fetched.type,
            acquaintanceLevel: AcquaintanceLevel.DIRECT,
            featureMask: fetched.featureMask,
            syncState: SyncState.INITIAL,
            activityState: fetched.state,
            category: ConversationCategory.DEFAULT,
            visibility: ConversationVisibility.SHOW,
        };
    }

    private _decodeAndDecryptContainer(
        contactOrInit: LocalModelStore<Contact> | ContactInit,
    ): structbuf.csp.e2e.Container {
        const {device} = this._services;
        return structbuf.csp.e2e.Container.decode(
            device.csp.ck
                .getSharedBox(
                    contactOrInit instanceof LocalModelStore
                        ? contactOrInit.get().view.publicKey
                        : contactOrInit.publicKey,
                    device.csp.nonceGuard,
                )
                .decryptorWithNonce(
                    CREATE_BUFFER_TOKEN,
                    this._message.messageNonce as Nonce,
                    this._message.messageBox as EncryptedData,
                )
                .decrypt(),
        );
    }

    private _isBlocked(
        sender: IdentityString,
        contactOrInit: LocalModelStore<Contact> | ContactInit,
    ): boolean {
        const {model} = this._services;
        return (
            (!(contactOrInit instanceof LocalModelStore) && model.settings.blockUnknown) ||
            model.settings.contactIsBlocked(sender)
        );
    }

    private _getInstructionsForMessage(
        type: u53,
        cspMessageBody: ReadonlyUint8Array,
        senderContactOrInit: LocalModelStore<Contact> | ContactInit,
    ): MessageProcessingInstructions | 'forward' | 'discard' {
        const message = this._message;
        const clampedCreatedAt = getClampedCreatedAt(message.createdAt);
        const messageId = ensureMessageId(message.messageId);

        // Determine sender identity and conversation ID
        let senderIdentity;
        if (senderContactOrInit instanceof LocalModelStore) {
            senderIdentity = senderContactOrInit.get().view.identity;
        } else {
            senderIdentity = senderContactOrInit.identity;
        }
        const senderConversationId: ContactConversationId = {
            type: ReceiverType.CONTACT,
            identity: senderIdentity,
        };

        function reflectFragmentFor(d2dMessageType: D2dCspMessageType): D2dIncomingMessageFragment {
            return getD2dIncomingReflectFragment(d2dMessageType, cspMessageBody, clampedCreatedAt);
        }

        function unhandled(
            d2dMessageType: D2dCspMessageType,
            deliveryReceipt: boolean,
            runCommonGroupReceiveSteps = false,
            conversationId: ContactConversationId | GroupConversationId = senderConversationId,
        ): UnhandledMessageInstructions {
            const text = placeholderTextForUnhandledMessage(d2dMessageType);

            const initFragment =
                text === undefined
                    ? undefined
                    : ({
                          type: 'text',
                          ...getCommonMessageInitFragment(message, cspMessageBody),
                          text,
                      } as const);

            return {
                messageCategory: 'unhandled',
                conversationId,
                missingContactHandling: 'create',
                deliveryReceipt,
                runCommonGroupReceiveSteps,
                reflectFragment: reflectFragmentFor(d2dMessageType),
                initFragment,
            };
        }

        function unhandledGroupCreatorMessage(
            d2dMessageType:
                | CspE2eGroupConversationType
                | CspE2eGroupStatusUpdateType
                | CspE2eGroupControlType.GROUP_SET_PROFILE_IMAGE
                | CspE2eGroupControlType.GROUP_DELETE_PROFILE_IMAGE,
            creatorIdentity: IdentityString,
        ): UnhandledMessageInstructions {
            const validatedContainer = validate.csp.e2e.GroupCreatorContainer.SCHEMA.parse(
                structbuf.csp.e2e.GroupCreatorContainer.decode(cspMessageBody as Uint8Array),
            );
            const conversationId: GroupConversationId = {
                type: ReceiverType.GROUP,
                groupId: validatedContainer.groupId,
                creatorIdentity,
            };
            return unhandled(d2dMessageType, false, true, conversationId);
        }

        function unhandledGroupMemberMessage(
            d2dMessageType:
                | CspE2eGroupConversationType
                | CspE2eGroupStatusUpdateType
                | CspE2eGroupControlType.GROUP_CALL_START,
        ): UnhandledMessageInstructions {
            const validatedContainer = validate.csp.e2e.GroupMemberContainer.SCHEMA.parse(
                structbuf.csp.e2e.GroupMemberContainer.decode(cspMessageBody as Uint8Array),
            );
            const conversationId: GroupConversationId = {
                type: ReceiverType.GROUP,
                groupId: validatedContainer.groupId,
                creatorIdentity: validatedContainer.creatorIdentity,
            };
            return unhandled(d2dMessageType, false, true, conversationId);
        }

        // Exhaustively match all CSP E2E message types
        const maybeCspE2eType = type as CspE2eType;
        switch (maybeCspE2eType) {
            // Conversation messages
            case CspE2eConversationType.TEXT: {
                const initFragment = getTextMessageInitFragment(
                    message,
                    cspMessageBody,
                    this._log,
                    this._id,
                );
                const instructions: ConversationMessageInstructions = {
                    messageCategory: 'conversation-message',
                    conversationId: senderConversationId,
                    missingContactHandling: 'create',
                    deliveryReceipt: true,
                    initFragment,
                    reflectFragment: reflectFragmentFor(maybeCspE2eType),
                };
                return instructions;
            }
            case CspE2eGroupConversationType.GROUP_TEXT: {
                // TODO(WEBMD-307): Rule-of-three: Refactor shared logic for handling of group- and
                // non-group conversation messages once we implement file messages.

                // A group text message is wrapped in a group-member-container
                const validatedContainer = validate.csp.e2e.GroupMemberContainer.SCHEMA.parse(
                    structbuf.csp.e2e.GroupMemberContainer.decode(cspMessageBody as Uint8Array),
                );
                const initFragment = getTextMessageInitFragment(
                    message,
                    validatedContainer.innerData,
                    this._log,
                    this._id,
                );
                const instructions: ConversationMessageInstructions = {
                    messageCategory: 'conversation-message',
                    conversationId: {
                        type: ReceiverType.GROUP,
                        groupId: validatedContainer.groupId,
                        creatorIdentity: validatedContainer.creatorIdentity,
                    },
                    missingContactHandling: 'ignore',
                    deliveryReceipt: false,
                    initFragment,
                    reflectFragment: reflectFragmentFor(maybeCspE2eType),
                };
                return instructions;
            }
            case CspE2eConversationType.LOCATION: {
                const instructions: ConversationMessageInstructions = {
                    messageCategory: 'conversation-message',
                    conversationId: senderConversationId,
                    missingContactHandling: 'create',
                    deliveryReceipt: true,
                    initFragment: getLocationMessageInitFragment(
                        message,
                        cspMessageBody,
                        this._log,
                    ),
                    reflectFragment: reflectFragmentFor(protobuf.d2d.MessageType.LOCATION),
                };
                return instructions;
            }
            case CspE2eGroupConversationType.GROUP_LOCATION: {
                // A group location message is wrapped in a group-member-container
                const validatedContainer = validate.csp.e2e.GroupMemberContainer.SCHEMA.parse(
                    structbuf.csp.e2e.GroupMemberContainer.decode(cspMessageBody as Uint8Array),
                );
                const instructions: ConversationMessageInstructions = {
                    messageCategory: 'conversation-message',
                    conversationId: {
                        type: ReceiverType.GROUP,
                        groupId: validatedContainer.groupId,
                        creatorIdentity: validatedContainer.creatorIdentity,
                    },
                    missingContactHandling: 'ignore',
                    deliveryReceipt: false,
                    initFragment: getLocationMessageInitFragment(
                        message,
                        validatedContainer.innerData,
                        this._log,
                    ),
                    reflectFragment: reflectFragmentFor(protobuf.d2d.MessageType.GROUP_LOCATION),
                };
                return instructions;
            }

            // Contact control messages
            case CspE2eContactControlType.CONTACT_SET_PROFILE_IMAGE:
            case CspE2eContactControlType.CONTACT_DELETE_PROFILE_IMAGE:
                // TODO(WEBMD-561): Implement
                return 'discard';
            case CspE2eContactControlType.CONTACT_REQUEST_PROFILE_IMAGE:
                // TODO(WEBMD-590): Implement
                return 'discard';

            // Group control messages
            case CspE2eGroupControlType.GROUP_SETUP: {
                // A group-setup message is wrapped in a group-creator-container
                const validatedContainer = validate.csp.e2e.GroupCreatorContainer.SCHEMA.parse(
                    structbuf.csp.e2e.GroupCreatorContainer.decode(cspMessageBody as Uint8Array),
                );
                const validatedGroupSetup = validate.csp.e2e.GroupSetup.SCHEMA.parse(
                    structbuf.csp.e2e.GroupSetup.decode(validatedContainer.innerData),
                );
                // The group-setup message is a bit special, as it may need to create and reflect
                // some contacts (of its members) _before_ the group-setup message itself is
                // reflected. Thus, we set the `reflectFragment` below to `undefined`, but pass the
                // ready-to-reflect `reflectGroupSetup` message to the task. The task will then be
                // responsible for reflecting this message at the appropriate point in time.
                const reflectGroupSetup = getD2dIncomingMessage(
                    this._id,
                    senderIdentity,
                    reflectFragmentFor(maybeCspE2eType),
                );
                const instructions: GroupControlMessageInstructions = {
                    messageCategory: 'group-control',
                    // Group name messages are sent by creator. Since the creator has interacted
                    // directly with us, add the contact with acquaintance level DIRECT.
                    missingContactHandling: 'create',
                    deliveryReceipt: false,
                    task: new IncomingGroupSetupTask(
                        this._services,
                        messageId,
                        senderIdentity,
                        validatedContainer,
                        validatedGroupSetup,
                        reflectGroupSetup,
                    ),
                    reflectFragment: undefined,
                };
                return instructions;
            }
            case CspE2eGroupControlType.GROUP_NAME: {
                // A group-name message is wrapped in a group-creator-container
                const validatedContainer = validate.csp.e2e.GroupCreatorContainer.SCHEMA.parse(
                    structbuf.csp.e2e.GroupCreatorContainer.decode(cspMessageBody as Uint8Array),
                );
                const validatedGroupName = validate.csp.e2e.GroupName.SCHEMA.parse(
                    structbuf.csp.e2e.GroupName.decode(validatedContainer.innerData),
                );
                const instructions: GroupControlMessageInstructions = {
                    messageCategory: 'group-control',
                    // Group name messages are sent by creator. Since the creator has interacted
                    // directly with us, add the contact with acquaintance level DIRECT.
                    missingContactHandling: 'create',
                    deliveryReceipt: false,
                    task: new IncomingGroupNameTask(
                        this._services,
                        messageId,
                        senderContactOrInit,
                        validatedContainer,
                        validatedGroupName,
                    ),
                    reflectFragment: reflectFragmentFor(maybeCspE2eType),
                };
                return instructions;
            }
            case CspE2eGroupControlType.GROUP_LEAVE: {
                // A group-leave message is wrapped in a group-member-container
                const validatedContainer = validate.csp.e2e.GroupMemberContainer.SCHEMA.parse(
                    structbuf.csp.e2e.GroupMemberContainer.decode(cspMessageBody as Uint8Array),
                );
                const instructions: GroupControlMessageInstructions = {
                    messageCategory: 'group-control',
                    missingContactHandling: 'ignore',
                    deliveryReceipt: false,
                    task: new IncomingGroupLeaveTask(
                        this._services,
                        messageId,
                        senderContactOrInit,
                        validatedContainer,
                    ),
                    reflectFragment: reflectFragmentFor(maybeCspE2eType),
                };
                return instructions;
            }
            case CspE2eGroupControlType.GROUP_REQUEST_SYNC: {
                // A group-sync-request message is wrapped in a group-creator-container
                const validatedContainer = validate.csp.e2e.GroupCreatorContainer.SCHEMA.parse(
                    structbuf.csp.e2e.GroupCreatorContainer.decode(cspMessageBody as Uint8Array),
                );
                const instructions: GroupControlMessageInstructions = {
                    messageCategory: 'group-control',
                    missingContactHandling: 'ignore',
                    deliveryReceipt: false,
                    task: new IncomingGroupSyncRequestTask(
                        this._services,
                        messageId,
                        senderContactOrInit,
                        validatedContainer,
                    ),
                    reflectFragment: reflectFragmentFor(maybeCspE2eType),
                };
                return instructions;
            }

            // Status messages
            case CspE2eStatusUpdateType.DELIVERY_RECEIPT: {
                const deliveryReceipt = structbuf.csp.e2e.DeliveryReceipt.decode(
                    cspMessageBody as Uint8Array,
                );
                const validatedDeliveryReceipt =
                    structbuf.validate.csp.e2e.DeliveryReceipt.SCHEMA.parse(deliveryReceipt);
                const instructions: StatusUpdateInstructions = {
                    messageCategory: 'status-update',
                    missingContactHandling: 'discard',
                    deliveryReceipt: false,
                    task: new IncomingDeliveryReceiptTask(
                        this._services,
                        messageId,
                        senderConversationId,
                        validatedDeliveryReceipt,
                        clampedCreatedAt,
                    ),
                    reflectFragment: reflectFragmentFor(maybeCspE2eType),
                };
                return instructions;
            }
            case CspE2eStatusUpdateType.TYPING_INDICATOR:
                // TODO(WEBMD-589): Implement
                return 'discard';

            // Forward security messages (not currently supported)
            case CspE2eForwardSecurityType.FORWARD_SECURITY_ENVELOPE: {
                // TODO(WEBMD-887): Implement support for PFS
                const fsEnvelope = protobuf.csp_e2e_fs.ForwardSecurityEnvelope.decode(
                    cspMessageBody as Uint8Array,
                    cspMessageBody.byteLength,
                );
                const instructions: ForwardSecurityMessageInstructions = {
                    messageCategory: 'forward-security',
                    deliveryReceipt: false,
                    missingContactHandling: 'create',
                    reflectFragment: undefined,
                    task: new IncomingForwardSecurityEnvelopeTask(
                        this._services,
                        messageId,
                        senderContactOrInit,
                        fsEnvelope,
                    ),
                };
                return instructions;
            }

            // Forwarding of known but unhandled messages. These messages will be reflected and
            // discarded. The messages won't appear in Threema Desktop, but they will appear on
            // synchronized devices that support these message types.
            case CspE2eConversationType.DEPRECATED_IMAGE: // TODO(WEBMD-586)
                return unhandled(maybeCspE2eType, true);
            case CspE2eConversationType.DEPRECATED_AUDIO: // TODO(WEBMD-586)
                return unhandled(maybeCspE2eType, true);
            case CspE2eConversationType.DEPRECATED_VIDEO: // TODO(WEBMD-586)
                return unhandled(maybeCspE2eType, true);
            case CspE2eConversationType.FILE: // TODO(WEBMD-307)
                return unhandled(maybeCspE2eType, true);
            case CspE2eConversationType.POLL_SETUP: // TODO(WEBMD-244)
                return unhandled(maybeCspE2eType, true);
            case CspE2eConversationType.POLL_VOTE: // TODO(WEBMD-244)
                return unhandled(maybeCspE2eType, false);
            case CspE2eConversationType.CALL_OFFER: // TODO(WEBMD-243)
                return unhandled(maybeCspE2eType, false);
            case CspE2eConversationType.CALL_ANSWER: // TODO(WEBMD-243)
                return unhandled(maybeCspE2eType, false);
            case CspE2eConversationType.CALL_ICE_CANDIDATE: // TODO(WEBMD-243)
                return unhandled(maybeCspE2eType, false);
            case CspE2eConversationType.CALL_HANGUP: // TODO(WEBMD-243)
                return unhandled(maybeCspE2eType, false);
            case CspE2eConversationType.CALL_RINGING: // TODO(WEBMD-243)
                return unhandled(maybeCspE2eType, false);
            case CspE2eGroupControlType.GROUP_CALL_START: // TODO(WEBMD-858)
                return unhandledGroupMemberMessage(maybeCspE2eType);
            case CspE2eGroupConversationType.DEPRECATED_GROUP_IMAGE: // TODO(WEBMD-586)
                return unhandledGroupMemberMessage(maybeCspE2eType);
            case CspE2eGroupConversationType.GROUP_AUDIO: // TODO(WEBMD-586)
                return unhandledGroupMemberMessage(maybeCspE2eType);
            case CspE2eGroupConversationType.GROUP_VIDEO: // TODO(WEBMD-586)
                return unhandledGroupMemberMessage(maybeCspE2eType);
            case CspE2eGroupConversationType.GROUP_FILE: // TODO(WEBMD-307)
                return unhandledGroupMemberMessage(maybeCspE2eType);
            case CspE2eGroupConversationType.GROUP_POLL_SETUP: // TODO(WEBMD-244)
                return unhandledGroupMemberMessage(maybeCspE2eType);
            case CspE2eGroupConversationType.GROUP_POLL_VOTE: // TODO(WEBMD-244)
                return unhandledGroupMemberMessage(maybeCspE2eType);
            case CspE2eGroupStatusUpdateType.GROUP_DELIVERY_RECEIPT: // TODO(WEBMD-594)
                return unhandledGroupMemberMessage(maybeCspE2eType);
            case CspE2eGroupControlType.GROUP_SET_PROFILE_IMAGE: // TODO(WEBMD-561)
                return unhandledGroupCreatorMessage(maybeCspE2eType, senderIdentity);
            case CspE2eGroupControlType.GROUP_DELETE_PROFILE_IMAGE: // TODO(WEBMD-561)
                return unhandledGroupCreatorMessage(maybeCspE2eType, senderIdentity);

            default:
                return exhausted(maybeCspE2eType, 'forward');
        }
    }

    /**
     * Reflect an incoming message with the specified {@link reflectFragment}, return the reflection
     * timestamp.
     */
    private async _reflectMessage(
        handle: ActiveTaskCodecHandle<'volatile'>,
        reflectFragment: D2dIncomingMessageFragment,
        sender: IdentityString,
    ): Promise<Date> {
        const [reflectedAt] = await handle.reflect([
            {
                incomingMessage: getD2dIncomingMessage(this._id, sender, reflectFragment),
            },
        ]);
        return reflectedAt;
    }

    private async _acknowledgeMessage(handle: ActiveTaskCodecHandle<'volatile'>): Promise<void> {
        await handle.write({
            type: D2mPayloadType.PROXY,
            payload: {
                type: CspPayloadType.INCOMING_MESSAGE_ACK,
                payload: structbuf.bridge.encoder(structbuf.csp.payload.MessageAck, {
                    identity: this._message.senderIdentity,
                    messageId: this._id,
                }),
            },
        });
    }

    private _getDirectedMessageInit(
        initFragment: Readonly<AnyInboundMessageInitFragment>,
        contact: LocalModelStore<Contact>,
    ): DirectedMessageFor<MessageDirection.INBOUND, MessageType, 'init'> {
        switch (initFragment.type) {
            case MessageType.TEXT:
                return getDirectedTextMessageInit(this._id, contact.get().ctx, initFragment);
            case MessageType.FILE:
                throw new Error('TODO(WEBMD-307): Implement file message');
            default:
                return unreachable(initFragment);
        }
    }
}
