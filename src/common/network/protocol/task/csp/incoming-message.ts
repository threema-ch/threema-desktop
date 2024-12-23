/**
 * Incoming message task.
 */
import type {EncryptedData, Nonce, PublicKey} from '~/common/crypto';
import {CREATE_BUFFER_TOKEN} from '~/common/crypto/box';
import {deriveMessageMetadataKey} from '~/common/crypto/csp-keys';
import type {INonceGuard} from '~/common/crypto/nonce';
import type {DbContact, UidOf} from '~/common/db';
import {
    AcquaintanceLevel,
    CspE2eContactControlType,
    CspE2eConversationType,
    CspE2eDeliveryReceiptStatus,
    CspE2eForwardSecurityType,
    CspE2eGroupControlType,
    CspE2eGroupConversationType,
    CspE2eGroupStatusUpdateType,
    CspE2eStatusUpdateType,
    type D2dCspMessageType,
    MessageDirection,
    ReceiverType,
    CspE2eWebSessionResumeType,
    CspE2eMessageUpdateType,
    CspE2eGroupMessageUpdateType,
    MessageType,
} from '~/common/enum';
import type {Logger} from '~/common/logging';
import type {
    Contact,
    ContactInit,
    Conversation,
    DirectedMessageFor,
    Group,
    MessageFor,
} from '~/common/model';
import {isSpecialContact, type ContactInitFragment} from '~/common/model/types/contact';
import type {AnyNonDeletedMessageType} from '~/common/model/types/message';
import {ModelStore} from '~/common/model/utils/model-store';
import * as protobuf from '~/common/network/protobuf';
import {
    type CspE2eType,
    cspE2eTypeNameOf,
    CspMessageFlag,
    CspPayloadType,
    D2mPayloadType,
    isCspE2eType,
    MESSAGE_TYPE_PROPERTIES,
} from '~/common/network/protocol';
import {CspMessageFlags, D2mMessageFlags} from '~/common/network/protocol/flags';
import {
    ACTIVE_TASK,
    type ActiveTask,
    type ActiveTaskCodecHandle,
    type ActiveTaskSymbol,
    type ComposableTask,
    placeholderTextForUnhandledMessage,
    type ServicesForTasks,
} from '~/common/network/protocol/task';
import {validContactsLookupSteps} from '~/common/network/protocol/task/common/contact-helper';
import {
    getFileBasedMessageTypeAndExtraProperties,
    messageStoreHasThumbnail,
} from '~/common/network/protocol/task/common/file';
import {commonGroupReceiveSteps} from '~/common/network/protocol/task/common/group-helpers';
import {getTextForLocation} from '~/common/network/protocol/task/common/location';
import {parsePossibleTextQuote} from '~/common/network/protocol/task/common/quotes';
import {IncomingContactProfilePictureTask} from '~/common/network/protocol/task/csp/incoming-contact-profile-picture';
import {IncomingDeliveryReceiptTask} from '~/common/network/protocol/task/csp/incoming-delivery-receipt';
import {IncomingForwardSecurityEnvelopeTask} from '~/common/network/protocol/task/csp/incoming-fs-envelope';
import {IncomingGroupCallStartTask} from '~/common/network/protocol/task/csp/incoming-group-call-start';
import {IncomingGroupLeaveTask} from '~/common/network/protocol/task/csp/incoming-group-leave';
import {IncomingGroupNameTask} from '~/common/network/protocol/task/csp/incoming-group-name';
import {IncomingGroupProfilePictureTask} from '~/common/network/protocol/task/csp/incoming-group-profile-picture';
import {IncomingGroupSetupTask} from '~/common/network/protocol/task/csp/incoming-group-setup';
import {IncomingGroupSyncRequestTask} from '~/common/network/protocol/task/csp/incoming-group-sync-request';
import {IncomingMessageContentUpdateTask} from '~/common/network/protocol/task/csp/incoming-message-content-update';
import {IncomingTypingIndicatorTask} from '~/common/network/protocol/task/csp/incoming-typing-indicator';
import {OutgoingCspMessagesTask} from '~/common/network/protocol/task/csp/outgoing-csp-messages';
import {
    messageReferenceDebugFor,
    type AnyInboundMessageInitFragment,
    type InboundAudioMessageInitFragment,
    type InboundFileMessageInitFragment,
    type InboundImageMessageInitFragment,
    type InboundTextMessageInitFragment,
    type InboundVideoMessageInitFragment,
} from '~/common/network/protocol/task/message-processing-helpers';
import {randomMessageId} from '~/common/network/protocol/utils';
import * as structbuf from '~/common/network/structbuf';
import type {MessageWithMetadataBoxLike} from '~/common/network/structbuf/csp/payload';
import {
    type ContactConversationId,
    ensureIdentityString,
    ensureMessageId,
    type GroupConversationId,
    type IdentityString,
    isNickname,
    type MessageId,
} from '~/common/network/types';
import type {ReadonlyUint8Array, u53, u8} from '~/common/types';
import {assert, ensureError, exhausted, unreachable} from '~/common/utils/assert';
import {byteWithoutPkcs7, byteWithoutZeroPadding} from '~/common/utils/byte';
import {UTF8} from '~/common/utils/codec';
import {Identity} from '~/common/utils/identity';
import {
    dateToUnixTimestampMs,
    intoU64,
    intoUnsignedLong,
    u64ToHexLe,
    unixTimestampToDateS,
} from '~/common/utils/number';

/**
 * Ensure the provided timestamp on when a message has been created is not in
 * the future (clamp to _now_ if necessary).
 */
function getClampedCreatedAt(createdAt: Date): Date {
    const now = new Date();
    return now < createdAt ? now : createdAt;
}

function getCommonMessageInitFragment(
    createdAt: Date,
    cspMessageBody: ReadonlyUint8Array,
): Omit<MessageFor<MessageDirection.INBOUND, MessageType, 'init'>, 'id' | 'sender' | 'type'> {
    return {
        createdAt,
        receivedAt: new Date(), // Local date, to be replaced with reflection date later
        raw: cspMessageBody,
    };
}

function getTextMessageInitFragment(
    createdAt: Date,
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
        ...getCommonMessageInitFragment(createdAt, cspTextMessageBody),
        type: 'text',
        text,
        quotedMessageId: possibleQuote?.quotedMessageId,
    };
}

function getFileMessageInitFragment(
    createdAt: Date,
    cspFileMessageBody: ReadonlyUint8Array,
    log: Logger,
):
    | InboundFileMessageInitFragment
    | InboundImageMessageInitFragment
    | InboundVideoMessageInitFragment
    | InboundAudioMessageInitFragment {
    // Decode file message
    const fileData = structbuf.validate.csp.e2e.File.SCHEMA.parse(
        structbuf.csp.e2e.File.decode(cspFileMessageBody as Uint8Array),
    ).file;

    return {
        ...getCommonMessageInitFragment(createdAt, cspFileMessageBody),
        blobId: fileData.file.blobId,
        thumbnailBlobId: fileData.thumbnail?.blobId,
        encryptionKey: fileData.encryptionKey,
        mediaType: fileData.file.mediaType,
        thumbnailMediaType: fileData.thumbnail?.mediaType,
        fileName: fileData.fileName,
        fileSize: fileData.fileSize,
        caption: fileData.caption,
        correlationId: fileData.correlationId,
        ...getFileBasedMessageTypeAndExtraProperties(fileData, log),
    };
}

