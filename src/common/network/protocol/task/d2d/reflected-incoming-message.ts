import {NONCE_REUSED} from '~/common/crypto/nonce';
import {
    CspE2eConversationType,
    CspE2eGroupControlType,
    CspE2eGroupConversationType,
    CspE2eStatusUpdateType,
    MessageDirection,
    type MessageType,
    NonceScope,
    ReceiverType,
} from '~/common/enum';
import type {Logger} from '~/common/logging';
import type {Contact} from '~/common/model';
import type {MessageFor} from '~/common/model/types/message';
import type {LocalModelStore} from '~/common/model/utils/model-store';
import * as protobuf from '~/common/network/protobuf';
import {
    type ComposableTask,
    PASSIVE_TASK,
    type PassiveTask,
    type PassiveTaskCodecHandle,
    type PassiveTaskSymbol,
    type ServicesForTasks,
} from '~/common/network/protocol/task';
import {
    getFileBasedMessageTypeAndExtraProperties,
    messageStoreHasThumbnail,
} from '~/common/network/protocol/task/common/file';
import {getTextForLocation} from '~/common/network/protocol/task/common/location';
import {parsePossibleTextQuote} from '~/common/network/protocol/task/common/quotes';
import {ReflectedDeliveryReceiptTask} from '~/common/network/protocol/task/d2d/reflected-delivery-receipt';
import {
    type AnyInboundMessageInitFragment,
    getConversationById,
    type InboundAudioMessageInitFragment,
    type InboundFileMessageInitFragment,
    type InboundImageMessageInitFragment,
    type InboundTextMessageInitFragment,
    type InboundVideoMessageInitFragment,
    messageReferenceDebugFor,
} from '~/common/network/protocol/task/message-processing-helpers';
import type * as structbuf from '~/common/network/structbuf';
import type {
    ContactConversationId,
    D2mDeviceId,
    GroupConversationId,
    MessageId,
} from '~/common/network/types';
import {unreachable} from '~/common/utils/assert';
import {bytesToHex} from '~/common/utils/byte';

import {ReflectedGroupNameTask} from './reflected-group-name';
import {ReflectedGroupProfilePictureTask} from './reflected-group-profile-picture';
import {ReflectedIncomingGroupLeaveTask} from './reflected-incoming-group-leave';
import {ReflectedIncomingGroupSetupTask} from './reflected-incoming-group-setup';
import {ReflectedMessageTaskBase} from './reflected-message';

type CommonInboundMessageInitFragment = Omit<
    MessageFor<MessageDirection.INBOUND, MessageType, 'init'>,
    'id' | 'sender' | 'type'
>;

/**
 * The message processing instructions determine how an incoming message should be processed.
 */
type MessageProcessingInstructions =
    | ConversationMessageInstructions
    | GroupControlMessageInstructions
    | StatusUpdateInstructions;

interface BaseProcessingInstructions {
    /**
     * A constant indicating the category (e.g. `conversation-message` or `status-update`).
     */
    readonly messageCategory: string;
}

interface ConversationMessageInstructions extends BaseProcessingInstructions {
    readonly messageCategory: 'conversation-message';
    /**
     * Conversation to which this message belongs.
     */
    readonly conversationId: ContactConversationId | GroupConversationId;
    readonly initFragment: AnyInboundMessageInitFragment;
}

interface GroupControlMessageInstructions extends BaseProcessingInstructions {
    readonly messageCategory: 'group-control';
    /**
     * The subtask to run for processing the group control message.
     */
    readonly task: ComposableTask<PassiveTaskCodecHandle, unknown>;
}

interface StatusUpdateInstructions extends BaseProcessingInstructions {
    readonly messageCategory: 'status-update';
    /**
     * The subtask to run for processing the status update.
     */
    readonly task: ComposableTask<PassiveTaskCodecHandle, unknown>;
}