function getLocationMessageInitFragment(
    createdAt: Date,
    cspLocationMessageBody: ReadonlyUint8Array,
): InboundTextMessageInitFragment {
    // Decode location message as text message for now.
    // TODO(DESK-248): Full implementation
    const location = structbuf.validate.csp.e2e.Location.SCHEMA.parse(
        structbuf.csp.e2e.Location.decode(cspLocationMessageBody as Uint8Array),
    );
    return {
        ...getCommonMessageInitFragment(createdAt, cspLocationMessageBody),
        type: 'text',
        text: getTextForLocation(location.location),
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

function getDirectedFileMessageInit(
    id: MessageId,
    sender: UidOf<DbContact>,
    fragment: InboundFileMessageInitFragment,
): DirectedMessageFor<MessageDirection.INBOUND, MessageType.FILE, 'init'> {
    return {
        ...fragment,
        direction: MessageDirection.INBOUND,
        sender,
        id,
    };
}

function getDirectedImageMessageInit(
    id: MessageId,
    sender: UidOf<DbContact>,
    fragment: InboundImageMessageInitFragment,
): DirectedMessageFor<MessageDirection.INBOUND, MessageType.IMAGE, 'init'> {
    return {
        ...fragment,
        direction: MessageDirection.INBOUND,
        sender,
        id,
    };
}

function getDirectedVideoMessageInit(
    id: MessageId,
    sender: UidOf<DbContact>,
    fragment: InboundVideoMessageInitFragment,
): DirectedMessageFor<MessageDirection.INBOUND, MessageType.VIDEO, 'init'> {
    return {
        ...fragment,
        direction: MessageDirection.INBOUND,
        sender,
        id,
    };
}

function getDirectedAudioMessageInit(
    id: MessageId,
    sender: UidOf<DbContact>,
    fragment: InboundAudioMessageInitFragment,
): DirectedMessageFor<MessageDirection.INBOUND, MessageType.AUDIO, 'init'> {
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

interface ReflectInstructions {
    fragment: D2dIncomingMessageFragment;
    d2mFlags: D2mMessageFlags;
}

function getD2dIncomingReflectFragment(
    d2dMessageType: D2dCspMessageType,
    cspMessageBody: ReadonlyUint8Array,
    nonceGuard: INonceGuard,
    createdAt: Date,
): D2dIncomingMessageFragment {
    return {
        createdAt: intoUnsignedLong(dateToUnixTimestampMs(createdAt)),
        type: d2dMessageType,
        body: cspMessageBody as Uint8Array,
        nonce: nonceGuard.nonce,
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

/** An existing contact or almost everything we need to create a contact. */
type ContactOrInitFragment = ModelStore<Contact> | ContactInitFragment;

/** An existing contact or everything we need to create a contact. */
export type ContactOrInit = ModelStore<Contact> | ContactInit;

/**
 * The message processing instructions determine how an incoming message should be processed.
 */
type MessageProcessingInstructions =
    | ConversationMessageInstructions
    | ContactControlMessageInstructions
    | GroupControlMessageInstructions
    | StatusUpdateInstructions
    | ForwardSecurityMessageInstructions
    | MessageUpdateInstructions
    | UnhandledMessageInstructions;

// TODO(DESK-1502): Consider adding `runCommonGroupReceiveStep` for all group categories
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
     * The {@link D2dIncomingMessageFragment} that should be reflected.
     *
     * Set to `deferred` if the message should not yet be reflected by the IncomingMessageTask, but
     * by a subtask.
     *
     * Set to 'not-reflected' if the message should not be reflected at all.
     */
    readonly reflect: ReflectInstructions | 'deferred' | 'not-reflected';
}

interface ConversationMessageInstructions extends BaseProcessingInstructions {
    readonly messageCategory: 'conversation-message';
    readonly conversationId: ContactConversationId | GroupConversationId;
    readonly missingContactHandling: 'create' | 'ignore';
    readonly initFragment: AnyInboundMessageInitFragment;
    readonly reflect: ReflectInstructions;
}

interface ContactControlMessageInstructions extends BaseProcessingInstructions {
    readonly messageCategory: 'contact-control';
    readonly deliveryReceipt: false;
    readonly missingContactHandling: 'discard';
    readonly reflect: ReflectInstructions;
    readonly task: ComposableTask<ActiveTaskCodecHandle<'volatile'>, unknown>;
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
    readonly conversationId: ContactConversationId | GroupConversationId;
    readonly missingContactHandling: 'discard';
    readonly reflect: ReflectInstructions;
    readonly task: ComposableTask<ActiveTaskCodecHandle<'volatile'>, unknown>;
}

interface TypingIndicatorInstructions extends BaseProcessingInstructions {
    readonly messageCategory: 'status-update';
    readonly deliveryReceipt: false;
    readonly conversationId: ContactConversationId;
    readonly missingContactHandling: 'discard';
    readonly reflect: ReflectInstructions;
    readonly task: ComposableTask<ActiveTaskCodecHandle<'volatile'>, unknown>;
}

interface ForwardSecurityMessageInstructions extends BaseProcessingInstructions {
    readonly messageCategory: 'forward-security';
    readonly deliveryReceipt: false;
    readonly missingContactHandling: 'create';
    readonly reflect: 'not-reflected';
    readonly task: ComposableTask<ActiveTaskCodecHandle<'volatile'>, unknown>;
}

interface MessageUpdateInstructions extends BaseProcessingInstructions {
    readonly messageCategory: 'message-content-update';
    readonly conversationId: ContactConversationId | GroupConversationId;
    readonly deliveryReceipt: false;
    readonly missingContactHandling: 'discard';
    readonly reflect: ReflectInstructions;
    readonly task: ComposableTask<ActiveTaskCodecHandle<'volatile'>, unknown>;
}

interface UnhandledMessageInstructions extends BaseProcessingInstructions {
    readonly messageCategory: 'unhandled';
    readonly conversationId: ContactConversationId | GroupConversationId;
    readonly runCommonGroupReceiveSteps: boolean;
    readonly missingContactHandling: 'create';
    readonly reflect: ReflectInstructions;
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
    private readonly _id: MessageId;
    /** Nonce guard of the message container. */
    private _nonceGuard: undefined | INonceGuard;

    public constructor(
        private readonly _services: ServicesForTasks,
        private readonly _message: structbuf.csp.payload.MessageWithMetadataBoxLike,
    ) {
        const messageIdHex = u64ToHexLe(_message.messageId);
        this._log = _services.logging.logger(`network.protocol.task.in-message.${messageIdHex}`);
        this._id = ensureMessageId(this._message.messageId);
    }

    public async run(handle: ActiveTaskCodecHandle<'volatile'>): Promise<void> {
        let result;
        try {
            result = await this._processIncomingCspMessage(handle);
        } catch (error) {
            this._discardUnprocessedNonce();
            throw ensureError(error);
        }
        this._log.debug(`Task processing result: ${result}`);
        return undefined;
    }

    private async _processIncomingCspMessage(
        handle: ActiveTaskCodecHandle<'volatile'>,
    ): Promise<TaskResult> {
        const {device, model} = this._services;

        // 1. (MD) If the device is currently not declared _leader_, exceptionally abort these steps
        //    and the connection.
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

            // 3. If `receiver-identity` does not equal the user's Threema ID, log a warning,
            //    _Acknowledge_ and discard the message and abort these steps.
            if (receiver !== device.identity.string) {
                this._log.warn(`Discarding message not intended for us, receiver: ${receiver}`);
                return await this._discard(handle);
            }
        }

        // 4. Run the _Valid Contacts Lookup Steps_ for `sender-identity` and let
        //    `contact-or-init` be the result.
        const contactOrInitMap = await validContactsLookupSteps(
            this._services,
            new Set([sender.string]),
            this._log,
        );

        const senderContactOrInitFragment = contactOrInitMap.get(sender.string);

        assert(senderContactOrInitFragment !== undefined);

        // 5.  If `contact-or-init` indicates that the _contact is the user_ or that the
        //     _contact is invalid_, log a warning, _Acknowledge_ and discard the message and
        //     abort these steps.
        if (senderContactOrInitFragment === 'me' || senderContactOrInitFragment === 'invalid') {
            this._log.warn(
                'Discarding message that appears to be sent by ourselves or by an invalid contat',
            );
            return await this._discard(handle);
        }

        // Determine the sender's public key
        const senderPublicKey =
            senderContactOrInitFragment instanceof ModelStore
                ? senderContactOrInitFragment.get().view.publicKey
                : senderContactOrInitFragment.publicKey;

        // Decrypt and decode the metadata, if any
        //
        // If there is metadata, ensure the message IDs match
        let metadata, metadataNonceGuard;
        try {
            [metadataNonceGuard, metadata] = this._decodeAndDecryptMetadata(senderPublicKey);
        } catch (error) {
            this._log.warn(
                `Discarding message because we could not decrypt or decode metadata: ${error}`,
            );
            return await this._discard(handle);
        }
        if (metadata !== undefined && metadata.messageId !== this._message.messageId) {
            this._log.warn('Discarding message due to metadata message ID mismatch');
            return await this._discard(handle);
        }

        // Discard the metadata nonce since the same nonce is reused for the main container below
        if (metadataNonceGuard !== undefined) {
            metadataNonceGuard.discard();
            this._nonceGuard = undefined;
        }

        // Decrypt and decode the message
        let container, containerNonceGuard;
        try {
            [containerNonceGuard, container] = this._decodeAndDecryptContainer(senderPublicKey);
        } catch (error) {
            this._log.warn(
                `Discarding message because we could not decrypt or decode data: ${error}`,
            );
            return await this._discard(handle);
        }
        const type = container.type;

        // Debug info
        const messageTypeDebug = cspE2eTypeNameOf(type) ?? `<unknown> (0x${type.toString(16)})`;
        this._log.info(`Received incoming ${messageTypeDebug} message`);

        // Check if the message should be discarded due to the contact being
        // implicitly or explicitly blocked.
        if (model.user.privacySettings.get().controller.isContactBlocked(sender.string)) {
            if (isCspE2eType(type) && MESSAGE_TYPE_PROPERTIES[type].exemptFromBlocking) {
                this._log.debug(
                    `Processing message from blocked contact ${sender.string}, because the type ${type} is exempt from blocking`,
                );
            } else {
                this._log.info(`Discarding message from blocked contact ${sender.string}`);
                return await this._discard(handle);
            }
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
        let senderContactOrInit = this._getContactOrInit(
            type,
            senderContactOrInitFragment,
            metadata,
        );
        let instructions;
        try {
            instructions = this._getInstructionsForMessage(
                type,
                cspMessageBody,
                senderContactOrInit,
                metadata,
                containerNonceGuard,
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

        // Since we forward unknown message types, at this point we should only have known CSP E2E
        // message types remaining. (TODO DESK-194: Review if this is still the case.)
        assert(isCspE2eType(type), `Message type ${type} is not a known CSP E2E type`);

        // Debug info: Extract message ids referenced by this message
        const messageReferenceDebug = messageReferenceDebugFor(type, cspMessageBody);

        // Note: At this point we are past the validation phase and further
        //       interactions are infallible (i.e. if they fail, then the
        //       whole connection gets teared down).

        // Determine flags
        const flags = CspMessageFlags.fromBitmask(this._message.flags);

        // If we have a special contact, it has already been added and reflected. Furthermore, no
        // nickname handling is required.
        if (!isSpecialContact(sender.string)) {
            // Sync the contact within a transaction and store it permanently,
            // if necessary.
            if (senderContactOrInit instanceof ModelStore) {
                // Contact exists. Update the nickname if necessary.
                const nicknameFromMessage = this._getSenderNickname(type, this._message, metadata);
                if (nicknameFromMessage !== undefined) {
                    // 4. If `nickname` is present and `contact-or-init` contains an existing contact:
                    const contactModel = senderContactOrInit.get();
                    if (
                        isNickname(nicknameFromMessage) &&
                        contactModel.view.nickname !== nicknameFromMessage
                    ) {
                        // Update the contact's nickname with `nickname`.
                        await contactModel.controller.update.fromRemote(handle, {
                            nickname: nicknameFromMessage,
                        });
                    } else if (
                        nicknameFromMessage.length === 0 &&
                        contactModel.view.nickname !== undefined
                    ) {
                        // Remove the contact's nickname if `nickname` is empty.
                        await contactModel.controller.update.fromRemote(handle, {
                            nickname: undefined,
                        });
                    }
                }
            } else {
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
                        this._log.info(
                            `Discarding ${messageTypeDebug} message from unknown contact`,
                            messageReferenceDebug,
                        );
                        return await this._discard(handle);
                    case 'ignore':
                        // Carry on!
                        break;
                    default:
                        unreachable(instructions);
                }
            }
        }

        // For group conversation messages, run the common group receive steps
        let group: ModelStore<Group> | undefined = undefined;
        if (
            ((instructions.messageCategory === 'conversation-message' ||
                instructions.messageCategory === 'status-update' ||
                instructions.messageCategory === 'message-content-update') &&
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
                this._log.info(
                    `Discarding ${messageTypeDebug} group message`,
                    messageReferenceDebug,
                );
                return await this._discard(handle);
            }
            group = receiveStepsResult.group;
            senderContactOrInit = receiveStepsResult.senderContact;
        }

        // Handle reflection
        if (MESSAGE_TYPE_PROPERTIES[type].reflect.incoming) {
            assert(
                instructions.reflect !== 'not-reflected',
                `Message of type ${type} should be reflected, but reflect fragment is 'not-reflected'`,
            );
        } else {
            assert(
                instructions.reflect === 'not-reflected',
                `Message of type ${type} should not be reflected, but reflect fragment is set`,
            );
        }
        if (instructions.reflect !== 'not-reflected' && instructions.reflect !== 'deferred') {
            // Reflect the message and wait for D2M acknowledgement
            this._log.info(
                `Reflecting incoming ${messageTypeDebug} message`,
                messageReferenceDebug,
            );
            let incomingMessageReflectedAt;
            try {
                incomingMessageReflectedAt = await this._reflectMessage(
                    handle,
                    instructions.reflect.fragment,
                    sender.string,
                    instructions.reflect.d2mFlags,
                );
            } catch (error) {
                this._log.warn(
                    `Failed to reflect ${messageTypeDebug} message: ${error}`,
                    messageReferenceDebug,
                );
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
                case 'message-content-update':
                case 'status-update':
                case 'contact-control':
                case 'group-control':
                    break;
                default:
                    unreachable(instructions);
            }
        }
        let conversation: ModelStore<Conversation>;
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
                    senderContactOrInit instanceof ModelStore,
                    'Contact should have been created by IncomingMessageTask, but was not',
                );

                // Look up conversation
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
                        messageReferenceDebug,
                    );
                    return await this._discard(handle);
                }

                // Add message to conversation
                this._log.debug(`Saving ${messageTypeDebug} message`, messageReferenceDebug);
                if (instructions.initFragment !== undefined) {
                    const messageStore = await conversation
                        .get()
                        .controller.addMessage.fromRemote(
                            handle,
                            this._getDirectedMessageInit(
                                instructions.initFragment,
                                senderContactOrInit,
                            ),
                        );

                    // If this message type has a thumbnail, automatically trigger its download
                    if (messageStoreHasThumbnail(messageStore)) {
                        messageStore
                            .get()
                            .controller.thumbnailBlob()
                            .catch((error: unknown) =>
                                this._log.error(
                                    `Downloading the thumbnail of an incoming message failed: ${error}`,
                                ),
                            );
                    }

                    // If the settings are configured for autodownload, directly download the associated blob
                    if (messageStore.type !== 'text') {
                        const autoDownload = model.user.mediaSettings.get().view.autoDownload;
                        if (
                            autoDownload.on &&
                            (autoDownload.limitInMb === 0 ||
                                messageStore.get().view.fileSize / 1e6 < autoDownload.limitInMb)
                        ) {
                            messageStore
                                .get()
                                .controller.blob()
                                .catch((error: unknown) => {
                                    this._log.error(
                                        `Downloading the blob of an incoming message failed: ${error}`,
                                    );
                                });
                        }
                    }
                }
                break;
            }
            case 'contact-control':
            case 'group-control':
            case 'message-content-update':
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
            this._log.debug(`Acknowledging ${messageTypeDebug} message`, messageReferenceDebug);
            try {
                await this._acknowledgeMessage(handle);
            } catch (error) {
                this._log.warn(
                    `Failed to acknowledge ${messageTypeDebug} message: ${error}`,
                    messageReferenceDebug,
                );
                throw ensureError(error);
            }
        }

        // Send a delivery receipt to sender, if necessary
        if (
            instructions.deliveryReceipt &&
            !flags.dontSendDeliveryReceipts &&
            senderContactOrInit instanceof ModelStore
        ) {
            // Note: Not using the `OutgoingDeliveryReceiptTask` here because sending the "received"
            //       delivery receipt should not be persistent. If the processing of an incoming
            //       message does not complete successfully, the message will not be acked and will
            //       be re-processed later, that's why we don't need persistence for the delivery
            //       receipt.
            await new OutgoingCspMessagesTask(this._services, [
                {
                    receiver: senderContactOrInit.get(),
                    messageProperties: {
                        type: CspE2eStatusUpdateType.DELIVERY_RECEIPT,
                        encoder: structbuf.bridge.encoder(structbuf.csp.e2e.DeliveryReceipt, {
                            messageIds: [this._id],
                            status: CspE2eDeliveryReceiptStatus.RECEIVED,
                        }),
                        cspMessageFlags: CspMessageFlags.none(),
                        messageId: randomMessageId(this._services.crypto),
                        createdAt: instructions.initFragment?.receivedAt ?? new Date(),
                        allowUserProfileDistribution: false,
                    },
                },
            ]).run(handle);
        }

        this._commitNonce();

        // Done
        return 'processed';
    }

    private _commitNonce(nonceOptional = false): void {
        assert(
            nonceOptional || this._nonceGuard !== undefined,
            'A nonceguard should have been set prior to commiting',
        );
        this._nonceGuard?.commit();
        this._nonceGuard = undefined;
    }

    /**
     * Check if there is an unprocessed nonce and discard it.
     */
    private _discardUnprocessedNonce(): void {
        if (this._nonceGuard?.processed.value === false) {
            this._nonceGuard.discard();
        }
        this._nonceGuard = undefined;
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
        this._commitNonce(true);
        return 'discarded';
    }

    // eslint-disable-next-line @typescript-eslint/require-await
    private async _forward(
        handle: ActiveTaskCodecHandle<'volatile'>,
        container: structbuf.csp.e2e.Container,
    ): Promise<'forwarded'> {
        this._discardUnprocessedNonce();
        this._log.error(
            `TODO(DESK-194): Forwarding of message with unknown inbound CSP E2E type ${
                container.type
            } (${cspE2eTypeNameOf(container.type)})`,
        );
        // TODO(DESK-194): Implement forwarding of unknown message types, ignoring for now
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
    private _decodeAndDecryptMetadata(
        senderPublicKey: PublicKey,
    ):
        | [nonceGuard: INonceGuard, metadata: protobuf.validate.csp_e2e.MessageMetadata.Type]
        | [nonceGuard: undefined, metadata: undefined] {
        const {device} = this._services;
        if (this._message.metadataLength === 0) {
            return [undefined, undefined];
        }
        const {plainData, nonceGuard} = deriveMessageMetadataKey(
            this._services,
            device.csp.ck,
            senderPublicKey,
        )
            .decryptorWithNonce(
                CREATE_BUFFER_TOKEN,
                this._message.messageAndMetadataNonce as Nonce,
                this._message.metadataContainer as EncryptedData,
            )
            .decrypt(
                `IncomingMessageTask<${u64ToHexLe(
                    this._message.messageId,
                )}>#_decodeAndDecryptMetadata`,
            );
        const parsedMessageMetadata = protobuf.validate.csp_e2e.MessageMetadata.SCHEMA.parse(
            protobuf.csp_e2e.MessageMetadata.decode(plainData),
        );
        assert(
            this._nonceGuard === undefined,
            '_decodeAndDecryptMetadata: No nonceguard should have been set prior',
        );
        this._nonceGuard = nonceGuard;
        return [nonceGuard, parsedMessageMetadata];
    }

    private _decodeAndDecryptContainer(
        senderPublicKey: PublicKey,
    ): [nonceGuard: INonceGuard, container: structbuf.csp.e2e.Container] {
        const {device} = this._services;
        const {nonceGuard, plainData} = device.csp.ck
            .getSharedBox(senderPublicKey)
            .decryptorWithNonce(
                CREATE_BUFFER_TOKEN,
                this._message.messageAndMetadataNonce as Nonce,
                this._message.messageBox as EncryptedData,
            )
            .decrypt(
                `IncomingMessageTask<${u64ToHexLe(
                    this._message.messageId,
                )}>#_decodeAndDecryptContainer`,
            );

        assert(
            this._nonceGuard === undefined,
            '_decodeAndDecryptContainer: No nonceguard should have been set prior',
        );
        this._nonceGuard = nonceGuard;

        return [nonceGuard, structbuf.csp.e2e.Container.decode(plainData)];
    }

    private _getContactOrInit(
        messageType: u8,
        senderContactOrInitFragment: ContactOrInitFragment,
        metadata: protobuf.validate.csp_e2e.MessageMetadata.Type | undefined,
    ): ContactOrInit {
        if (senderContactOrInitFragment instanceof ModelStore) {
            return senderContactOrInitFragment;
        }

        // Finalize the fragment
        const nickname = this._getSenderNickname(messageType, this._message, metadata);
        return {
            ...senderContactOrInitFragment,
            acquaintanceLevel: AcquaintanceLevel.DIRECT,
            nickname: isNickname(nickname) ? nickname : undefined,
        };
    }

    /**
     * Decode the sender nickname from the message. Prefer the nickname from the encrypted metadata,
     * if present.
     *
     * The return value is:
     *
     * - A non-empty string if a valid nickname was set
     * - An empty string if the nickname should be cleared
     * - The value `undefined` if no valid nickname was transmitted as part of the message
     */
    private _getSenderNickname(
        messageType: u8,
        message: MessageWithMetadataBoxLike,
        metadata: protobuf.validate.csp_e2e.MessageMetadata.Type | undefined,
    ): string | undefined {
        let nickname: string | undefined;
        if (metadata?.nickname !== undefined) {
            // 1. If `inner-metadata.nickname` is defined, let `nickname` be the value of
            //    `inner-metadata.nickname`.²
            nickname = metadata.nickname;
        } else if (
            message.legacySenderNickname.byteLength !== 0 &&
            isCspE2eType(messageType) &&
            MESSAGE_TYPE_PROPERTIES[messageType].userProfileDistribution === true
        ) {
            // 2. If `inner-metadata` is not defined and _User Profile Distribution_ was expected
            //    for `inner-type`, let `nickname` be the result of decoding the plaintext
            //    `legacy-sender-nickname`.²
            try {
                nickname = UTF8.decode(byteWithoutZeroPadding(message.legacySenderNickname));
            } catch (error) {
                this._log.warn(`Ignoring invalid nickname: ${error}`);
                return undefined;
            }
        } else {
            return undefined;
        }

        // 3. If `nickname` is present, trim any excess whitespaces from the beginning and the end
        //    of `nickname`.
        return nickname.trim();
    }

    private _getInstructionsForMessage(
        type: u53,
        cspMessageBody: ReadonlyUint8Array,
        senderContactOrInit: ContactOrInit,
        metadata: protobuf.validate.csp_e2e.MessageMetadata.Type | undefined,
        nonceGuard: INonceGuard,
    ): MessageProcessingInstructions | 'forward' | 'discard' {
        const message = this._message;
        const clampedCreatedAt = getClampedCreatedAt(
            metadata?.createdAt ?? unixTimestampToDateS(message.createdAt),
        );
        const messageId = ensureMessageId(message.messageId);

        // Determine sender identity and conversation ID
        let senderIdentity;
        if (senderContactOrInit instanceof ModelStore) {
            senderIdentity = senderContactOrInit.get().view.identity;
        } else {
            senderIdentity = senderContactOrInit.identity;
        }
        const senderConversationId: ContactConversationId = {
            type: ReceiverType.CONTACT,
            identity: senderIdentity,
        };

        // 19. If `sender-identity` equals `*3MAPUSH`
        if (senderIdentity === '*3MAPUSH') {
            // 1. If `inner-type` is not any of `0xa0` or `0xfe`, log a warning, _Acknowledge_ and
            //    discard the message and abort these steps.
            // 2. Run the receive steps associated to `inner-type` with `inner-message`. If this
            //    fails, exceptionally abort these steps and the connection. If the message has been
            //    discarded, _Acknowledge_ the message and abort these steps.
            const maybeCspE2eType = type as CspE2eType;
            switch (maybeCspE2eType) {
                case CspE2eForwardSecurityType.FORWARD_SECURITY_ENVELOPE: // TODO(DESK-887): Probably unreachable once we have PFS
                case CspE2eWebSessionResumeType.WEB_SESSION_RESUME:
                    // Continue processing
                    break;
                default:
                    this._log.warn(
                        `Message from *3MAPUSH has unexpected type ${cspE2eTypeNameOf(type)}`,
                    );
                    return 'discard';
            }
        }

        function reflectFragmentFor(d2dMessageType: D2dCspMessageType): D2dIncomingMessageFragment {
            return getD2dIncomingReflectFragment(
                d2dMessageType,
                cspMessageBody,
                nonceGuard,
                clampedCreatedAt,
            );
        }

        function reflectFor(
            d2dMessageType: D2dCspMessageType,
            d2mMessageFlags?: D2mMessageFlags,
        ): ReflectInstructions {
            return {
                fragment: reflectFragmentFor(d2dMessageType),
                d2mFlags: d2mMessageFlags ?? D2mMessageFlags.none(),
            };
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
                          ...getCommonMessageInitFragment(clampedCreatedAt, cspMessageBody),
                          text,
                      } as const);

            return {
                messageCategory: 'unhandled',
                conversationId,
                missingContactHandling: 'create',
                deliveryReceipt,
                runCommonGroupReceiveSteps,
                reflect: reflectFor(d2dMessageType),
                initFragment,
            };
        }

        function unhandledGroupMemberMessage(
            d2dMessageType: CspE2eGroupConversationType,
        ): UnhandledMessageInstructions {
            const validatedContainer = structbuf.validate.csp.e2e.GroupMemberContainer.SCHEMA.parse(
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
            case CspE2eConversationType.TEXT:
            case CspE2eConversationType.LOCATION:
            case CspE2eConversationType.FILE: {
                let initFragment;
                switch (maybeCspE2eType) {
                    case CspE2eConversationType.TEXT:
                        initFragment = getTextMessageInitFragment(
                            clampedCreatedAt,
                            cspMessageBody,
                            this._log,
                            this._id,
                        );
                        break;
                    case CspE2eConversationType.LOCATION:
                        initFragment = getLocationMessageInitFragment(
                            clampedCreatedAt,
                            cspMessageBody,
                        );
                        break;
                    case CspE2eConversationType.FILE:
                        initFragment = getFileMessageInitFragment(
                            clampedCreatedAt,
                            cspMessageBody,
                            this._log,
                        );
                        break;
                    default:
                        unreachable(maybeCspE2eType);
                }
                const instructions: ConversationMessageInstructions = {
                    messageCategory: 'conversation-message',
                    conversationId: senderConversationId,
                    missingContactHandling: 'create',
                    deliveryReceipt: true,
                    initFragment,
                    reflect: reflectFor(maybeCspE2eType),
                };
                return instructions;
            }
            case CspE2eGroupConversationType.GROUP_TEXT:
            case CspE2eGroupConversationType.GROUP_LOCATION:
            case CspE2eGroupConversationType.GROUP_FILE: {
                const validatedContainer =
                    structbuf.validate.csp.e2e.GroupMemberContainer.SCHEMA.parse(
                        structbuf.csp.e2e.GroupMemberContainer.decode(cspMessageBody as Uint8Array),
                    );
                let initFragment;
                switch (maybeCspE2eType) {
                    case CspE2eGroupConversationType.GROUP_TEXT:
                        initFragment = getTextMessageInitFragment(
                            clampedCreatedAt,
                            validatedContainer.innerData,
                            this._log,
                            this._id,
                        );
                        break;
                    case CspE2eGroupConversationType.GROUP_LOCATION:
                        initFragment = getLocationMessageInitFragment(
                            clampedCreatedAt,
                            validatedContainer.innerData,
                        );
                        break;
                    case CspE2eGroupConversationType.GROUP_FILE:
                        initFragment = getFileMessageInitFragment(
                            clampedCreatedAt,
                            validatedContainer.innerData,
                            this._log,
                        );
                        break;
                    default:
                        unreachable(maybeCspE2eType);
                }
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
                    reflect: reflectFor(maybeCspE2eType),
                };
                return instructions;
            }

            // Contact control messages
            case CspE2eContactControlType.CONTACT_SET_PROFILE_PICTURE: {
                const validatedSetProfilePicture =
                    structbuf.validate.csp.e2e.SetProfilePicture.SCHEMA.parse(
                        structbuf.csp.e2e.SetProfilePicture.decode(cspMessageBody as Uint8Array),
                    );
                const instructions: ContactControlMessageInstructions = {
                    messageCategory: 'contact-control',
                    deliveryReceipt: false,
                    missingContactHandling: 'discard',
                    reflect: {
                        fragment: getD2dIncomingMessage(
                            this._id,
                            senderIdentity,
                            reflectFragmentFor(maybeCspE2eType),
                        ),
                        d2mFlags: D2mMessageFlags.none(),
                    },
                    task: new IncomingContactProfilePictureTask(
                        this._services,
                        messageId,
                        senderContactOrInit,
                        validatedSetProfilePicture,
                    ),
                };
                return instructions;
            }
            case CspE2eContactControlType.CONTACT_DELETE_PROFILE_PICTURE: {
                const instructions: ContactControlMessageInstructions = {
                    messageCategory: 'contact-control',
                    deliveryReceipt: false,
                    missingContactHandling: 'discard',
                    reflect: {
                        fragment: getD2dIncomingMessage(
                            this._id,
                            senderIdentity,
                            reflectFragmentFor(maybeCspE2eType),
                        ),
                        d2mFlags: D2mMessageFlags.none(),
                    },
                    task: new IncomingContactProfilePictureTask(
                        this._services,
                        messageId,
                        senderContactOrInit,
                        undefined,
                    ),
                };
                return instructions;
            }
            case CspE2eContactControlType.CONTACT_REQUEST_PROFILE_PICTURE:
                // TODO(DESK-590): Implement
                return 'discard';

            // Group control messages
            case CspE2eGroupControlType.GROUP_SETUP: {
                // A group-setup message is wrapped in a group-creator-container
                const validatedContainer =
                    structbuf.validate.csp.e2e.GroupCreatorContainer.SCHEMA.parse(
                        structbuf.csp.e2e.GroupCreatorContainer.decode(
                            cspMessageBody as Uint8Array,
                        ),
                    );
                const validatedGroupSetup = structbuf.validate.csp.e2e.GroupSetup.SCHEMA.parse(
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
                        clampedCreatedAt,
                    ),
                    reflect: 'deferred',
                };
                return instructions;
            }
            case CspE2eGroupControlType.GROUP_NAME: {
                // A group-name message is wrapped in a group-creator-container
                const validatedContainer =
                    structbuf.validate.csp.e2e.GroupCreatorContainer.SCHEMA.parse(
                        structbuf.csp.e2e.GroupCreatorContainer.decode(
                            cspMessageBody as Uint8Array,
                        ),
                    );
                const validatedGroupName = structbuf.validate.csp.e2e.GroupName.SCHEMA.parse(
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
                        clampedCreatedAt,
                    ),
                    reflect: reflectFor(maybeCspE2eType),
                };
                return instructions;
            }
            case CspE2eGroupControlType.GROUP_SET_PROFILE_PICTURE: {
                // A group-set-profile-picture message is wrapped in a group-creator-container
                const validatedContainer =
                    structbuf.validate.csp.e2e.GroupCreatorContainer.SCHEMA.parse(
                        structbuf.csp.e2e.GroupCreatorContainer.decode(
                            cspMessageBody as Uint8Array,
                        ),
                    );
                const validatedProfilePicture =
                    structbuf.validate.csp.e2e.SetProfilePicture.SCHEMA.parse(
                        structbuf.csp.e2e.SetProfilePicture.decode(validatedContainer.innerData),
                    );
                const instructions: GroupControlMessageInstructions = {
                    messageCategory: 'group-control',
                    // Group set profile picture messages are sent by creator. Since the creator has
                    // interacted directly with us, add the contact with acquaintance level DIRECT.
                    missingContactHandling: 'create',
                    deliveryReceipt: false,
                    task: new IncomingGroupProfilePictureTask(
                        this._services,
                        messageId,
                        senderContactOrInit,
                        validatedContainer,
                        validatedProfilePicture,
                    ),
                    reflect: reflectFor(maybeCspE2eType),
                };
                return instructions;
            }
            case CspE2eGroupControlType.GROUP_DELETE_PROFILE_PICTURE: {
                // A group-delete-profile-picture message is wrapped in a group-creator-container
                const validatedContainer =
                    structbuf.validate.csp.e2e.GroupCreatorContainer.SCHEMA.parse(
                        structbuf.csp.e2e.GroupCreatorContainer.decode(
                            cspMessageBody as Uint8Array,
                        ),
                    );
                const instructions: GroupControlMessageInstructions = {
                    messageCategory: 'group-control',
                    // Group delete profile picture messages are sent by creator. Since the creator has
                    // interacted directly with us, add the contact with acquaintance level DIRECT.
                    missingContactHandling: 'create',
                    deliveryReceipt: false,
                    task: new IncomingGroupProfilePictureTask(
                        this._services,
                        messageId,
                        senderContactOrInit,
                        validatedContainer,
                        undefined,
                    ),
                    reflect: reflectFor(maybeCspE2eType),
                };
                return instructions;
            }
            case CspE2eGroupControlType.GROUP_LEAVE: {
                // A group-leave message is wrapped in a group-member-container
                const validatedContainer =
                    structbuf.validate.csp.e2e.GroupMemberContainer.SCHEMA.parse(
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
                        clampedCreatedAt,
                    ),
                    reflect: reflectFor(maybeCspE2eType),
                };
                return instructions;
            }
            case CspE2eGroupControlType.GROUP_SYNC_REQUEST: {
                // A group-sync-request message is wrapped in a group-creator-container
                const validatedContainer =
                    structbuf.validate.csp.e2e.GroupCreatorContainer.SCHEMA.parse(
                        structbuf.csp.e2e.GroupCreatorContainer.decode(
                            cspMessageBody as Uint8Array,
                        ),
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
                    reflect: reflectFor(maybeCspE2eType),
                };
                return instructions;
            }

            case CspE2eGroupControlType.GROUP_CALL_START: {
                const validatedContainer =
                    structbuf.validate.csp.e2e.GroupMemberContainer.SCHEMA.parse(
                        structbuf.csp.e2e.GroupMemberContainer.decode(cspMessageBody as Uint8Array),
                    );
                const validatedGroupCallStart =
                    protobuf.validate.csp_e2e.GroupCallStart.SCHEMA.parse(
                        protobuf.csp_e2e.GroupCallStart.decode(validatedContainer.innerData),
                    );
                const instructions: GroupControlMessageInstructions = {
                    messageCategory: 'group-control',
                    missingContactHandling: 'ignore',
                    deliveryReceipt: false,
                    task: new IncomingGroupCallStartTask(
                        this._services,
                        messageId,
                        senderContactOrInit,
                        validatedContainer,
                        validatedGroupCallStart,
                        clampedCreatedAt,
                    ),
                    reflect: reflectFor(maybeCspE2eType),
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
                    conversationId: senderConversationId,
                    missingContactHandling: 'discard',
                    deliveryReceipt: false,
                    task: new IncomingDeliveryReceiptTask(
                        this._services,
                        messageId,
                        senderConversationId,
                        validatedDeliveryReceipt,
                        clampedCreatedAt,
                        senderIdentity,
                    ),
                    reflect: reflectFor(maybeCspE2eType),
                };
                return instructions;
            }
            case CspE2eGroupStatusUpdateType.GROUP_DELIVERY_RECEIPT: {
                const validatedContainer =
                    structbuf.validate.csp.e2e.GroupMemberContainer.SCHEMA.parse(
                        structbuf.csp.e2e.GroupMemberContainer.decode(cspMessageBody as Uint8Array),
                    );
                const deliveryReceipt = structbuf.csp.e2e.DeliveryReceipt.decode(
                    validatedContainer.innerData,
                );
                const validatedDeliveryReceipt =
                    structbuf.validate.csp.e2e.DeliveryReceipt.SCHEMA.parse(deliveryReceipt);

                switch (validatedDeliveryReceipt.status) {
                    case CspE2eDeliveryReceiptStatus.ACKNOWLEDGED:
                    case CspE2eDeliveryReceiptStatus.DECLINED:
                        break;
                    default:
                        throw new Error(
                            `Received group delivery receipt with type ${validatedDeliveryReceipt.status} which is not accepted`,
                        );
                }

                const groupConversationId: GroupConversationId = {
                    type: ReceiverType.GROUP,
                    groupId: validatedContainer.groupId,
                    creatorIdentity: validatedContainer.creatorIdentity,
                };
                const instructions: StatusUpdateInstructions = {
                    messageCategory: 'status-update',
                    conversationId: groupConversationId,
                    missingContactHandling: 'discard',
                    deliveryReceipt: false,
                    task: new IncomingDeliveryReceiptTask(
                        this._services,
                        messageId,
                        groupConversationId,
                        validatedDeliveryReceipt,
                        clampedCreatedAt,
                        senderIdentity,
                    ),
                    reflect: reflectFor(maybeCspE2eType),
                };
                return instructions;
            }
            case CspE2eStatusUpdateType.TYPING_INDICATOR: {
                const typingIndicator = structbuf.csp.e2e.TypingIndicator.decode(
                    cspMessageBody as Uint8Array,
                );
                const validatedTypingIndicator =
                    structbuf.validate.csp.e2e.TypingIndicator.SCHEMA.parse(typingIndicator);
                const instructions: TypingIndicatorInstructions = {
                    messageCategory: 'status-update',
                    deliveryReceipt: false,
                    conversationId: senderConversationId,
                    missingContactHandling: 'discard',
                    reflect: reflectFor(
                        maybeCspE2eType,
                        D2mMessageFlags.fromPartial({ephemeral: true}),
                    ),
                    task: new IncomingTypingIndicatorTask(
                        this._services,
                        messageId,
                        senderConversationId,
                        validatedTypingIndicator.isTyping,
                    ),
                };
                return instructions;
            }

            // Forward security messages (not currently supported)
            case CspE2eForwardSecurityType.FORWARD_SECURITY_ENVELOPE: {
                // TODO(DESK-887): Implement support for PFS
                const fsEnvelope = protobuf.csp_e2e_fs.Envelope.decode(
                    cspMessageBody as Uint8Array,
                    cspMessageBody.byteLength,
                );
                const instructions: ForwardSecurityMessageInstructions = {
                    messageCategory: 'forward-security',
                    deliveryReceipt: false,
                    missingContactHandling: 'create',
                    reflect: 'not-reflected',
                    task: new IncomingForwardSecurityEnvelopeTask(
                        this._services,
                        messageId,
                        senderContactOrInit,
                        fsEnvelope,
                    ),
                };
                return instructions;
            }

            // Push control messages
            case CspE2eWebSessionResumeType.WEB_SESSION_RESUME:
                this._log.warn('Discarding web session resume message');
                return 'discard';

            case CspE2eMessageUpdateType.EDIT_MESSAGE: {
                const updatedMessage = protobuf.csp_e2e.EditMessage.decode(
                    cspMessageBody as Uint8Array,
                );
                const instructions: MessageUpdateInstructions = {
                    messageCategory: 'message-content-update',
                    conversationId: senderConversationId,
                    missingContactHandling: 'discard',
                    deliveryReceipt: false,
                    reflect: reflectFor(maybeCspE2eType),
                    task: new IncomingMessageContentUpdateTask(
                        this._services,
                        ensureMessageId(intoU64(updatedMessage.messageId)),
                        senderConversationId,
                        {type: 'edit', newText: updatedMessage.text},
                        clampedCreatedAt,
                        senderContactOrInit,
                        this._log,
                    ),
                };
                return instructions;
            }

            case CspE2eGroupMessageUpdateType.GROUP_EDIT_MESSAGE: {
                const validatedContainer =
                    structbuf.validate.csp.e2e.GroupMemberContainer.SCHEMA.parse(
                        structbuf.csp.e2e.GroupMemberContainer.decode(cspMessageBody as Uint8Array),
                    );
                const updatedMessage = protobuf.csp_e2e.EditMessage.decode(
                    validatedContainer.innerData,
                );

                const groupConversationId: GroupConversationId = {
                    type: ReceiverType.GROUP,
                    groupId: validatedContainer.groupId,
                    creatorIdentity: validatedContainer.creatorIdentity,
                };

                const instructions: MessageUpdateInstructions = {
                    messageCategory: 'message-content-update',
                    conversationId: groupConversationId,
                    missingContactHandling: 'discard',
                    deliveryReceipt: false,
                    reflect: reflectFor(maybeCspE2eType),
                    task: new IncomingMessageContentUpdateTask(
                        this._services,
                        ensureMessageId(intoU64(updatedMessage.messageId)),
                        groupConversationId,
                        {type: 'edit', newText: updatedMessage.text},
                        clampedCreatedAt,
                        senderContactOrInit,
                        this._log,
                    ),
                };

                return instructions;
            }

            case CspE2eMessageUpdateType.DELETE_MESSAGE: {
                const deletedMessage = protobuf.csp_e2e.DeleteMessage.decode(
                    cspMessageBody as Uint8Array,
                );
                const instructions: MessageUpdateInstructions = {
                    messageCategory: 'message-content-update',
                    conversationId: senderConversationId,
                    missingContactHandling: 'discard',
                    deliveryReceipt: false,
                    reflect: reflectFor(maybeCspE2eType),
                    task: new IncomingMessageContentUpdateTask(
                        this._services,
                        ensureMessageId(intoU64(deletedMessage.messageId)),
                        senderConversationId,
                        {type: 'delete'},
                        clampedCreatedAt,
                        senderContactOrInit,
                        this._log,
                    ),
                };
                return instructions;
            }
            case CspE2eGroupMessageUpdateType.GROUP_DELETE_MESSAGE: {
                const validatedContainer =
                    structbuf.validate.csp.e2e.GroupMemberContainer.SCHEMA.parse(
                        structbuf.csp.e2e.GroupMemberContainer.decode(cspMessageBody as Uint8Array),
                    );
                const deletedMessage = protobuf.csp_e2e.DeleteMessage.decode(
                    validatedContainer.innerData,
                );

                const groupConversationId: GroupConversationId = {
                    type: ReceiverType.GROUP,
                    groupId: validatedContainer.groupId,
                    creatorIdentity: validatedContainer.creatorIdentity,
                };
                const instructions: MessageUpdateInstructions = {
                    messageCategory: 'message-content-update',
                    conversationId: senderConversationId,
                    missingContactHandling: 'discard',
                    deliveryReceipt: false,
                    reflect: reflectFor(maybeCspE2eType),
                    task: new IncomingMessageContentUpdateTask(
                        this._services,
                        ensureMessageId(intoU64(deletedMessage.messageId)),
                        groupConversationId,
                        {type: 'delete'},
                        clampedCreatedAt,
                        senderContactOrInit,
                        this._log,
                    ),
                };
                return instructions;
            }
            // Forwarding of known but unhandled messages. These messages will be reflected and
            // discarded. The messages won't appear in Threema Desktop, but they will appear on
            // synchronized devices that support these message types.
            case CspE2eConversationType.DEPRECATED_IMAGE: // TODO(DESK-586)
                return unhandled(maybeCspE2eType, true);
            case CspE2eConversationType.DEPRECATED_AUDIO: // TODO(DESK-586)
                return unhandled(maybeCspE2eType, true);
            case CspE2eConversationType.DEPRECATED_VIDEO: // TODO(DESK-586)
                return unhandled(maybeCspE2eType, true);
            case CspE2eConversationType.POLL_SETUP: // TODO(DESK-244)
                return unhandled(maybeCspE2eType, true);
            case CspE2eConversationType.POLL_VOTE: // TODO(DESK-244)
                return unhandled(maybeCspE2eType, false);
            case CspE2eConversationType.CALL_OFFER: // TODO(DESK-243)
                return unhandled(maybeCspE2eType, false);
            case CspE2eConversationType.CALL_ANSWER: // TODO(DESK-243)
                return unhandled(maybeCspE2eType, false);
            case CspE2eConversationType.CALL_ICE_CANDIDATE: // TODO(DESK-243)
                return unhandled(maybeCspE2eType, false);
            case CspE2eConversationType.CALL_HANGUP: // TODO(DESK-243)
                return unhandled(maybeCspE2eType, false);
            case CspE2eConversationType.CALL_RINGING: // TODO(DESK-243)
                return unhandled(maybeCspE2eType, false);
            case CspE2eGroupConversationType.DEPRECATED_GROUP_IMAGE: // TODO(DESK-586)
                return unhandledGroupMemberMessage(maybeCspE2eType);
            case CspE2eGroupConversationType.GROUP_AUDIO: // TODO(DESK-586)
                return unhandledGroupMemberMessage(maybeCspE2eType);
            case CspE2eGroupConversationType.GROUP_VIDEO: // TODO(DESK-586)
                return unhandledGroupMemberMessage(maybeCspE2eType);
            case CspE2eGroupConversationType.GROUP_POLL_SETUP: // TODO(DESK-244)
                return unhandledGroupMemberMessage(maybeCspE2eType);
            case CspE2eGroupConversationType.GROUP_POLL_VOTE: // TODO(DESK-244)
                return unhandledGroupMemberMessage(maybeCspE2eType);

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
        d2mFlags: D2mMessageFlags,
    ): Promise<Date> {
        const [reflectedAt] = await handle.reflect([
            {
                envelope: {
                    incomingMessage: getD2dIncomingMessage(this._id, sender, reflectFragment),
                },
                flags: d2mFlags,
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
        contact: ModelStore<Contact>,
    ): DirectedMessageFor<MessageDirection.INBOUND, AnyNonDeletedMessageType, 'init'> {
        switch (initFragment.type) {
            case MessageType.TEXT:
                return getDirectedTextMessageInit(this._id, contact.get().ctx, initFragment);
            case MessageType.FILE:
                return getDirectedFileMessageInit(this._id, contact.get().ctx, initFragment);
            case MessageType.IMAGE:
                return getDirectedImageMessageInit(this._id, contact.get().ctx, initFragment);
            case MessageType.VIDEO:
                return getDirectedVideoMessageInit(this._id, contact.get().ctx, initFragment);
            case MessageType.AUDIO:
                return getDirectedAudioMessageInit(this._id, contact.get().ctx, initFragment);
            default:
                return unreachable(initFragment);
        }
    }
}