export class ReflectedIncomingMessageTask
    extends ReflectedMessageTaskBase<protobuf.d2d.IncomingMessage>
    implements PassiveTask<void>
{
    public readonly type: PassiveTaskSymbol = PASSIVE_TASK;
    public readonly persist = false;

    public constructor(
        services: ServicesForTasks,
        unvalidatedMessage: protobuf.d2d.IncomingMessage,
        senderDeviceId: D2mDeviceId,
        private readonly _reflectedAt: Date,
    ) {
        super(services, unvalidatedMessage, senderDeviceId, 'incoming');
    }

    // eslint-disable-next-line @typescript-eslint/require-await
    public async run(handle: PassiveTaskCodecHandle): Promise<void> {
        const {model, nonces} = this._services;

        // Validate the Protobuf message
        const validationResult = this._validateProtobuf(
            this._unvalidatedMessage,
            protobuf.validate.d2d.IncomingMessage.SCHEMA,
        );
        if (validationResult === undefined) {
            return;
        }
        const {validatedMessage, messageTypeDebug} = validationResult;
        const {type, body, senderIdentity, nonce: messageNonce} = validatedMessage;

        // Debug info: Extract message ids referenced by this message
        const messageReferenceDebug = messageReferenceDebugFor(type, body);

        // Persist nonce
        const guard = nonces.checkAndRegisterNonce(NonceScope.CSP, messageNonce);
        const nonceHexString = bytesToHex(messageNonce);
        if (guard === NONCE_REUSED) {
            // This might happen if a messages is being reprocessed, e.g. because it was not acked
            // the first time due to an interrupted task.
            this._log.info(`Skip adding preexisting CSP nonce ${nonceHexString}`);
        } else {
            this._log.debug(`Persisting nonce ${nonceHexString}`);
            guard.commit();
        }

        this._log.info(
            `Received reflected incoming ${messageTypeDebug} message from ${this._senderDeviceIdString}`,
            messageReferenceDebug,
        );

        // Decode Body
        const validatedBody = this._decodeMessage(type, body, messageTypeDebug);
        if (validatedBody === undefined) {
            return;
        }

        // Look up sender contact
        const senderContact = model.contacts.getByIdentity(senderIdentity);
        if (senderContact === undefined) {
            this._log.error(
                `Discarding ${this._direction} ${messageTypeDebug} message due to missing sender contact`,
                messageReferenceDebug,
            );
            return;
        }

        // Get processing instructions
        let instructions;
        try {
            instructions = this._getInstructionsForMessage(
                validatedBody,
                senderContact,
                validatedMessage.messageId,
                validatedMessage.createdAt,
                this._reflectedAt,
            );
        } catch (error) {
            this._log.info(
                `Discarding reflected incoming ${messageTypeDebug} message with invalid content: ${error}`,
                messageReferenceDebug,
            );
            return;
        }
        if (instructions === 'discard') {
            this._log.info(
                `Discarding reflected incoming ${messageTypeDebug} message`,
                messageReferenceDebug,
            );
            return;
        }

        // Process / save the message
        switch (instructions.messageCategory) {
            case 'conversation-message': {
                // Get conversation
                const conversation = getConversationById(model, instructions.conversationId);
                if (conversation === undefined) {
                    this._log.error(
                        `Discarding ${this._direction} ${messageTypeDebug} message because conversation was not found in database`,
                        messageReferenceDebug,
                    );
                    return;
                }

                // Discard message if it has been already received
                if (conversation.get().controller.hasMessage(validatedMessage.messageId)) {
                    this._log.warn(
                        `Discarding ${this._direction} ${messageTypeDebug} message ${validatedMessage.messageId} as it was already received`,
                        messageReferenceDebug,
                    );
                    return;
                }

                // Add message to conversation
                this._log.debug(
                    `Saving ${this._direction} ${messageTypeDebug} message`,
                    messageReferenceDebug,
                );
                const messageStore = conversation.get().controller.addMessage.fromSync({
                    ...instructions.initFragment,
                    direction: MessageDirection.INBOUND,
                    sender: senderContact.ctx,
                    id: validatedMessage.messageId,
                });

                // If this message type has a thumbnail, automatically trigger its download
                if (messageStoreHasThumbnail(messageStore)) {
                    messageStore
                        .get()
                        .controller.thumbnailBlob()
                        .catch((error) =>
                            this._log.error(
                                `Downloading the thumbnail of a reflected incoming message failed: ${error}`,
                            ),
                        );
                }

                break;
            }

            case 'group-control':
            case 'status-update': {
                this._log.debug('Running the sub-task');
                await instructions.task.run(handle);
                break;
            }

            default:
                unreachable(instructions);
        }
    }

    /**
     * Process the validated message body. Return processing instructions depending on the message
     * type.
     *
     * @param validatedBody The decoded and validated message body (decoded `padded-data` inside
     *   `container`).
     * @param senderIdentity The sender identity string.
     * @param messageId The message ID of the message.
     * @param createdAt Original creation timestamp of the incoming message.
     * @param reflectedAt The timestamp when this message was put into the reflection queue.
     */
    private _getInstructionsForMessage(
        validatedBody: structbuf.validate.csp.e2e.ValidatedCspE2eTypes,
        senderContact: LocalModelStore<Contact>,
        messageId: MessageId,
        createdAt: Date,
        reflectedAt: Date,
    ): MessageProcessingInstructions | 'discard' {
        const senderIdentity = senderContact.get().view.identity;
        const commonFragment = this._getCommonMessageInitFragment(createdAt, reflectedAt);
        switch (validatedBody.type) {
            // Contact conversation messages
            case CspE2eConversationType.TEXT:
            case CspE2eConversationType.FILE: {
                let initFragment;
                switch (validatedBody.type) {
                    case CspE2eConversationType.TEXT:
                        initFragment = getTextMessageInitFragment(
                            validatedBody.message,
                            commonFragment,
                            this._log,
                            messageId,
                        );
                        break;
                    case CspE2eConversationType.FILE:
                        initFragment = getFileMessageInitFragment(
                            validatedBody.message,
                            commonFragment,
                            this._log,
                        );
                        break;
                    default:
                        unreachable(validatedBody);
                }
                const instructions: ConversationMessageInstructions = {
                    messageCategory: 'conversation-message',
                    conversationId: {type: ReceiverType.CONTACT, identity: senderIdentity},
                    initFragment,
                };
                return instructions;
            }
            case CspE2eConversationType.LOCATION: {
                const initFragment = getLocationMessageInitFragment(
                    validatedBody.message,
                    commonFragment,
                );
                const instructions: ConversationMessageInstructions = {
                    messageCategory: 'conversation-message',
                    conversationId: {type: ReceiverType.CONTACT, identity: senderIdentity},
                    initFragment,
                };
                return instructions;
            }

            // Group conversation messages
            case CspE2eGroupConversationType.GROUP_TEXT:
            case CspE2eGroupConversationType.GROUP_FILE: {
                let initFragment;
                switch (validatedBody.type) {
                    case CspE2eGroupConversationType.GROUP_TEXT:
                        initFragment = getTextMessageInitFragment(
                            validatedBody.message,
                            commonFragment,
                            this._log,
                            messageId,
                        );
                        break;
                    case CspE2eGroupConversationType.GROUP_FILE:
                        initFragment = getFileMessageInitFragment(
                            validatedBody.message,
                            commonFragment,
                            this._log,
                        );
                        break;
                    default:
                        unreachable(validatedBody);
                }
                const instructions: ConversationMessageInstructions = {
                    messageCategory: 'conversation-message',
                    conversationId: {
                        type: ReceiverType.GROUP,
                        creatorIdentity: validatedBody.container.creatorIdentity,
                        groupId: validatedBody.container.groupId,
                    },
                    initFragment,
                };
                return instructions;
            }
            case CspE2eGroupConversationType.GROUP_LOCATION: {
                const initFragment = getLocationMessageInitFragment(
                    validatedBody.message,
                    commonFragment,
                );
                const instructions: ConversationMessageInstructions = {
                    messageCategory: 'conversation-message',
                    conversationId: {
                        type: ReceiverType.GROUP,
                        creatorIdentity: validatedBody.container.creatorIdentity,
                        groupId: validatedBody.container.groupId,
                    },
                    initFragment,
                };
                return instructions;
            }

            // Group control messages
            case CspE2eGroupControlType.GROUP_SETUP: {
                const instructions: GroupControlMessageInstructions = {
                    messageCategory: 'group-control',
                    task: new ReflectedIncomingGroupSetupTask(
                        this._services,
                        messageId,
                        senderIdentity,
                        reflectedAt,
                        validatedBody.container,
                        validatedBody.message,
                    ),
                };
                return instructions;
            }
            case CspE2eGroupControlType.GROUP_NAME: {
                const instructions: GroupControlMessageInstructions = {
                    messageCategory: 'group-control',
                    task: new ReflectedGroupNameTask(
                        this._services,
                        messageId,
                        senderIdentity,
                        validatedBody.container,
                        validatedBody.message,
                    ),
                };
                return instructions;
            }
            case CspE2eGroupControlType.GROUP_SET_PROFILE_PICTURE: {
                const instructions: GroupControlMessageInstructions = {
                    messageCategory: 'group-control',
                    task: new ReflectedGroupProfilePictureTask(
                        this._services,
                        messageId,
                        senderIdentity,
                        validatedBody.container,
                        validatedBody.message,
                    ),
                };
                return instructions;
            }
            case CspE2eGroupControlType.GROUP_DELETE_PROFILE_PICTURE: {
                const instructions: GroupControlMessageInstructions = {
                    messageCategory: 'group-control',
                    task: new ReflectedGroupProfilePictureTask(
                        this._services,
                        messageId,
                        senderIdentity,
                        validatedBody.container,
                        undefined,
                    ),
                };
                return instructions;
            }
            case CspE2eGroupControlType.GROUP_LEAVE: {
                const instructions: GroupControlMessageInstructions = {
                    messageCategory: 'group-control',
                    task: new ReflectedIncomingGroupLeaveTask(
                        this._services,
                        messageId,
                        senderContact,
                        validatedBody.container,
                    ),
                };
                return instructions;
            }
            case CspE2eGroupControlType.GROUP_SYNC_REQUEST:
                // Ignore, must be processed by leader only
                return 'discard';

            // Status messages
            case CspE2eStatusUpdateType.DELIVERY_RECEIPT: {
                // Since this is a reflected incoming delivery receipt, we expect that it's a
                // reaction to an outbound message.
                const expectedMessageDirection = MessageDirection.OUTBOUND;
                const instructions: StatusUpdateInstructions = {
                    messageCategory: 'status-update',
                    task: new ReflectedDeliveryReceiptTask(
                        this._services,
                        messageId,
                        {type: ReceiverType.CONTACT, identity: senderIdentity},
                        validatedBody.message,
                        createdAt,
                        expectedMessageDirection,
                    ),
                };
                return instructions;
            }

            default:
                return unreachable(validatedBody);
        }
    }

    /**
     * Return the common inbound message init fragment.
     */
    private _getCommonMessageInitFragment(
        createdAt: Date,
        reflectedAt: Date,
    ): CommonInboundMessageInitFragment {
        return {
            createdAt,
            receivedAt: reflectedAt,
            raw: this._unvalidatedMessage.body,
        };
    }
}

function getTextMessageInitFragment(
    message: structbuf.validate.csp.e2e.Text.Type,
    commonFragment: CommonInboundMessageInitFragment,
    log: Logger,
    messageId: MessageId,
): InboundTextMessageInitFragment {
    const possibleQuote = parsePossibleTextQuote(message.text, log, messageId);
    const text = possibleQuote?.comment ?? message.text;

    return {
        ...commonFragment,
        type: 'text',
        text,
        quotedMessageId: possibleQuote?.quotedMessageId,
    };
}

function getFileMessageInitFragment(
    message: structbuf.validate.csp.e2e.File.Type,
    commonFragment: CommonInboundMessageInitFragment,
    log: Logger,
):
    | InboundFileMessageInitFragment
    | InboundImageMessageInitFragment
    | InboundVideoMessageInitFragment
    | InboundAudioMessageInitFragment {
    const fileData = message.file;

    return {
        ...commonFragment,
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
    message: structbuf.validate.csp.e2e.Location.Type,
    commonFragment: CommonInboundMessageInitFragment,
): InboundTextMessageInitFragment {
    return {
        ...commonFragment,
        type: 'text',
        text: getTextForLocation(message.location),
    };
}
